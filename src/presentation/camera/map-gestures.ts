import type { Vector3 } from 'three';

type PointerSample = { x: number; y: number; touch: boolean };
type TouchPair = { first: PointerSample; second: PointerSample };
const orbitRadiansPerPixel = .006;
const touchGestureThreshold = 4;

export interface MapGestureActions {
    beginOrbit: (clientX: number, clientY: number) => Vector3 | undefined;
    rotate: (pivot: Vector3, yawRadians: number, pitchRadians: number) => boolean;
    beginDrag: () => void;
    pan: (deltaX: number, deltaY: number) => void;
    zoom: (factor: number, pivot?: Vector3) => void;
    select: (clientX: number, clientY: number) => void;
    invalidate: () => void;
}

/** Own pointer tracking and gesture recognition without station data or scene construction. */
export class MapGestures {
    private readonly canvas: HTMLCanvasElement;
    private readonly actions: MapGestureActions;
    private readonly lifetime = new AbortController();
    private readonly pointers = new Map<number, PointerSample>();
    private down: { x: number; y: number } | null = null;
    private dragged = false;
    private moving = false;
    private orbit?: { pointer: number; pivot: Vector3 };
    private touchPivot?: Vector3;
    private touchBaseline?: TouchPair;
    private touchMode?: 'pitch' | 'yaw' | 'zoom';
    private waitingForSecondTouch = false;

    /** Bind one canvas and retain removable listeners for the lifetime of the map. */
    constructor(canvas: HTMLCanvasElement, actions: MapGestureActions) {
        this.canvas = canvas;
        this.actions = actions;
        const signal = this.lifetime.signal;
        canvas.addEventListener('pointerdown', event => this.pointerDown(event), { signal });
        canvas.addEventListener('pointermove', event => this.pointerMove(event), { signal });
        canvas.addEventListener('pointerup', event => this.pointerUp(event), { signal });
        canvas.addEventListener('pointercancel', event => {
            this.cancelOrbit();
            this.pointers.delete(event.pointerId);
            this.dragged = true;
            this.down = null;
            this.finishMovement();
        }, { signal });
        canvas.addEventListener('lostpointercapture', event => {
            if (this.pointers.delete(event.pointerId)) {
                this.resetTouchGesture();
                this.dragged = true;
            }
            if (this.orbit?.pointer === event.pointerId) {
                this.cancelOrbit();
            }
            if (!this.pointers.size) {
                this.down = null;
            }
            this.finishMovement();
        }, { signal });
        canvas.addEventListener('auxclick', event => {
            if (event.button === 1) {
                event.preventDefault();
            }
        }, { signal });
        canvas.addEventListener('wheel', event => {
            event.preventDefault();
            actions.zoom(Math.exp(-event.deltaY * 0.001));
        }, { passive: false, signal });
    }

    /** Report actual pointer movement so distant views can defer label placement until release. */
    get isMoving(): boolean {
        return this.moving;
    }

    /** Forget an active orbit after selecting a facility or resetting the view. */
    cancelOrbit(): void {
        this.orbit = undefined;
        this.resetTouchGesture();
    }

    /** Detach all canvas listeners and release transient pointer state. */
    dispose(): void {
        this.lifetime.abort();
        this.pointers.clear();
        this.down = null;
        this.cancelOrbit();
    }

