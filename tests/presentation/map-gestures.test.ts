import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Vector3 } from 'three';
import { MapGestures, type MapGestureActions } from '../../src/presentation/camera/map-gestures.ts';
import { clampCameraZoom } from '../../src/presentation/camera/camera-framing.ts';

class CanvasStub extends EventTarget {
    captures: number[] = [];
    attributes = new Set<string>();

    setPointerCapture(id: number): void {
        this.captures.push(id);
    }

    setAttribute(name: string): void {
        this.attributes.add(name);
    }

    removeAttribute(name: string): void {
        this.attributes.delete(name);
    }

    toggleAttribute(name: string, enabled: boolean): void {
        if (enabled) {
            this.setAttribute(name);
        }
        else {
            this.removeAttribute(name);
        }
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
        hover: () => {},
        invalidate: () => {},
        ...overrides
    };
    const gestures = new MapGestures(canvas as unknown as HTMLCanvasElement, actions);
    return { canvas, gestures, pivot, pans, zooms, selections, rotations };
}

test('middle-button orbit freezes the viewport pivot without picking the cursor point', () => {
    let redraws = 0;
    const pivot = new Vector3(1, 2, 3);
    const fixture = setup({
        beginOrbit: touchMidpoint => {
            assert.equal(touchMidpoint, undefined);
            return pivot;
        },
        invalidate: () => {
            redraws++;
        }
    });
    const { canvas, gestures, pans, zooms, selections, rotations } = fixture;
    try {
        const down = dispatch(canvas, 'pointerdown', { button: 1, buttons: 4, clientX: 10, clientY: 20 });
        assert(!gestures.isMoving);
        assert(!gestures.isRotating);
        assert(canvas.attributes.has('data-orbiting'));
        pivot.set(99, 99, 99);
        dispatch(canvas, 'pointermove', { buttons: 4, clientX: 22, clientY: 27 });
        assert(gestures.isMoving);
        assert(gestures.isRotating);
        dispatch(canvas, 'pointerup', { button: 1, buttons: 0, clientX: 22, clientY: 27 });
        assert(!gestures.isMoving);
        assert(!gestures.isRotating);
        assert.equal(canvas.attributes.size, 0);
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
        assert(gestures.isMoving);
        assert(!gestures.isRotating);
        assert(canvas.attributes.has('data-dragging'));
        dispatch(canvas, 'pointerup', { clientX: 25, clientY: 14 });
        assert(!gestures.isMoving);
        assert(!canvas.attributes.has('data-dragging'));
        dispatch(canvas, 'pointerdown', { pointerId: 2 });
        dispatch(canvas, 'lostpointercapture', { pointerId: 2 });
        dispatch(canvas, 'pointermove', { pointerId: 2, clientX: 100 });
        assert.deepEqual(selections, [[5, 7]]);
        assert.deepEqual(pans, [[20, 7]]);
    } finally {
        gestures.dispose();
    }
});

test('idle mouse hover probes selectable map targets and pauses during active gestures', () => {
    const points: ({ x: number; y: number } | undefined)[] = [];
    const { canvas, gestures } = setup({ hover: point => points.push(point) });
    try {
        dispatch(canvas, 'pointermove', { buttons: 0, clientX: 10 });
        dispatch(canvas, 'pointerdown', { clientX: 10 });
        dispatch(canvas, 'pointermove', { clientX: 20 });
        dispatch(canvas, 'pointermove', { pointerId: 2, buttons: 0, clientX: 30 });
        dispatch(canvas, 'pointerup', { buttons: 0, clientX: 20 });
        dispatch(canvas, 'pointermove', { pointerType: 'touch', buttons: 0, clientX: 30 });
        dispatch(canvas, 'pointerleave', {});
        assert.deepEqual(points, [{ x: 10, y: 0 }, undefined, { x: 20, y: 0 }, undefined]);
        dispatch(canvas, 'pointerdown', { button: 1, buttons: 4 });
        dispatch(canvas, 'pointermove', { buttons: 4, clientX: 50 });
        dispatch(canvas, 'lostpointercapture', {});
        assert.equal(canvas.attributes.size, 0);
        assert(!gestures.isMoving);
    } finally {
        gestures.dispose();
    }
});

