import type { Point2 } from './model.ts';

export interface GeoPoint {
    lat: number;
    lon: number;
}

/** Local tangent-plane approximation for this small station district. */
export function projectDistrictPoint(point: GeoPoint, origin: GeoPoint, frameBearingDeg: number, metersPerUnit: number, anchor: Point2): Point2 {
    const east = (point.lon - origin.lon) * 111320 * Math.cos(origin.lat * Math.PI / 180);
    const north = (point.lat - origin.lat) * 111320;
    const angle = frameBearingDeg * Math.PI / 180;
    return {
        x: anchor.x + (east * Math.sin(angle) + north * Math.cos(angle)) / metersPerUnit,
        z: anchor.z + (east * Math.cos(angle) - north * Math.sin(angle)) / metersPerUnit
    };
}