    /** Freeze an optional orbit pivot, then capture the pointer for click, drag or pinch tracking. */
    private pointerDown(event: PointerEvent): void {
        if (event.button === 1) {
            const pivot = this.actions.beginOrbit(event.clientX, event.clientY);
            if (pivot) {
                event.preventDefault();
                this.orbit = { pointer: event.pointerId, pivot: pivot.clone() };
            }
        }
        if (this.pointers.size === 0) {
            this.down = { x: event.clientX, y: event.clientY };
            this.dragged = event.button !== 0;
        } else {
            this.dragged = true;
        }
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, touch: event.pointerType === 'touch' });
        this.resetTouchGesture();
        this.canvas.setPointerCapture(event.pointerId);
    }

    /** Recognize mouse orbit, a two-touch transform, and single-pointer pan. */
    private pointerMove(event: PointerEvent): void {
        const old = this.pointers.get(event.pointerId);
        if (!old) {
            return;
        }
        this.actions.beginDrag();
        if (this.down && Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y) > 5) {
            this.dragged = true;
        }
        const deltaX = event.clientX - old.x;
        const deltaY = event.clientY - old.y;
        this.moving ||= deltaX !== 0 || deltaY !== 0;
        this.touchBaseline ??= this.currentTouchPair();
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, touch: old.touch });
        if (this.orbit?.pointer === event.pointerId && (event.buttons & 4) && this.actions.rotate(
            this.orbit.pivot, deltaX * orbitRadiansPerPixel, deltaY * orbitRadiansPerPixel
        )) {
            this.dragged = true;
        } else if (this.pointers.size === 1) {
            this.actions.pan(deltaX, deltaY);
        }
        this.actions.invalidate();
    }

    /** Classify paired samples together, then apply only the locked action until the pair changes. */
    applyTouchGesture(finishing = false): void {
        const baseline = this.touchBaseline;
        const pair = this.currentTouchPair();
        if (!baseline || !pair || (baseline.first === pair.first && baseline.second === pair.second)) {
            return;
        }
        const firstX = pair.first.x - baseline.first.x;
        const firstY = pair.first.y - baseline.first.y;
        const secondX = pair.second.x - baseline.second.x;
        const secondY = pair.second.y - baseline.second.y;
        const midpointY = (firstY + secondY) / 2;
        const beforeX = baseline.first.x - baseline.second.x;
        const beforeY = baseline.first.y - baseline.second.y;
        const afterX = pair.first.x - pair.second.x;
        const afterY = pair.first.y - pair.second.y;
        const previous = Math.hypot(beforeX, beforeY);
        const current = Math.hypot(afterX, afterY);
        if (Math.min(previous, current) < touchGestureThreshold) {
            this.touchBaseline = pair;
            return;
        }
        // Cross and dot products wrap the twist cleanly as the fingers pass ±π.
        const twist = Math.atan2(beforeX * afterY - beforeY * afterX, beforeX * afterX + beforeY * afterY);
        if (!this.touchMode) {
            const vertical = Math.abs(midpointY);
            const horizontal = Math.abs(firstX + secondX) / 2;
            const separationChange = Math.hypot(firstX - secondX, firstY - secondY) / 2;
            // Compare pinch and twist as distances travelled by one finger around the midpoint.
            const pinchDistance = Math.abs(current - previous) / 2;
            const twistDistance = Math.abs(twist) * (previous + current) / 4;
            if (vertical >= touchGestureThreshold && vertical > Math.max(horizontal, separationChange * 1.5)) {
                this.touchMode = 'pitch';
            } else if (Math.max(pinchDistance, twistDistance) >= touchGestureThreshold) {
                // A second pointer event can arrive in the next frame of a parallel vertical drag.
                if (vertical > horizontal * 1.5 && (firstY === 0 || secondY === 0) && !finishing && !this.waitingForSecondTouch) {
                    this.waitingForSecondTouch = true;
                    this.actions.invalidate();
                    return;
                }
                this.touchMode = twistDistance > pinchDistance ? 'yaw' : 'zoom';
            } else {
                return;
            }
        }
        this.touchPivot ??= this.actions.beginOrbit(
            (baseline.first.x + baseline.second.x) / 2,
            (baseline.first.y + baseline.second.y) / 2
        )?.clone();
        this.touchBaseline = pair;
        if (this.touchMode === 'pitch') {
            if (this.touchPivot && midpointY !== 0) {
                this.actions.rotate(this.touchPivot, 0, midpointY * orbitRadiansPerPixel);
            }
        } else if (this.touchMode === 'yaw') {
            if (this.touchPivot && Math.abs(twist) > 1e-6) {
                this.actions.rotate(this.touchPivot, -twist, 0);
            }
        } else {
            const scale = current / previous;
            if (Math.abs(scale - 1) > 1e-6) {
                this.actions.zoom(scale, this.touchPivot);
            }
        }
    }

    /** Keep a stable finger order regardless of which pointer sent the latest event. */
    private currentTouchPair(): TouchPair | undefined {
        if (this.pointers.size !== 2) {
            return undefined;
        }
        const [first, second] = this.pointers.values();
        if (first?.touch && second?.touch) {
            return { first, second };
        }
        return undefined;
    }

    /** Reclassify from fresh samples whenever the active fingers change. */
    private resetTouchGesture(): void {
        this.touchBaseline = undefined;
        this.touchPivot = undefined;
        this.touchMode = undefined;
        this.waitingForSecondTouch = false;
    }

    /** Select only a primary click that has not become a drag, pinch or orbit. */
    private pointerUp(event: PointerEvent): void {
        this.applyTouchGesture(true);
        if (this.orbit?.pointer === event.pointerId) {
            this.cancelOrbit();
        }
        this.pointers.delete(event.pointerId);
        this.resetTouchGesture();
        if (event.button === 0 && !this.dragged && this.down) {
            this.actions.select(event.clientX, event.clientY);
        }
        if (!this.pointers.size) {
            this.down = null;
        }
        this.finishMovement();
    }

    /** Restore labels on the next frame when the last drag or pinch pointer leaves. */
    private finishMovement(): void {
        if (!this.pointers.size && this.moving) {
            this.moving = false;
            this.actions.invalidate();
        }
    }
}
