import { pointInPolygon, closestPolygonPoint } from '../../domain/map/geometry.ts';
import type { FloorArea, Level, Point2, BuildingOpening, VerticalConnection } from '../../domain/map/model.ts';

/**
 * Test the outer boundary while excluding holes.
 */
const contains = (p: Point2, a: {
    outline: Point2[];
    holes?: Point2[][];
}) => pointInPolygon(p, a.outline) && !a.holes?.some(h => pointInPolygon(p, h));
/** Exposed edges only; continuation surfaces, declared doors and equipment mouths remain open. */
export function deckBoundarySegments(
    area: FloorArea,
    areas: FloorArea[],
    levels: Level[],
    doors: BuildingOpening[],
    connections: VerticalConnection[]
) {
    const y = levels.find(l => l.id === area.level)!.y;
    const neighbours = areas.filter(a => a.id !== area.id && a.kind === 'public' && Math.abs(levels.find(l => l.id === a.level)!.y + (a.elevationOffset ?? 0) - y) < .01);
    const endpoints = connections.flatMap(c => [c.from, c.to]).filter(n => levels.find(l => l.id === n.level)!.y + (n.elevationOffset ?? 0) === y);
    const atSeam = (p: Point2, a: FloorArea) => contains(p, a) || [a.outline, ...a.holes ?? []].some(r => {
        const q = closestPolygonPoint(p, r);
        return Math.hypot(q.x - p.x, q.z - p.z) < .12;
    });
    const open = (p: Point2) => neighbours.some(a => atSeam(p, a)) || doors.some(d => d.base <= y + .55 && d.top > y && contains(p, d)) || endpoints.some(n => Math.hypot(n.x - p.x, n.z - p.z) < 2.5);
    const result: {
        from: Point2;
        to: Point2;
    }[] = [];
    for (const ring of [area.outline, ...area.holes ?? []]) {
        for (let i = 0; i < ring.length; i++) {
            const a = ring[i]!;
            const b = ring[(i + 1) % ring.length]!;
            const length = Math.hypot(b.x - a.x, b.z - a.z);
            const count = Math.max(1, Math.ceil(length / .9));
            const at = (t: number) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
            for (let j = 0; j < count; j++) {
                if (![j / count, (j + .5) / count, (j + 1) / count].some(t => open(at(t)))) {
                    result.push({ from: at(j / count), to: at((j + 1) / count) });
                }
            }
        }
    }
    return result;
}
