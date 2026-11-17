import type { Vector3 } from 'three';

export interface MapGestureActions {
    beginOrbit: (clientX: number, clientY: number) => Vector3 | undefined;
    rotate: (pivot: Vector3, deltaX: number, deltaY: number) => boolean;
    beginDrag: () => void;
    pan: (deltaX: number, deltaY: number) => void;
    zoom: (factor: number) => void;
    select: (clientX: number, clientY: number) => void;
    invalidate: () => void;
}

/** Own pointer tracking and gesture recognition without station data or scene construction. */
export class MapGestures {
    private readonly canvas: HTMLCanvasElement;
    private readonly actions: MapGestureActions;
    private readonly lifetime = new AbortController();
    private readonly pointers = new Map<number, { x: number; y: number }>();
    private down: { x: number; y: number } | null = null;
    private dragged = false;
    private orbit?: { pointer: number; pivot: Vector3 };

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
        }, { signal });
        canvas.addEventListener('lostpointercapture', event => {
            this.pointers.delete(event.pointerId);
            if (this.orbit?.pointer === event.pointerId) {
                this.cancelOrbit();
            }
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

    /** Forget an active orbit after selecting a facility or resetting the view. */
    cancelOrbit(): void {
        this.orbit = undefined;
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
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        this.canvas.setPointerCapture(event.pointerId);
    }

    /** Distinguish orbit, pinch and pan without feeding orbit deltas into zoom. */
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
        const other = [...this.pointers].find(([id]) => id !== event.pointerId)?.[1];
        if (this.orbit?.pointer === event.pointerId && (event.buttons & 4) &&
            this.actions.rotate(this.orbit.pivot, deltaX, deltaY)) {
            this.dragged = true;
        } else if (other) {
            const previous = Math.hypot(old.x - other.x, old.y - other.y);
            const current = Math.hypot(event.clientX - other.x, event.clientY - other.y);
            if (previous > 1) {
                this.actions.zoom(current / previous);
            }
        } else {
            this.actions.pan(deltaX, deltaY);
        }
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        this.actions.invalidate();
    }

    /** Select only a primary click that has not become a drag, pinch or orbit. */
    private pointerUp(event: PointerEvent): void {
        if (this.orbit?.pointer === event.pointerId) {
            this.cancelOrbit();
        }
        this.pointers.delete(event.pointerId);
        if (event.button === 0 && !this.dragged && this.down) {
            this.actions.select(event.clientX, event.clientY);
        }
        if (!this.pointers.size) {
            this.down = null;
        }
    }
}
