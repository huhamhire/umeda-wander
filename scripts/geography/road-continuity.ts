import clipping from 'polygon-clipping';
import type { Point2 } from '../../src/domain/map/model.ts';
import { passageOutline } from '../../src/domain/map/geometry.ts';
import { ring } from './context-scope.ts';

export interface GroundRoad {
    id: string;
    name?: string;
    points: Point2[];
    width: number;
}
interface Span {
    from: number;
    to: number;
}
interface Join {
    id: string;
    here: number;
    there: number;
}

/**
 * Create continuous asphalt polygons from segment widths and merge their junction pieces.
 */
export function roadGeometry(points: Point2[], width: number): clipping.MultiPolygon {
    const pieces = points.slice(1).flatMap((b, i) => {
        const a = points[i]!;
        return Math.hypot(a.x - b.x, a.z - b.z) > .001 ? [[ring(passageOutline(a, b, width))]] : [];
    });
    return pieces.length ? clipping.union(pieces[0]!, ...pieces.slice(1)) : [];
}

/**
 * Project a point onto a road polyline and return its closest segment-relative progress.
 */
function progress(point: Point2, points: Point2[]): number {
    let best = 0;
    let distance = Infinity;
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1]!;
        const b = points[i]!;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
        const d = Math.hypot(point.x - a.x - t * dx, point.z - a.z - t * dz);
        if (d < distance) {
            best = i - 1 + t;
            distance = d;
        }
    }
    return best;
}

/**
 * Extract a continuous road interval while preserving original intermediate vertices.
 */
function slice(points: Point2[], span: Span): Point2[] {
    const at = (u: number): Point2 => {
        const i = Math.min(points.length - 2, Math.floor(u));
        const t = u - i;
        return {
            x: points[i]!.x * (1 - t) + points[i + 1]!.x * t,
            z: points[i]!.z * (1 - t) + points[i + 1]!.z * t
        };
    };
    return [at(span.from), ...points.slice(Math.floor(span.from) + 1, Math.ceil(span.to)), at(span.to)];
}

/** Display connectivity only: retain original road spans, never invent walking routes. */
export function retainRoadSpans(roads: GroundRoad[], scope: clipping.MultiPolygon) {
    const spans = new Map<string, Span>();
    const byId = new Map(roads.map(road => [road.id, road]));
    const graph = new Map<string, Join[]>(roads.map(road => [road.id, []]));
    const vertices = new Map<string, {
        id: string;
        progress: number;
    }[]>();
    const fragmented = new Set<string>();
    for (const road of roads) {
        const clipped = clipping.intersection(roadGeometry(road.points, road.width), scope);
        if (clipped.length) {
            const values = clipped.flat(2).map(([x, z]) => progress({ x, z }, road.points));
            spans.set(road.id, { from: Math.min(...values), to: Math.max(...values) });
            if (clipped.length > 1) {
                fragmented.add(road.id);
            }
        }
        // Names identify a road, source vertices identify genuine continuation points.
        // Unnamed ways retain their own complete middle span, without guessing across junctions.
        const name = road.name || road.id;
        road.points.forEach((point, i) => {
            const key = `${name}:${Math.round(point.x * 1000)},${Math.round(point.z * 1000)}`;
            const entries = vertices.get(key) ?? [];
            for (const other of entries) {
                if (other.id === road.id) {
                    continue;
                }
                graph.get(road.id)!.push({ id: other.id, here: i, there: other.progress });
                graph.get(other.id)!.push({ id: road.id, here: other.progress, there: i });
            }
            entries.push({ id: road.id, progress: i });
            vertices.set(key, entries);
        });
    }
    const initial = new Set(spans.keys());
    const initialSpans = new Map([...spans].map(([id, span]) => [id, { ...span }]));
    const remaining = new Set(initial);
    const extend = (id: string, u: number) => {
        const span = spans.get(id) ?? { from: u, to: u };
        span.from = Math.min(span.from, u);
        span.to = Math.max(span.to, u);
        spans.set(id, span);
    };
    const costs = new Map(roads.map(road => [
        road.id,
        road.points.slice(1).reduce(
            (sum, p, i) => sum + Math.hypot(p.x - road.points[i]!.x, p.z - road.points[i]!.z),
            0
        )
    ]));
    while (remaining.size) {
        const connected = new Set([remaining.values().next().value!]);
        remaining.delete([...connected][0]!);
        while (remaining.size) {
            const distances = new Map([...connected].map(id => [id, 0]));
            const previous = new Map<string, {
                id: string;
                join: Join;
            }>();
            const visited = new Set<string>();
            let target: string | undefined;
            while (true) {
                const current = [...distances].filter(([id]) => !visited.has(id)).sort((a, b) => a[1] - b[1])[0];
                if (!current) {
                    break;
                }
                const [id, distance] = current;
                if (remaining.has(id)) {
                    target = id;
                    break;
                }
                visited.add(id);
                for (const join of graph.get(id)!) {
                    const next = distance + costs.get(join.id)!;
                    if (next < (distances.get(join.id) ?? Infinity)) {
                        distances.set(join.id, next);
                        previous.set(join.id, { id, join });
                    }
                }
            }
            if (!target) {
                break;
            }
            let current = target;
            while (!connected.has(current)) {
                const predecessor = previous.get(current)!;
                extend(current, predecessor.join.there);
                extend(predecessor.id, predecessor.join.here);
                connected.add(current);
                remaining.delete(current);
                current = predecessor.id;
            }
        }
    }
    const retained = [...spans].flatMap(([id, span]) => {
        if (span.to - span.from < .00001) {
            return [];
        }
        const road = byId.get(id)!;
        const points = slice(road.points, span);
        return [{ ...road, points, geometry: roadGeometry(points, road.width) }];
    });
    const repairedIds = [...spans].filter(([id, span]) => {
        const original = initialSpans.get(id);
        return fragmented.has(id) || !original || Math.abs(original.from - span.from) > .00001 || Math.abs(original.to - span.to) > .00001;
    }).map(([id]) => id);
    return { retained, repairedIds, initialIds: [...initial] };
}
