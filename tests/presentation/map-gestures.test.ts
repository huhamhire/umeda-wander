import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Vector3 } from 'three';
import { MapGestures, type MapGestureActions } from '../../src/presentation/camera/map-gestures.ts';

class CanvasStub extends EventTarget {
    captures: number[] = [];

    setPointerCapture(id: number): void {
        this.captures.push(id);
    }
}

function dispatch(canvas: CanvasStub, type: string, values: Record<string, number | string>): Event {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: 1, button: 0, buttons: 1, clientX: 0, clientY: 0 }, values);
    canvas.dispatchEvent(event);
    return event;
}

function setup(overrides: Partial<MapGestureActions> = {}) {
    const canvas = new CanvasStub();
    const pans: number[][] = [];
    const zooms: number[] = [];
    const selections: number[][] = [];
    const rotations: number[][] = [];
    const pivot = new Vector3(1, 2, 3);
    const actions: MapGestureActions = {
        beginOrbit: () => pivot,
        rotate: (anchor, dx, dy) => {
            rotations.push([...anchor.toArray(), dx, dy]);
            return true;
        },
        beginDrag: () => {},
        pan: (dx, dy) => {
            pans.push([dx, dy]);
        },
        zoom: factor => {
            zooms.push(factor);
        },
        select: (x, y) => {
            selections.push([x, y]);
        },
        invalidate: () => {},
        ...overrides
    };
    const gestures = new MapGestures(canvas as unknown as HTMLCanvasElement, actions);
    return { canvas, gestures, pivot, pans, zooms, selections, rotations };
}

test('middle-button orbit freezes its pivot and never invokes pan, zoom or facility selection', () => {
    let redraws = 0;
    const fixture = setup({
        invalidate: () => {
            redraws++;
        }
    });
    const { canvas, gestures, pivot, pans, zooms, selections, rotations } = fixture;
    try {
        const down = dispatch(canvas, 'pointerdown', { button: 1, buttons: 4, clientX: 10, clientY: 20 });
        assert(!gestures.isMoving);
        pivot.set(99, 99, 99);
        dispatch(canvas, 'pointermove', { buttons: 4, clientX: 22, clientY: 27 });
        assert(gestures.isMoving);
        dispatch(canvas, 'pointerup', { button: 1, buttons: 0, clientX: 22, clientY: 27 });
        assert(!gestures.isMoving);
        assert.equal(redraws, 2);
        assert(down.defaultPrevented);
        assert.deepEqual(rotations, [[1, 2, 3, 12 * .006, 7 * .006]]);
        assert.deepEqual(pans, []);
        assert.deepEqual(zooms, []);
        assert.deepEqual(selections, []);
        assert.deepEqual(canvas.captures, [1]);
    } finally {
        gestures.dispose();
    }
});

test('primary clicks select while drags and lost captures cannot trigger a stale selection', () => {
    const { canvas, gestures, pans, selections } = setup();
    try {
        dispatch(canvas, 'pointerdown', { clientX: 5, clientY: 7 });
        dispatch(canvas, 'pointerup', { clientX: 5, clientY: 7 });
        dispatch(canvas, 'pointerdown', { clientX: 5, clientY: 7 });
        dispatch(canvas, 'pointermove', { clientX: 25, clientY: 14 });
        dispatch(canvas, 'pointerup', { clientX: 25, clientY: 14 });
        dispatch(canvas, 'pointerdown', { pointerId: 2 });
        dispatch(canvas, 'lostpointercapture', { pointerId: 2 });
        dispatch(canvas, 'pointermove', { pointerId: 2, clientX: 100 });
        assert.deepEqual(selections, [[5, 7]]);
        assert.deepEqual(pans, [[20, 7]]);
    } finally {
        gestures.dispose();
    }
});

test('pinch and wheel zoom retain their scale factors, cancellation and disposal suppress selection and input', () => {
    const { canvas, gestures, zooms, selections, rotations } = setup();
    dispatch(canvas, 'pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 0 });
    dispatch(canvas, 'pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 10 });
    dispatch(canvas, 'pointermove', { pointerId: 1, clientX: -10 });
    dispatch(canvas, 'pointercancel', { pointerId: 1 });
    assert(gestures.isMoving);
    dispatch(canvas, 'pointerup', { pointerId: 2, clientX: 10 });
    assert(!gestures.isMoving);
    const wheel = dispatch(canvas, 'wheel', { deltaY: 100 });
    assert(wheel.defaultPrevented);
    assert.deepEqual(zooms, [2, Math.exp(-0.1)]);
    assert.deepEqual(rotations, []);
    assert.deepEqual(selections, []);
    gestures.dispose();
    gestures.dispose();
    dispatch(canvas, 'wheel', { deltaY: -100 });
    dispatch(canvas, 'pointerdown', {});
    dispatch(canvas, 'pointerup', {});
    assert.equal(zooms.length, 2);
    assert.deepEqual(selections, []);
});

test('two-finger twist orbits its starting midpoint, with separate distance-based zoom', () => {
    const starts: number[][] = [];
    const zoomPivots: number[][] = [];
    const pivot = new Vector3(4, 5, 6);
    const { canvas, gestures, rotations, pans, selections } = setup({
        beginOrbit: (x, y) => {
            starts.push([x, y]);
            return pivot;
        },
        zoom: (factor, anchor) => {
            zoomPivots.push([factor, ...anchor!.toArray()]);
        }
    });
    try {
        dispatch(canvas, 'pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 10 });
        dispatch(canvas, 'pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 30 });
        dispatch(canvas, 'pointermove', { pointerId: 2, clientX: 10, clientY: 20 });
        assert.deepEqual(rotations, [[4, 5, 6, -Math.PI / 2, 0]]);
        assert.deepEqual(zoomPivots, []);
        pivot.set(0, 0, 0);
        dispatch(canvas, 'pointermove', { pointerId: 2, clientX: 10, clientY: 40 });
        assert.deepEqual(zoomPivots, [[2, 4, 5, 6]]);
        assert.deepEqual(starts, [[20, 0]]);
        dispatch(canvas, 'pointerup', { pointerId: 2, clientX: 10, clientY: 40 });
        dispatch(canvas, 'pointermove', { pointerId: 1, clientX: 14, clientY: 3 });
        dispatch(canvas, 'pointerup', { pointerId: 1, clientX: 14, clientY: 3 });
        assert.deepEqual(pans, [[4, 3]]);
        assert.deepEqual(selections, []);
        assert(!gestures.isMoving);
    } finally {
        gestures.dispose();
    }
});
