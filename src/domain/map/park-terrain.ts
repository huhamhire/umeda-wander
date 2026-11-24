import { closestPolygonPoint, pointInPolygon } from './geometry.ts';
import type { Point2, PublicPark } from './model.ts';

/** Profile from the street edge over the planted rim and down to the waterside bowl. */
function basinElevation(park: PublicPark, point: Point2): number {
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

/** Blend the underlying landform to its published features and adjoining pavement. */
export function parkTerrainElevation(park: PublicPark, point: Point2): number {
    let elevation = basinElevation(park, point);
    for (const seam of park.landform.seams ?? []) {
        const distance = Math.hypot(point.x - seam.point.x, point.z - seam.point.z);
        const weight = Math.max(0, 1 - distance / seam.radius);
        elevation += (seam.y - elevation) * weight * weight * (3 - 2 * weight);
    }
    return elevation;
}
