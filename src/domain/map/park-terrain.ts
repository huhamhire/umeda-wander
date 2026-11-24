import { closestPolygonPoint, pointInPolygon } from './geometry.ts';
import type { Point2, PublicPark } from './model.ts';

/** Profile from the street seam over the planted rim and down to the waterside bowl. */
export function parkTerrainElevation(park: PublicPark, point: Point2): number {
    const { basin, boundaryY, basinY, moundRise } = park.landform;
    if (pointInPolygon(point, basin)) {
        return basinY;
    }
    const edge = closestPolygonPoint(point, park.outline);
    const inner = closestPolygonPoint(point, basin);
    const a = Math.hypot(edge.x - point.x, edge.z - point.z);
    const b = Math.hypot(inner.x - point.x, inner.z - point.z);
    const t = a / (a + b);
    return boundaryY + (basinY - boundaryY) * t + moundRise * Math.sin(Math.PI * t);
}
