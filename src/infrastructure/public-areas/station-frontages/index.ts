import type { StationMap, StationId, FloorArea } from '../../../domain/map/model.ts';
import { pointInPolygon } from '../../../domain/map/geometry.ts';
import clipping from 'polygon-clipping';

/** Only operator-side concourses; obsolete district-spanning rectangles are excluded.
 * These source-plan aprons are donated to the district owner, never drawn twice.
 * Regional contours/branch bindings are owned by the public-area registry.
 */
const core: Record<StationId, string[]> = {
    'jr-osaka': ['umekita-public', 'crost-public'],
    'hankyu-umeda': [],
    'metro-umeda': [
        'north-public',
        'east-public',
        'west-public',
        'jr-interface',
        'south-public'
    ],
    'hanshin-umeda': ['west-public', 'central-public', 'east-hall-public', 'south-b1-lift-door-approach', 'f23-b1-approach'],
    'higashi-umeda': ['public-spine', 'whity-public'],
    'nishi-umeda': ['public-hall', 'north-west-public', 'south-public'],
    // The southern exits have local equipment bays, not a confirmed full-length hall.
    'kitashinchi': ['north-public'],
};
/**
 * Donate confirmed station forecourts and public landings to the shared underground assembly.
 */
export function stationFrontages(stations: StationMap[]): FloorArea[] {
    return stations.flatMap(s => {
        const selected = new Set(core[s.id].flatMap(key => [key, s.id + '-' + key]));
        const publicLandings = s.layout.connections.flatMap(c => [c.from, c.to]).filter(n => s.levels.find(l => l.id === n.level)?.y === -8);
        return s.layout.areas.flatMap(a => {
            if (a.kind !== 'public' || s.levels.find(l => l.id === a.level)?.y !== -8) {
                return [];
            }
            if (selected.has(a.id)) {
                return [a];
            }
            const landings = publicLandings.filter(n => n.level === a.level && contains(a, n));
            if (!landings.length) {
                return [];
            }
            // Keep actual short entrance arms. A legacy district-length slab supplies
            // only its equipment bays; the reviewed regional mesh owns the corridor.
            const xs = a.outline.map(p => p.x);
            const zs = a.outline.map(p => p.z);
            if (Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) < 90) {
                return a.elevationOffset ? [
                    { ...a, blockId: s.id === 'nishi-umeda' ? 'hanshin-west-b1' : undefined },
                    { ...a, id: a.id + ':lower-apron', elevationOffset: 0 }
                ] : [a];
            }
            const masks = landings.map(p => [[p.x - 5, p.z - 5], [p.x + 5, p.z - 5], [p.x + 5, p.z + 5], [p.x - 5, p.z + 5]] as [
                number,
                number
            ][]);
            const geometry = clipping.intersection(
                [a.outline.map(p => [p.x, p.z] as [
                    number,
                    number
                ])],
                clipping.union([masks[0]!], ...masks.slice(1).map(r => [r]))
            );
            return geometry.map((rings, i) => ({
                ...a,
                id: a.id + ':landing-' + i,
                outline: rings[0]!.map(([x, z]) => ({ x, z })),
                holes: rings.slice(1).map(r => r.map(([x, z]) => ({ x, z })))
            }));
        });
    });
}

/**
 * Test the outer boundary while excluding holes.
 */
const contains = (a: FloorArea, p: {
    x: number;
    z: number;
}) => pointInPolygon(p, a.outline) && !a.holes?.some(h => pointInPolygon(p, h));
