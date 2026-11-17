import clipping from 'polygon-clipping';
import type { FloorArea } from '../../domain/map/model.ts';
import type { PublicAreaBlock, PublicBlockDefinition } from '../../domain/map/public-area.ts';

/**
 * Convert the outer ring and real holes into polygon-clipping input without dropping ring order.
 */
const geometry = (a: FloorArea) => [a.outline, ...a.holes ?? []].map(r => r.map(p => [p.x, p.z] as [
    number,
    number
]));
/** Split one owner into disjoint maintenance blocks, preserving all source corners and holes. */
export function partitionPublicAreas(areas: FloorArea[], definitions: PublicBlockDefinition[]): PublicAreaBlock[] {
    if (new Set(definitions.map(d => d.id)).size !== definitions.length) {
        throw new Error('Duplicate public block');
    }
    if (definitions.at(-1)?.mask) {
        throw new Error('Public blocks need an explicit remainder owner');
    }
    for (const area of areas.filter(a => a.elevationOffset)) {
        if (!definitions.some(d => d.id === area.blockId)) {
            throw new Error('Elevated public apron needs an explicit block owner: ' + area.id);
        }
    }
    const flat = areas.filter(a => !a.elevationOffset);
    let remaining = flat.length ? clipping.union(geometry(flat[0]!), ...flat.slice(1).map(geometry)) : [];
    return definitions.map((definition, index) => {
        if (!definition.mask && index !== definitions.length - 1) {
            throw new Error('Remainder owner must be last');
        }
        const mask = definition.mask ? [definition.mask.outline, ...definition.mask.holes ?? []].map(r => r.map(p => [p.x, p.z] as [
            number,
            number
        ])) : undefined;
        const regions = mask ? clipping.intersection(remaining, mask) : remaining;
        if (mask) {
            remaining = clipping.difference(remaining, mask);
        }
        const base = flat[0];
        const owned: FloorArea[] = base ? regions.map((polygon, i) => ({
            ...base,
            id: definition.id + ':surface-' + i,
            name: definition.name,
            blockId: definition.id,
            label: false,
            outline: polygon[0]!.map(([x, z]) => ({ x, z })),
            holes: polygon.slice(1).map(r => r.map(([x, z]) => ({ x, z }))),
            evidence: definition.evidence
        })) : [];
        // Raised local aprons retain their own physical offset and explicit owner.
        owned.push(...areas.filter(a => a.elevationOffset && a.blockId === definition.id));
        return {
            id: definition.id,
            name: definition.name,
            level: 'district-underground',
            areas: owned,
            evidence: definition.evidence
        };
    });
}
