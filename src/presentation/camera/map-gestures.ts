import type { Vector3 } from 'three';

type PointerSample = { x: number; y: number; touch: boolean };
const mouseOrbitRadiansPerPixel = .006;

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
                this.touchPivot = undefined;
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
        this.touchPivot = undefined;
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
        this.touchPivot = undefined;
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
        const other = [...this.pointers].find(([id]) => id !== event.pointerId)?.[1];
        if (this.orbit?.pointer === event.pointerId && (event.buttons & 4) && this.actions.rotate(
            this.orbit.pivot, deltaX * mouseOrbitRadiansPerPixel, deltaY * mouseOrbitRadiansPerPixel
        )) {
            this.dragged = true;
        } else if (other && this.pointers.size === 2) {
            this.movePinch(old, other, event);
        } else if (!other) {
            this.actions.pan(deltaX, deltaY);
        }
        old.x = event.clientX;
        old.y = event.clientY;
        this.actions.invalidate();
    }

    /** Keep the original two-finger midpoint anchored while measuring angle and distance independently. */
    private movePinch(old: PointerSample, other: PointerSample, event: PointerEvent): void {
        const beforeX = old.x - other.x;
        const beforeY = old.y - other.y;
        const afterX = event.clientX - other.x;
        const afterY = event.clientY - other.y;
        const previous = Math.hypot(beforeX, beforeY);
        const current = Math.hypot(afterX, afterY);
        if (Math.min(previous, current) < 4) {
            return;
        }
        if (old.touch && other.touch) {
            this.touchPivot ??= this.actions.beginOrbit((old.x + other.x) / 2, (old.y + other.y) / 2)?.clone();
            // atan2 of the cross and dot products wraps cleanly when the fingers pass ±π.
            const twist = Math.atan2(beforeX * afterY - beforeY * afterX, beforeX * afterX + beforeY * afterY);
            if (this.touchPivot && Math.abs(twist) > 1e-6) {
                this.actions.rotate(this.touchPivot, -twist, 0);
            }
        }
        const scale = current / previous;
        if (Math.abs(scale - 1) > 1e-6) {
            this.actions.zoom(scale, this.touchPivot);
        }
    }

    /** Select only a primary click that has not become a drag, pinch or orbit. */
    private pointerUp(event: PointerEvent): void {
        if (this.orbit?.pointer === event.pointerId) {
            this.cancelOrbit();
        }
        this.pointers.delete(event.pointerId);
        this.touchPivot = undefined;
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
