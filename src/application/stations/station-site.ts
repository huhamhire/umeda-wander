import polygonClipping from 'polygon-clipping';
import type { PassageEndpoint, PlanRegion, Point2, StationMap, StationSite } from '../../domain/map/model.ts';
import { pointInPolygon, platformPoint, closestPolygonPoint } from '../../domain/map/geometry.ts';
// Rotated station rectangles share edges with floating-point noise; snap below
// any displayable precision before boolean operations.
/**
 * Round coordinates to five decimals to reduce floating-point seams in boolean operations.
 */
const snap = (n: number) => Math.round(n * 1e5) / 1e5;
/**
 * Quantize a region and retain its holes for polygon boolean operations.
 */
const polygon = (region: PlanRegion) => [region.outline, ...region.holes ?? []].map(r => r.map(p => [snap(p.x), snap(p.z)] as [
    number,
    number
]));
/**
 * Union plan regions and restore their outer rings and holes.
 */
const merge = (regions: PlanRegion[]): PlanRegion[] => regions.length ? polygonClipping.union(polygon(regions[0]!), ...regions.slice(1).map(polygon)).map(p => ({
    outline: p[0]!.slice(0, -1).map(([x, z]) => ({ x, z })),
    holes: p.slice(1).map(r => r.slice(0, -1).map(([x, z]) => ({ x, z }))),
})) : [];
/** Derived from a station's own module, never a district-wide bounding rectangle. */
export function describeStationSite(station: StationMap): StationSite {
    if (station.site) {
        if (station.site.station !== station.id) {
            throw new Error('Station perimeter belongs to another module');
        }
        return station.site;
    }
    return {
        station: station.id,
        layers: station.levels.map(level => {
            const areas = station.layout.areas.filter(a => a.level === level.id);
            const platforms = station.layout.platforms.filter(p => p.level === level.id).map(p => ({
                outline: [
                    platformPoint(p, -p.length / 2, -p.width / 2),
                    platformPoint(p, p.length / 2, -p.width / 2),
                    platformPoint(p, p.length / 2, p.width / 2),
                    platformPoint(p, -p.length / 2, p.width / 2),
                ]
            }));
            return {
                level: level.id,
                regions: merge([...areas, ...platforms]),
                paidRegions: merge(areas.filter(a => a.kind === 'paid'))
            };
        })
    };
}

/** Move a district skeleton's station endpoint onto the public region's exterior edge. */
export function stationPublicPortal(station: StationMap, endpoint: PassageEndpoint, toward: Point2): PassageEndpoint {
    const candidates = station.layout.areas.filter(a => a.level === endpoint.level && a.kind === 'public' && pointInPolygon(endpoint, a.outline));
    if (!candidates.length) {
        throw new Error(`Missing public landing for ${station.id}: ${endpoint.level}`);
    }
    const regions = merge(candidates);
    const region = regions.find(r => pointInPolygon(endpoint, r.outline)) ??
        regions.find(r => {
            const q = closestPolygonPoint(endpoint, r.outline);
            return Math.hypot(q.x - endpoint.x, q.z - endpoint.z) < 0.0001;
        });
    if (!region) {
        throw new Error(`Public portal outside perimeter for ${station.id}`);
    }
    const dx = toward.x - endpoint.x;
    const dz = toward.z - endpoint.z;
    let exit = Infinity;
    for (let i = 0; i < region.outline.length; i++) {
        const a = region.outline[i]!;
        const b = region.outline[(i + 1) % region.outline.length]!;
        const ex = b.x - a.x;
        const ez = b.z - a.z;
        const denominator = dx * ez - dz * ex;
        if (Math.abs(denominator) < 1e-9) {
            continue;
        }
        const ax = a.x - endpoint.x;
        const az = a.z - endpoint.z;
        const t = (ax * ez - az * ex) / denominator;
        const u = (ax * dz - az * dx) / denominator;
        if (t >= 0 && u >= 0 && u <= 1) {
            exit = Math.min(exit, t);
        }
    }
    if (!Number.isFinite(exit)) {
        throw new Error(`No public boundary toward district for ${station.id}`);
    }
    // Overlapping public landings already meet; do not extend past the next node.
    if (exit > 1) {
        return { ...endpoint };
    }
    const t = Math.max(0, exit - 0.0001 / Math.hypot(dx, dz));
    return { ...endpoint, x: endpoint.x + dx * t, z: endpoint.z + dz * t };
}
