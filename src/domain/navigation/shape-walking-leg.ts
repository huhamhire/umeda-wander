import { pointInPolygon } from '../map/geometry.ts';
import type { PlanRegion, Point2, RouteNode } from '../map/model.ts';

/** A chord may start or finish on an edge, but must stay inside the walkable region between them. */
export function walkableChord(from: Point2, to: Point2, region: PlanRegion): boolean {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const west = Math.min(from.x, to.x);
    const east = Math.max(from.x, to.x);
    const north = Math.min(from.z, to.z);
    const south = Math.max(from.z, to.z);
    for (const ring of [region.outline, ...region.holes ?? []]) {
        let a = ring.at(-1)!;
        for (const b of ring) {
            if (Math.max(a.x, b.x) >= west && Math.min(a.x, b.x) <= east &&
                Math.max(a.z, b.z) >= north && Math.min(a.z, b.z) <= south) {
                const ex = b.x - a.x;
                const ez = b.z - a.z;
                const det = dx * ez - dz * ex;
                const x = a.x - from.x;
                const z = a.z - from.z;
                if (det !== 0) {
                    const t = (x * ez - z * ex) / det;
                    const u = (x * dz - z * dx) / det;
                    // Reject boundary crossings and tangencies inside the chord, including at vertices.
                    if (t > 1e-9 && t < 1 - 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) {
                        return false;
                    }
                }
            }
            a = b;
        }
    }
    const midpoint = { x: from.x + dx / 2, z: from.z + dz / 2 };
    return pointInPolygon(midpoint, region.outline) && !region.holes?.some(hole => pointInPolygon(midpoint, hole));
}

/** Find the shortest visible chain through the ordered mesh points without discarding any run endpoint. */
function shortestVisibleChain(points: readonly RouteNode[], region: PlanRegion): string[] {
    const first = points[0]!;
    const last = points.at(-1)!;
    if (points.length <= 2 || walkableChord(first, last, region)) {
        return [last.id];
    }
    const costs = Array<number>(points.length).fill(0);
    const next = Array<number>(points.length);
    for (let i = points.length - 2; i >= 0; i--) {
        const from = points[i]!;
        let best = Infinity;
        for (let j = points.length - 1; j > i; j--) {
            const to = points[j]!;
            const cost = Math.hypot(to.x - from.x, to.z - from.z) + costs[j]!;
            if (cost < best - 1e-6 && (j === i + 1 || walkableChord(from, to, region))) {
                best = cost;
                next[i] = j;
            }
        }
        costs[i] = best;
    }
    const shaped: string[] = [];
    for (let i = next[0]!; i < points.length; i = next[i] ?? points.length) {
        shaped.push(points[i]!.id);
    }
    return shaped;
}

/** Shortcut a single itinerary leg within each contiguous run of eligible mesh edges. */
export function shapeWalkingLeg(
    leg: readonly string[],
    nodes: ReadonlyMap<string, RouteNode>,
    regionBetween: (from: string, to: string) => PlanRegion | undefined
): string[] {
    const result = leg.slice(0, 1);
    let start = 0;
    while (start + 1 < leg.length) {
        const region = regionBetween(leg[start]!, leg[start + 1]!);
        let end = start + 1;
        if (region) {
            while (end + 1 < leg.length && regionBetween(leg[end]!, leg[end + 1]!) === region) {
                end++;
            }
        }
        if (region) {
            const points = leg.slice(start, end + 1).map(id => nodes.get(id)!);
            result.push(...shortestVisibleChain(points, region));
        } else {
            result.push(leg[end]!);
        }
        start = end;
    }
    return result;
}
