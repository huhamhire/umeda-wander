import * as T from 'three';
import type { StationId } from '../../domain/map/model.ts';
import { isRegionMuted } from '../../application/exploration/region-focus.ts';
import { applyNightColor, darkContextColor } from './night-palette.ts';

type MaterialVariant = 'muted' | 'dark' | 'dark-muted' | 'reference' | 'dark-reference';
const lightContext = new T.Color(0xcbd0c7);
const darkContext = new T.Color(darkContextColor);
export const referenceSurface = { light: 0xb3bfbd, dark: 0xc6d0cc, opacity: .24 };
const undergroundReferenceNight = 0x829391;

/**
 * Record model ownership for consistent station-focus muting.
 */
export function setRegionOwner<O extends T.Object3D>(object: O, owner: StationId | null): O {
    object.userData.regionStation = owner;
    return object;
}

/**
 * Read explicit model ownership, falling back to the caller’s region when unspecified.
 */
export function regionOwner(object: T.Object3D, fallback: StationId | null = null): StationId | null {
    for (let current: T.Object3D | null = object; current; current = current.parent) {
        if (Object.hasOwn(current.userData, 'regionStation')) {
            return current.userData.regionStation as StationId | null;
        }
    }
    return fallback;
}

/** Resolve model material colours from both page theme and exploration focus. */
export class LayerAppearance {
    private originals = new WeakMap<T.Mesh, T.Material | T.Material[]>();
    private variants = new Map<T.Material, Map<MaterialVariant, T.Material>>();
    private roles = new WeakMap<T.Mesh, MaterialVariant | 'original'>();
    private dark = false;

    /** Select the night palette for subsequent model appearance updates. */
    setDarkTheme(dark: boolean): void {
        this.dark = dark;
    }

    /**
     * Apply the current theme and floor role without changing shared source materials.
     */
    apply(
        group: T.Object3D, context: boolean, focus?: StationId | null, owner: StationId | null = null,
        activeUndergroundBlocks?: ReadonlySet<string>
    ): void {
        group.traverse(object => {
            if (!(object instanceof T.Mesh)) {
                return;
            }
            const block = object.userData.publicUndergroundBlock as string | undefined;
            const focusedPublic = !!block && !!activeUndergroundBlocks;
            const reference = focusedPublic && !activeUndergroundBlocks.has(block);
            const muted = context || (!focusedPublic && isRegionMuted(focus, regionOwner(object, owner)));
            let role: MaterialVariant | 'original' = this.dark ? (muted ? 'dark-muted' : 'dark') : (muted ? 'muted' : 'original');
            if (reference) {
                role = this.dark ? 'dark-reference' : 'reference';
            }
            if (this.roles.get(object) === role) {
                return;
            }
            const original = this.originals.get(object) ?? (object.material as T.Material | T.Material[]);
            this.originals.set(object, original);
            if (role === 'original') {
                object.material = original;
            }
            else {
                object.material = Array.isArray(original) ? original.map(m => this.variant(m, role)) : this.variant(original, role);
            }
            if (block) {
                object.castShadow = !reference;
            }
            this.roles.set(object, role);
        });
    }
    /**
     * Reuse colour variants while toggling themes or moving between floor roles.
     */
    private variant(original: T.Material, role: MaterialVariant): T.Material {
        if (!original.visible) {
            return original;
        }
        const materialVariants = this.variants.get(original) ?? new Map<MaterialVariant, T.Material>();
        const cached = materialVariants.get(role);
        if (cached) {
            return cached;
        }
        const result = original.clone();
        const reference = role === 'reference' || role === 'dark-reference';
        const muted = role === 'muted' || role === 'dark-muted';
        const dark = role === 'dark' || role === 'dark-muted' || role === 'dark-reference';
        result.name = `${original.name}-${role}`;
        if ('color' in result && result.color instanceof T.Color) {
            if (reference) {
                result.color.setHex(dark ? undergroundReferenceNight : referenceSurface.light);
            } else if (dark) {
                applyNightColor(result.color, original.userData.nightColor);
            }
            if (muted) {
                result.color.lerp(dark ? darkContext : lightContext, 0.82);
            }
        }
        if (muted && 'emissive' in result && result.emissive instanceof T.Color) {
            result.emissive.multiplyScalar(0.1);
        }
        if (reference) {
            result.transparent = true;
            result.opacity = referenceSurface.opacity;
            result.depthWrite = false;
        } else if (muted && result.transparent) {
            result.opacity *= 0.65;
        }
        materialVariants.set(role, result);
        this.variants.set(original, materialVariants);
        return result;
    }

    /** Put original materials back before scene teardown and dispose of cached colour variants. */
    dispose(group: T.Object3D): void {
        group.traverse(object => {
            if (object instanceof T.Mesh) {
                const original = this.originals.get(object);
                if (original) {
                    object.material = original;
                }
            }
        });
        for (const materialVariants of this.variants.values()) {
            for (const material of materialVariants.values()) {
                material.dispose();
            }
        }
        this.variants.clear();
    }
}
