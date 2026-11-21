import type { Vector3 } from 'three';

type PointerPosition = { x: number; y: number };
type PointerSample = PointerPosition & { touch: boolean };
type TouchPair = { first: PointerSample; second: PointerSample };
export type OrbitAnchor = PointerPosition | 'canvas-center';
const orbitRadiansPerPixel = .006;
const touchGestureThreshold = 4;
const wheelIdleMs = 140;

export interface MapGestureActions {
    beginOrbit: (anchor: OrbitAnchor) => Vector3 | undefined;
    rotate: (pivot: Vector3, yawRadians: number, pitchRadians: number) => boolean;
    beginDrag: () => void;
    pan: (deltaX: number, deltaY: number) => void;
    zoom: (factor: number, pivot?: Vector3) => void;
    adjustSpacing: (delta?: number) => void;
    select: (clientX: number, clientY: number) => void;
    hover: (point?: PointerPosition) => void;
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
    private wheelPivot?: Vector3;
    private wheelSpacing = false;
    private wheelZooming = false;
    private wheelTimer?: ReturnType<typeof setTimeout>;
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
        canvas.addEventListener('pointerleave', () => actions.hover(), { signal });
        canvas.addEventListener('pointerup', event => this.pointerUp(event), { signal });
        canvas.addEventListener('pointercancel', event => {
            const wasRotating = this.isRotating;
            this.cancelOrbit();
            this.pointers.delete(event.pointerId);
            this.dragged = true;
            this.down = null;
            this.finishMovement(wasRotating);
        }, { signal });
        canvas.addEventListener('lostpointercapture', event => {
            const wasRotating = this.isRotating;
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
            this.finishMovement(wasRotating);
        }, { signal });
        canvas.addEventListener('auxclick', event => {
            if (event.button === 1) {
                event.preventDefault();
            }
        }, { signal });
        canvas.addEventListener('wheel', event => this.wheel(event), { passive: false, signal });
    }

    /** Keep labels and URL writes paused during pointer movement and wheel gestures. */
    get isMoving(): boolean {
        return this.moving || this.wheelPivot !== undefined || this.wheelSpacing || this.wheelZooming;
    }

    /** Report an active orbit through the end of its pointer or wheel sequence. */
    get isRotating(): boolean {
        return Boolean(this.wheelPivot || this.orbit && this.moving || this.touchPivot && (this.touchMode === 'yaw' || this.touchMode === 'pitch'));
    }

    /** Forget an active orbit after selecting a facility or resetting the view. */
    cancelOrbit(): void {
        if (this.orbit) {
            this.canvas.removeAttribute('data-orbiting');
        }
        this.orbit = undefined;
        this.endWheelGesture();
        this.resetTouchGesture();
    }

    /** Detach all canvas listeners and release transient pointer state. */
    dispose(): void {
        this.lifetime.abort();
        this.pointers.clear();
        this.down = null;
        this.cancelOrbit();
        this.setMoving(false);
    }

    /** Dispatch modified wheel gestures and preserve ordinary wheel and pinch zoom. */
    private wheel(event: WheelEvent): void {
        event.preventDefault();
        if ((event.altKey || event.shiftKey) && !event.ctrlKey && !this.pointers.size) {
            const mode = event.deltaMode;
            let dx = event.deltaX;
            let dy = event.deltaY;
            if (!dx && !dy) {
                return;
            }
            if (mode === 1) {
                dx *= 16;
                dy *= 16;
            }
            else if (mode === 2) {
                dx *= this.canvas.clientWidth;
                dy *= this.canvas.clientHeight;
            }
            if (this.wheelZooming) {
                this.endWheelGesture();
            }
            if (event.altKey) {
                this.orbitWithWheel(dx, dy);
            }
            else {
                if (this.wheelPivot) {
                    this.endWheelGesture();
                }
                this.wheelSpacing = true;
                this.actions.hover();
                // Some environments move the vertical wheel delta onto the horizontal axis with Shift held.
                this.actions.adjustSpacing(-(dy || dx));
            }
            this.scheduleWheelEnd();
            this.actions.invalidate();
            return;
        }
        if (!event.deltaY) {
            return;
        }
        if (!this.wheelZooming) {
            this.endWheelGesture();
            this.wheelZooming = true;
            this.actions.hover();
        }
        this.actions.zoom(Math.exp(-event.deltaY * 0.001));
        this.scheduleWheelEnd();
    }

    /** Freeze a canvas-centred pivot for an Alt-wheel sequence. */
    private orbitWithWheel(dx: number, dy: number): void {
        if (this.wheelSpacing) {
            this.endWheelGesture();
        }
        if (!this.wheelPivot) {
            this.wheelPivot = this.actions.beginOrbit('canvas-center')?.clone();
            if (!this.wheelPivot) {
                return;
            }
            this.canvas.setAttribute('data-orbiting', '');
            this.actions.hover();
        }
        this.actions.rotate(this.wheelPivot, -dx * orbitRadiansPerPixel, -dy * orbitRadiansPerPixel);
    }

    /** Wait for a quiet interval after the most recent wheel event. */
    private scheduleWheelEnd(): void {
        clearTimeout(this.wheelTimer);
        this.wheelTimer = setTimeout(() => this.endWheelGesture(), wheelIdleMs);
    }

    /** Release a wheel gesture and request the settled frame that restores the labels. */
    private endWheelGesture(): void {
        const wasActive = this.wheelZooming || this.wheelSpacing || this.wheelPivot !== undefined;
        clearTimeout(this.wheelTimer);
        this.wheelTimer = undefined;
        this.wheelZooming = false;
        if (this.wheelPivot) {
            this.wheelPivot = undefined;
            this.canvas.removeAttribute('data-orbiting');
        }
        if (this.wheelSpacing) {
            this.wheelSpacing = false;
            this.actions.adjustSpacing();
        }
        if (wasActive) {
            this.actions.invalidate();
        }
    }

    /** Freeze an optional orbit pivot, then capture the pointer for click, drag or pinch tracking. */
    private pointerDown(event: PointerEvent): void {
        const wasRotating = this.isRotating;
        this.endWheelGesture();
        this.actions.hover();
        if (event.button === 1) {
            const pivot = this.actions.beginOrbit('canvas-center');
            if (pivot) {
                event.preventDefault();
                this.orbit = { pointer: event.pointerId, pivot: pivot.clone() };
                this.canvas.setAttribute('data-orbiting', '');
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
        this.finishMovement(wasRotating);
    }

    /** Recognize mouse orbit, a two-touch transform, and single-pointer pan. */
    private pointerMove(event: PointerEvent): void {
        const old = this.pointers.get(event.pointerId);
        if (!old) {
            if (!this.pointers.size && !this.isMoving && event.pointerType !== 'touch' && !event.buttons) {
                this.actions.hover({ x: event.clientX, y: event.clientY });
            }
            return;
        }
        this.actions.beginDrag();
        if (this.down && Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y) > 5) {
            this.dragged = true;
        }
        const deltaX = event.clientX - old.x;
        const deltaY = event.clientY - old.y;
        if (deltaX !== 0 || deltaY !== 0) {
            this.setMoving(true);
        }
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
        const anchor: OrbitAnchor = this.touchMode === 'zoom' ? {
            x: (baseline.first.x + baseline.second.x) / 2,
            y: (baseline.first.y + baseline.second.y) / 2
        } : 'canvas-center';
        this.touchPivot ??= this.actions.beginOrbit(anchor)?.clone();
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
        const wasRotating = this.isRotating;
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
        this.finishMovement(wasRotating);
        if (!this.pointers.size && event.pointerType !== 'touch' && !event.buttons) {
            this.actions.hover({ x: event.clientX, y: event.clientY });
        }
    }

    /** Keep the dragging cursor tied to the same movement state as the overlay. */
    private setMoving(moving: boolean): void {
        if (this.moving !== moving) {
            this.moving = moving;
            this.canvas.toggleAttribute('data-dragging', moving);
        }
    }

    /** Schedule a settled frame when rotation ends or the last moving pointer leaves. */
    private finishMovement(wasRotating: boolean): void {
        if ((!this.pointers.size && this.moving) || (wasRotating && !this.isRotating)) {
            this.setMoving(false);
            this.actions.invalidate();
        }
    }
}
