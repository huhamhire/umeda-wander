import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Vector3 } from 'three';
import { MapGestures, type MapGestureActions, type OrbitAnchor } from '../../src/presentation/camera/map-gestures.ts';
import { manualZoomSpan } from '../../src/presentation/camera/camera-framing.ts';

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

function dispatch(canvas: CanvasStub, type: string, values: Record<string, number | string | boolean>): Event {
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
        adjustSpacing: () => {},
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

test('Alt trackpad scroll uses one centre pivot until settling and Ctrl pinch still zooms', t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const pivot = new Vector3(1, 2, 3);
    let starts = 0;
    let redraws = 0;
    const { canvas, gestures, rotations, zooms } = setup({
        beginOrbit: midpoint => {
            assert.equal(midpoint, undefined);
            starts++;
            return pivot;
        },
        invalidate: () => {
            redraws++;
        }
    });
    try {
        const wheel = (dx: number, dy: number, ctrlKey = false) => dispatch(canvas, 'wheel', {
            deltaX: dx, deltaY: dy, deltaMode: 0, altKey: true, ctrlKey
        });
        assert(wheel(20, -10).defaultPrevented);
        assert(gestures.isMoving && gestures.isRotating);
        assert(canvas.attributes.has('data-orbiting'));
        t.mock.timers.tick(100);
        pivot.set(4, 5, 6);
        wheel(-5, 8);
        t.mock.timers.tick(100);
        assert(gestures.isMoving);
        assert.equal(starts, 1);
        assert.deepEqual(rotations, [[1, 2, 3, -20 * .006, 10 * .006], [1, 2, 3, 5 * .006, -8 * .006]]);
        assert.deepEqual(zooms, []);
        t.mock.timers.tick(100);
        assert(!gestures.isMoving && !gestures.isRotating);
        assert(!canvas.attributes.has('data-orbiting'));
        assert.equal(redraws, 3);

        wheel(5, 10);
        assert.equal(starts, 2);
        assert.deepEqual(rotations[2]!.slice(0, 3), [4, 5, 6]);
        wheel(0, -50, true);
        assert.deepEqual(zooms, [Math.exp(0.05)]);
        assert(gestures.isMoving && !gestures.isRotating);
        t.mock.timers.tick(140);
        assert(!gestures.isMoving);
    } finally {
        gestures.dispose();
    }
});

test('ordinary wheel zoom stays unsettled until scrolling pauses and suppresses hover picks', t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const hovers: unknown[] = [];
    const frames: boolean[] = [];
    const { canvas, gestures, zooms } = setup({
        hover: point => hovers.push(point),
        invalidate: () => frames.push(gestures.isMoving)
    });
    try {
        dispatch(canvas, 'wheel', { deltaY: -40 });
        assert(gestures.isMoving && !gestures.isRotating);
        t.mock.timers.tick(100);
        dispatch(canvas, 'wheel', { deltaY: 20 });
        dispatch(canvas, 'pointermove', { buttons: 0, clientX: 20 });
        t.mock.timers.tick(139);
        assert(gestures.isMoving);
        assert.deepEqual(hovers, [undefined]);
        assert.deepEqual(zooms, [Math.exp(.04), Math.exp(-.02)]);
        assert.deepEqual(frames, []);
        t.mock.timers.tick(1);
        assert(!gestures.isMoving);
        assert.deepEqual(frames, [false]);
        dispatch(canvas, 'pointermove', { buttons: 0, clientX: 20 });
        assert.deepEqual(hovers.at(-1), { x: 20, y: 0 });

        dispatch(canvas, 'wheel', { deltaY: -40 });
        dispatch(canvas, 'pointerdown', { clientX: 20 });
        assert(!gestures.isMoving);
        t.mock.timers.tick(140);
        assert.deepEqual(frames, [false, false]);
    } finally {
        gestures.dispose();
    }
});

test('Shift-wheel adjusts floor spacing in both axes and settles without zooming or orbiting', t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const deltas: (number | undefined)[] = [];
    const { canvas, gestures, zooms, rotations } = setup({ adjustSpacing: delta => deltas.push(delta) });
    try {
        const wheel = (dx: number, dy: number, ctrlKey = false) => dispatch(canvas, 'wheel', {
            deltaX: dx, deltaY: dy, deltaMode: 0, shiftKey: true, ctrlKey
        });
        assert(wheel(0, -40).defaultPrevented);
        wheel(25, 0);
        assert.deepEqual(deltas, [40, -25]);
        assert(gestures.isMoving);
        assert(!gestures.isRotating);
        assert.deepEqual(rotations, []);
        assert.deepEqual(zooms, []);
        t.mock.timers.tick(200);
        assert.deepEqual(deltas, [40, -25, undefined]);
        assert(!gestures.isMoving);
        wheel(0, -50, true);
        assert.deepEqual(zooms, [Math.exp(0.05)]);
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

test('twist uses the canvas centre and pinch uses the finger midpoint until a finger is lifted', () => {
    const starts: OrbitAnchor[] = [];
    const zoomPivots: number[][] = [];
    const pivot = new Vector3(4, 5, 6);
    let redraws = 0;
    const { canvas, gestures, rotations, pans, selections } = setup({
        beginOrbit: anchor => {
            assert(anchor);
            starts.push(anchor);
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
        assert.deepEqual(starts, ['canvas-center']);
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
        assert.deepEqual(starts, ['canvas-center', { x: 20, y: 0 }]);
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
    const startingSpan = 200;
    let span = startingSpan;
    const { canvas, gestures } = setup({
        zoom: factor => {
            span = manualZoomSpan(span, factor, startingSpan, 150, 1);
        }
    });
    try {
        dispatch(canvas, 'pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 20 });
        dispatch(canvas, 'pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 60 });
        dispatch(canvas, 'pointermove', { pointerId: 1, clientX: 0 });
        dispatch(canvas, 'pointermove', { pointerId: 2, clientX: 80 });
        gestures.applyTouchGesture();
        assert.equal(span, startingSpan / 2);
        dispatch(canvas, 'pointerup', { pointerId: 1, clientX: 0 });
        dispatch(canvas, 'pointerup', { pointerId: 2, clientX: 80 });

        dispatch(canvas, 'pointerdown', { pointerId: 3, pointerType: 'touch', clientX: 0 });
        dispatch(canvas, 'pointerdown', { pointerId: 4, pointerType: 'touch', clientX: 80 });
        dispatch(canvas, 'pointermove', { pointerId: 3, clientX: 20 });
        dispatch(canvas, 'pointermove', { pointerId: 4, clientX: 60 });
        gestures.applyTouchGesture();
        assert.equal(span, startingSpan);
    } finally {
        gestures.dispose();
    }
});

test('parallel two-finger movement pitches around the canvas centre without zoom or yaw', () => {
    const starts: OrbitAnchor[] = [];
    const { canvas, gestures, rotations, zooms, pans, selections } = setup({
        beginOrbit: anchor => {
            assert(anchor);
            starts.push(anchor);
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
        assert.deepEqual(starts, ['canvas-center']);
        assert.deepEqual(rotations, [[1, 2, 3, 0, 12 * .006], [1, 2, 3, 0, -13 * .006]]);
        assert.deepEqual(zooms, []);
        assert.deepEqual(pans, []);
        assert.deepEqual(selections, []);
        assert(!gestures.isMoving);
    } finally {
        gestures.dispose();
    }
});
