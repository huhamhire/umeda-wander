import clipping from 'polygon-clipping';
import type { FloorArea, Level, PlanRegion, StationMap } from '../domain/map/model.ts';
import type { DeckBlock } from '../domain/map/public-deck.ts';
import { passageOutline } from '../domain/map/geometry.ts';

/**
 * Convert the outer ring and real holes into polygon-clipping input without dropping ring order.
 */
const geometry = (a: PlanRegion) => [a.outline, ...a.holes ?? []].map(r => r.map(p => [p.x, p.z] as [
    number,
    number
]));
/** Explicit deck paths become one face at junctions. Station slabs retain their own ownership. */
export function assemblePublicDecks(blocks: DeckBlock[], stations: StationMap[], levels: Level[]): FloorArea[] {
    const result: FloorArea[] = [];
    for (const block of blocks) {
        const regions = [...block.regions];
        for (const p of block.paths) {
            for (let i = 1; i < p.points.length; i++) {
                const a = p.points[i - 1]!;
                const b = p.points[i]!;
                if (Math.hypot(b.x - a.x, b.z - a.z) > .01) {
                    regions.push({ outline: passageOutline(a, b, p.width) });
                }
            }
            for (const v of p.points) {
                regions.push({
                    outline: Array.from(
                        { length: 12 },
                        (_, i) => ({
                            x: v.x + Math.cos(i * Math.PI / 6) * p.width / 2,
                            z: v.z + Math.sin(i * Math.PI / 6) * p.width / 2
                        })
                    )
                });
            }
        }
        if (!regions.length) {
            continue;
        }
        const y = levels.find(l => l.id === block.level)!.y;
        const cuts = [
            ...block.voids ?? [],
            ...stations.flatMap(s => s.layout.areas.filter(a => Math.abs(s.levels.find(l => l.id === a.level)!.y + (a.elevationOffset ?? 0) - y) < .01)),
            ...result.filter(a => levels.find(l => l.id === a.level)!.y === y)
        ].map(geometry);
        // Preserve the open atrium; it must not be sealed by a new public surface.
        for (const s of stations) {
            for (const a of s.layout.atria ?? []) {
                for (const o of a.openings) {
                    if (s.levels.find(l => l.id === o.level)?.y === y) {
                        cuts.push(geometry({ outline: o.outline }));
                    }
                }
            }
        }
        const union = clipping.union(geometry(regions[0]!), ...regions.slice(1).map(geometry));
        const clipped = cuts.length ? clipping.difference(union, ...cuts) : union;
        result.push(...clipped.map((polygon, i): FloorArea => ({
            id: block.id + ':deck-' + i,
            blockId: block.id,
            name: block.name,
            level: block.level,
            kind: 'public',
            height: .55,
            label: false,
            railings: true,
            outline: polygon[0]!.map(([x, z]) => ({ x, z })),
            holes: polygon.slice(1).map(r => r.map(([x, z]) => ({ x, z }))),
            evidence: block.evidence
        })));
    }
    return result;
}
