import clipping from 'polygon-clipping';
import type { FloorArea, PlanRegion, Point2, LevelId } from '../../domain/map/model.ts';
import type { BuildingOccupancy } from '../../domain/map/public-area.ts';
import { pointInPolygon } from '../../domain/map/geometry.ts';

/**
 * Convert the outer ring and real holes into polygon-clipping input without dropping ring order.
 */
const geometry = (a: PlanRegion) => [a.outline, ...a.holes ?? []].map(r => r.map(p => [p.x, p.z] as [
    number,
    number
]));
/**
 * Compute the absolute plan area with the shoelace formula.
 */
const area = (ring: Point2[]) => Math.abs(ring.reduce(
    (s, p, i) => {
        const q = ring[(i + 1) % ring.length]!;
        return s + p.x * q.z - q.x * p.z;
    },
    0
)) / 2;
/** Approximate interior label anchor; stays in the filled region rather than a hole/adjacent corridor. */
function labelPoint(region: PlanRegion): Point2 {
    const xs = region.outline.map(p => p.x);
    const zs = region.outline.map(p => p.z);
    const minX = Math.min(...xs);
    const minZ = Math.min(...zs);
    const w = Math.max(...xs) - minX;
    const h = Math.max(...zs) - minZ;
    let best = region.outline[0]!;
    let score = -1;
    for (let i = 1; i < 18; i++) {
        for (let j = 1; j < 18; j++) {
            const p = { x: minX + w * i / 18, z: minZ + h * j / 18 };
            if (!pointInPolygon(p, region.outline) || region.holes?.some(r => pointInPolygon(p, r))) {
                continue;
            }
            let clearance = Infinity;
            for (const ring of [region.outline, ...region.holes ?? []]) {
                for (let k = 0; k < ring.length; k++) {
                    const a = ring[k]!;
                    const b = ring[(k + 1) % ring.length]!;
                    const dx = b.x - a.x;
                    const dz = b.z - a.z;
                    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
                    clearance = Math.min(clearance, Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t));
                }
            }
            if (clearance > score) {
                best = p;
                score = clearance;
            }
        }
    }
    return best;
}

/** Keep the complete label rectangle inside its own clipped island. */
function labelWidth(region: PlanRegion, p: Point2, angle: number): number {
    const co = Math.cos(angle);
    const si = Math.sin(angle);
    const fits = (width: number) => [
        -.5,
        -.25,
        0,
        .25,
        .5
    ].every(x => [-.1875, 0, .1875].every(z => {
        const q = { x: p.x + width * (x * co - z * si), z: p.z + width * (x * si + z * co) };
        return pointInPolygon(q, region.outline) && !region.holes?.some(h => pointInPolygon(q, h));
    }));
    let low = 0;
    let high = 30;
    for (let i = 0; i < 15; i++) {
        const mid = (low + high) / 2;
        if (fits(mid)) {
            low = mid;
        }
        else {
            high = mid;
        }
    }
    return low * .9;
}

/** Building fill yields to the reviewed public excavation and station interiors. */
export function buildBuildingOccupancies(
    definitions: BuildingOccupancy[],
    publicAreas: FloorArea[],
    stationInteriors: PlanRegion[],
    target: {
        level: LevelId;
        prefix: string;
    }
) {
    const cuts = [...publicAreas.filter(a => !a.elevationOffset), ...stationInteriors].map(geometry);
    const occupied: clipping.MultiPolygon = [];
    const areas: FloorArea[] = [];
    const contacts: {
        buildingId: string;
        surfaceIds: string[];
        status: 'geometric-contact' | 'needs-review';
    }[] = [];
    for (const definition of definitions) {
        const raw = geometry(definition.region);
        const clipped = clipping.difference(raw, ...cuts, ...occupied.map(p => [p]));
        const sorted = clipped.map(p => ({
            outline: p[0]!.map(([x, z]) => ({ x, z })),
            holes: p.slice(1).map(r => r.map(([x, z]) => ({ x, z })))
        }))
            .filter(r => area(r.outline) > 1).sort((a, b) => area(b.outline) - area(a.outline));
        let angle = 0;
        let length = 0;
        for (let i = 0; i < definition.region.outline.length; i++) {
            const a = definition.region.outline[i]!;
            const b = definition.region.outline[(i + 1) % definition.region.outline.length]!;
            const d = Math.hypot(b.x - a.x, b.z - a.z);
            if (d > length) {
                length = d;
                angle = Math.atan2(b.z - a.z, b.x - a.x);
            }
        }
        if (Math.cos(angle) < 0) {
            angle += Math.PI;
        }
        for (const [i, region] of sorted.entries()) {
            const anchor = labelPoint(region);
            const width = labelWidth(region, anchor, angle);
            areas.push({
                id: target.prefix + '-' + definition.id + '-' + i,
                name: definition.name,
                blockId: 'building:' + definition.id,
                kind: 'commercial',
                level: target.level,
                ...region,
                height: .3,
                label: i === 0 && width >= 8,
                labelStyle: 'floor',
                labelAngleRad: angle,
                labelAnchor: anchor,
                labelWidth: width,
                evidence: definition.evidence
            });
        }
        const surfaceIds = publicAreas.filter(a => !a.elevationOffset && clipping.intersection(raw, geometry(a)).length > 0).map(a => a.id);
        contacts.push({
            buildingId: definition.id,
            surfaceIds,
            status: surfaceIds.length ? 'geometric-contact' : 'needs-review'
        });
        occupied.push(...clipped);
    }
    return { areas, contacts };
}