test('pinch and wheel zoom retain their scale factors, cancellation and disposal suppress selection and input', () => {
    const { canvas, gestures, zooms, selections, rotations } = setup();
    dispatch(canvas, 'pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 0 });
    dispatch(canvas, 'pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 10 });
    dispatch(canvas, 'pointermove', { pointerId: 1, clientX: -10 });
    gestures.applyTouchGesture();
    assert(!gestures.isRotating);
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

test('twist and pinch ignore competing motion until a finger is lifted', () => {
    const starts: number[][] = [];
    const zoomPivots: number[][] = [];
    const pivot = new Vector3(4, 5, 6);
    let redraws = 0;
    const { canvas, gestures, rotations, pans, selections } = setup({
        beginOrbit: midpoint => {
            assert(midpoint);
            starts.push([midpoint.x, midpoint.y]);
            return pivot;
        },
        zoom: (factor, anchor) => {
            zoomPivots.push([factor, ...anchor!.toArray()]);
        },
        invalidate: () => {
            redraws++;
        }
    });
    try {
        dispatch(canvas, 'pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 10 });
        dispatch(canvas, 'pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 30 });
        dispatch(canvas, 'pointermove', { pointerId: 2, clientX: 31, clientY: 1 });
        gestures.applyTouchGesture();
        assert(!gestures.isRotating);
        assert.deepEqual(starts, []);
        dispatch(canvas, 'pointermove', { pointerId: 2, clientX: 10, clientY: 22 });
        gestures.applyTouchGesture();
        assert(gestures.isRotating);
        assert.deepEqual(rotations, [[4, 5, 6, -Math.PI / 2, 0]]);
        assert.equal(zoomPivots.length, 0);
        pivot.set(7, 8, 9);
        dispatch(canvas, 'pointermove', { pointerId: 2, clientX: 6, clientY: 44 });
        gestures.applyTouchGesture();
        assert.deepEqual(rotations[1]!.slice(0, 3), [4, 5, 6]);
        assert(Math.abs(rotations[1]![3]! + Math.atan2(4, 44)) < 1e-9);
        assert.equal(rotations[1]![4], 0);
        assert.equal(zoomPivots.length, 0);
        assert.deepEqual(starts, [[20, 0]]);
        const beforeRelease = redraws;
        dispatch(canvas, 'pointerup', { pointerId: 2, clientX: 6, clientY: 44 });
        assert(!gestures.isRotating);
        assert(!gestures.isMoving);
        assert.equal(redraws, beforeRelease + 1);

        dispatch(canvas, 'pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 30 });
        dispatch(canvas, 'pointermove', { pointerId: 2, clientX: 50, clientY: 4 });
        gestures.applyTouchGesture();
        assert(!gestures.isRotating);
        assert.deepEqual(zoomPivots, [[Math.hypot(40, 4) / 20, 7, 8, 9]]);
        dispatch(canvas, 'pointermove', { pointerId: 2, clientX: 4, clientY: 60 });
        gestures.applyTouchGesture();
        assert(Math.abs(zoomPivots[1]![0]! - 1.5) < 1e-9);
        assert.deepEqual(zoomPivots[1]!.slice(1), [7, 8, 9]);
        assert.equal(rotations.length, 2);
        assert.deepEqual(starts, [[20, 0], [20, 0]]);
        dispatch(canvas, 'pointerup', { pointerId: 2, clientX: 4, clientY: 60 });
        dispatch(canvas, 'pointermove', { pointerId: 1, clientX: 14, clientY: 3 });
        dispatch(canvas, 'pointerup', { pointerId: 1, clientX: 14, clientY: 3 });
        assert.deepEqual(pans, [[4, 3]]);
        assert.deepEqual(selections, []);
        assert(!gestures.isMoving);
    } finally {
        gestures.dispose();
    }
});

test('pinching out and back can restore a shared scale wider than the current viewport fit', () => {
    const startingZoom = 0.75;
    const minimumZoom = 1;
    let zoom = startingZoom;
    const { canvas, gestures } = setup({
        zoom: factor => {
            zoom = clampCameraZoom(zoom * factor, minimumZoom, startingZoom);
        }
    });
    try {
        dispatch(canvas, 'pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 20 });
        dispatch(canvas, 'pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 60 });
        dispatch(canvas, 'pointermove', { pointerId: 1, clientX: 0 });
        dispatch(canvas, 'pointermove', { pointerId: 2, clientX: 80 });
        gestures.applyTouchGesture();
        assert.equal(zoom, 1.5);
        dispatch(canvas, 'pointerup', { pointerId: 1, clientX: 0 });
        dispatch(canvas, 'pointerup', { pointerId: 2, clientX: 80 });

        dispatch(canvas, 'pointerdown', { pointerId: 3, pointerType: 'touch', clientX: 0 });
        dispatch(canvas, 'pointerdown', { pointerId: 4, pointerType: 'touch', clientX: 80 });
        dispatch(canvas, 'pointermove', { pointerId: 3, clientX: 20 });
        dispatch(canvas, 'pointermove', { pointerId: 4, clientX: 60 });
        gestures.applyTouchGesture();
        assert.equal(zoom, startingZoom);
    } finally {
        gestures.dispose();
    }
});

test('parallel two-finger movement changes pitch in both directions without zoom or yaw', () => {
    const starts: number[][] = [];
    const { canvas, gestures, rotations, zooms, pans, selections } = setup({
        beginOrbit: midpoint => {
            assert(midpoint);
            starts.push([midpoint.x, midpoint.y]);
            return new Vector3(1, 2, 3);
        }
    });
    try {
        dispatch(canvas, 'pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 10, clientY: 40 });
        dispatch(canvas, 'pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 30, clientY: 40 });
        dispatch(canvas, 'pointermove', { pointerId: 1, clientX: 10, clientY: 52 });
        gestures.applyTouchGesture();
        assert.deepEqual(rotations, []);
        assert.deepEqual(zooms, []);
        dispatch(canvas, 'pointermove', { pointerId: 2, clientX: 30, clientY: 52 });
        gestures.applyTouchGesture();
        assert(gestures.isRotating);
        dispatch(canvas, 'pointermove', { pointerId: 2, clientX: 31, clientY: 40 });
        dispatch(canvas, 'pointermove', { pointerId: 1, clientX: 10, clientY: 38 });
        gestures.applyTouchGesture();
        dispatch(canvas, 'pointerup', { pointerId: 2, clientX: 31, clientY: 40 });
        dispatch(canvas, 'pointerup', { pointerId: 1, clientX: 10, clientY: 38 });
        assert(!gestures.isRotating);
        assert.deepEqual(starts, [[20, 40]]);
        assert.deepEqual(rotations, [[1, 2, 3, 0, 12 * .006], [1, 2, 3, 0, -13 * .006]]);
        assert.deepEqual(zooms, []);
        assert.deepEqual(pans, []);
        assert.deepEqual(selections, []);
        assert(!gestures.isMoving);
    } finally {
        gestures.dispose();
    }
});
