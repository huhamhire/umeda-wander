import type { FloorArea, Level, LevelId, Point2, PublicPassage } from '../domain/map/model.ts';
import { pointInPolygon, closestPolygonPoint } from '../domain/map/geometry.ts';

export interface PublicContactContext {
    areas: FloorArea[];
    levels: Level[];
    passages: PublicPassage[];
}

/** Remove boundary barriers wherever another public surface joins at walking height. */
export function touchesPublicConnection(
    point: Point2,
    surface: {
        level: LevelId;
        elevationOffset?: number;
    },
    context: PublicContactContext,
    margin = 0,
    excludePassageId?: string
): boolean {
    const y = context.levels.find(l => l.id === surface.level)!.y + (surface.elevationOffset ?? 0);
    for (const area of context.areas) {
        if (area.kind !== 'public' || Math.abs(context.levels.find(l => l.id === area.level)!.y + (area.elevationOffset ?? 0) - y) > 0.25) {
            continue;
        }
        if (pointInPolygon(point, area.outline) && !area.holes?.some(h => pointInPolygon(point, h))) {
            return true;
        }
        if (margin > 0) {
            const edge = closestPolygonPoint(point, area.outline);
            if (Math.hypot(edge.x - point.x, edge.z - point.z) < margin) {
                return true;
            }
        }
    }
    for (const passage of context.passages) {
        if (passage.id === excludePassageId || passage.surfaceId) {
            continue;
        }
        for (let i = 1; i < passage.points.length; i++) {
            const a = passage.points[i - 1]!;
            const b = passage.points[i]!;
            const dx = b.x - a.x;
            const dz = b.z - a.z;
            const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
            const ay = context.levels.find(l => l.id === a.level)!.y + (a.elevationOffset ?? 0);
            const by = context.levels.find(l => l.id === b.level)!.y + (b.elevationOffset ?? 0);
            if (Math.abs(ay + (by - ay) * t - y) > 0.25) {
                continue;
            }
            if (Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t) < passage.width / 2 + margin) {
                return true;
            }
        }
    }
    return false;
}
