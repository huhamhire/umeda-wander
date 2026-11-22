import * as T from 'three';

type FadeRoot = { object: T.Object3D; previous: boolean; next: boolean; visible: boolean };

/** Include parent masks when a canopy or footprint shares a fading floor group. */
function isShown(object: T.Object3D, snapshot?: ReadonlyMap<T.Object3D, boolean>): boolean {
    for (let current: T.Object3D | null = object; current; current = current.parent) {
        if (!(snapshot?.get(current) ?? current.visible)) {
            return false;
        }
    }
    return true;
}

/** Blend a floor cut for drawing while leaving the scene's normal visibility and materials intact. */
export class TourLayerFade {
    private roots: FadeRoot[] = [];
    private readonly incoming = new Map<T.Material, T.Material>();
    private readonly outgoing = new Map<T.Material, T.Material>();

    /** Find the objects whose visibility changed when the next focus was applied. */
    begin(before: ReadonlyMap<T.Object3D, boolean>): void {
        this.clear();
        this.roots = [...before.keys()].flatMap(object => {
            const previous = isShown(object, before);
            const next = isShown(object);
            const visible = object.visible;
            return previous !== next || (previous || next) !== visible ? [{ object, previous, next, visible }] : [];
        });
    }

    /** Draw the old and new floor masks together at complementary opacities. */
    draw(progress: number, render: () => void): void {
        if (progress >= 1 || !this.roots.length) {
            this.clear();
            render();
            return;
        }
        const materials = new Map<T.Mesh, T.Material | T.Material[]>();
        for (const { object, previous, next } of this.roots) {
            object.visible = previous || next;
        }
        for (const { object, previous, next } of this.roots) {
            if (previous === next) {
                continue;
            }
            object.traverseVisible(child => {
                if (child instanceof T.Mesh && !materials.has(child)) {
                    materials.set(child, child.material);
                    const variants = next ? this.incoming : this.outgoing;
                    const opacity = next ? progress : 1 - progress;
                    child.material = Array.isArray(child.material)
                        ? child.material.map(material => this.variant(material, variants, opacity))
                        : this.variant(child.material, variants, opacity);
                }
            });
        }
        try {
            render();
        } finally {
            for (const [mesh, material] of materials) {
                mesh.material = material;
            }
            for (const { object, visible } of this.roots) {
                object.visible = visible;
            }
        }
    }

    /** Share transparent materials within each direction of the fade. */
    private variant(material: T.Material, cache: Map<T.Material, T.Material>, opacity: number): T.Material {
        let result = cache.get(material);
        if (!result) {
            result = material.clone();
            result.transparent = true;
            result.depthWrite = false;
            cache.set(material, result);
        }
        result.opacity = material.opacity * opacity;
        return result;
    }

    /** Release temporary variants once the floor cut settles or playback exits. */
    clear(): void {
        this.roots = [];
        for (const cache of [this.incoming, this.outgoing]) {
            for (const variant of cache.values()) {
                variant.dispose();
            }
            cache.clear();
        }
    }
}
