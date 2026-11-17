import polygonClipping from 'polygon-clipping';
import type { Evidence, FloorArea, LevelId, PlanRegion, Point2 } from '../domain/map/model.ts';

export interface UndergroundSection {
    points: Point2[];
    widths: number[];
}

export interface UndergroundSpacePlan {
    id: string;
    name: string;
    level: LevelId;
    evidence: Evidence;
    sections: UndergroundSection[];
    chambers: PlanRegion[];
    exclusions: PlanRegion[];
}

/**
 * Round coordinates to five decimals to reduce floating-point seams in boolean operations.
 */
const snap = (n: number) => Math.round(n * 1e5) / 1e5;
/**
 * Quantize a region and retain its holes for polygon boolean operations.
 */
const polygon = (r: PlanRegion) => [r.outline, ...r.holes ?? []].map(ring => ring.map(p => [snap(p.x), snap(p.z)] as [
    number,
    number
]));
/** Excavated floor: variable-width sections plus traced chambers, minus occupied land. */
export function planUndergroundSpace(plan: UndergroundSpacePlan): FloorArea[] {
    const regions: PlanRegion[] = [...plan.chambers];
    for (const section of plan.sections) {
        if (section.points.length < 2 || section.widths.length !== section.points.length || section.widths.some(w => !Number.isFinite(w) || w <= 0)) {
            throw new Error('Invalid underground section');
        }
        for (let i = 1; i < section.points.length; i++) {
            const a = section.points[i - 1]!;
            const b = section.points[i]!;
            const length = Math.hypot(b.x - a.x, b.z - a.z);
            if (length < 1e-6) {
                throw new Error('Repeated underground section point');
            }
            const nx = -(b.z - a.z) / length;
            const nz = (b.x - a.x) / length;
            const wa = section.widths[i - 1]! / 2;
            const wb = section.widths[i]! / 2;
            regions.push({
                outline: [
                    { x: a.x + nx * wa, z: a.z + nz * wa },
                    { x: b.x + nx * wb, z: b.z + nz * wb },
                    { x: b.x - nx * wb, z: b.z - nz * wb },
                    { x: a.x - nx * wa, z: a.z - nz * wa }
                ]
            });
        }
        // Fill corner wedges without extending a long miter through neighbouring blocks.
        for (let i = 1; i < section.points.length - 1; i++) {
            const p = section.points[i]!;
            const radius = section.widths[i]! / 2;
            regions.push({
                outline: Array.from(
                    { length: 16 },
                    (_, j) => ({ x: p.x + radius * Math.cos(j * Math.PI / 8), z: p.z + radius * Math.sin(j * Math.PI / 8) })
                )
            });
        }
    }
    if (!regions.length) {
        return [];
    }
    const united = polygonClipping.union(polygon(regions[0]!), ...regions.slice(1).map(polygon));
    const carved = plan.exclusions.length ? polygonClipping.difference(united, ...plan.exclusions.map(polygon)) : united;
    return carved.map((p, i) => ({
        id: `${plan.id}-${i}`,
        name: plan.name,
        level: plan.level,
        kind: 'public',
        height: 0.55,
        label: false,
        outline: p[0]!.slice(0, -1).map(([x, z]) => ({ x, z })),
        holes: p.slice(1).map(r => r.slice(0, -1).map(([x, z]) => ({ x, z }))),
        evidence: plan.evidence
    }));
}
