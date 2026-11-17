import type { Facility, FloorArea, LevelId, Point2 } from '../../domain/map/model.ts';

export interface GateBoundary {
    gateId: string;
    boundaryId: string;
    level: LevelId;
    center: Point2;
    rotationRad: number;
    fences: {
        from: Point2;
        to: Point2;
    }[];
}

/** Match each gate bank to the nearest parallel edge of a paid area. */
export function planGateBoundaries(facilities: Facility[], areas: FloorArea[]): GateBoundary[] {
    const plans = facilities.filter(facility => facility.kind === 'gate').map(gate => {
        const angle = gate.rotationRad ?? (gate.axis === 'z' ? Math.PI / 2 : 0);
        let nearest: {
            a: Point2;
            b: Point2;
            t: number;
            distance: number;
            boundaryId: string;
        } | undefined;
        for (const area of areas.filter(area => area.level === gate.level && area.kind === 'paid')) {
            for (let i = 0; i < area.outline.length; i++) {
                const a = area.outline[i]!;
                const b = area.outline[(i + 1) % area.outline.length]!;
                const dx = b.x - a.x;
                const dz = b.z - a.z;
                const length = Math.hypot(dx, dz);
                if (Math.abs((dx * Math.cos(angle) + dz * Math.sin(angle)) / length) < 0.98) {
                    continue;
                }
                const t = ((gate.x - a.x) * dx + (gate.z - a.z) * dz) / (length * length);
                if (t < 0 || t > 1) {
                    continue;
                }
                const distance = Math.hypot(gate.x - a.x - t * dx, gate.z - a.z - t * dz);
                if (distance <= 2.5 && (!nearest || distance < nearest.distance)) {
                    nearest = {
                        a,
                        b,
                        t,
                        distance,
                        boundaryId: `${area.id}:${i}`
                    };
                }
            }
        }
        if (!nearest) {
            throw new Error(`No paid boundary for gate ${gate.id}`);
        }
        const { a, b, t } = nearest;
        const length = Math.hypot(b.x - a.x, b.z - a.z);
        const halfGap = (gate.gateCount ? ((gate.gateCount - 1) * 1.7 / 2 + 1.3) : 5.5) / length;
        const at = (u: number): Point2 => ({ x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u });
        return {
            gateId: gate.id,
            boundaryId: nearest.boundaryId,
            level: gate.level,
            center: at(t),
            rotationRad: Math.atan2(b.z - a.z, b.x - a.x),
            a,
            b,
            t,
            halfGap
        };
    });
    return plans.map(plan => {
        const intervals = plans.filter(other => other.boundaryId === plan.boundaryId).map(other => [Math.max(0, other.t - other.halfGap), Math.min(1, other.t + other.halfGap)] as const).sort((a, b) => a[0] - b[0]);
        const at = (t: number) => ({ x: plan.a.x + (plan.b.x - plan.a.x) * t, z: plan.a.z + (plan.b.z - plan.a.z) * t });
        const fences: GateBoundary['fences'] = [];
        let cursor = 0;
        for (const [start, end] of intervals) {
            if (start > cursor) {
                fences.push({ from: at(cursor), to: at(start) });
            }
            cursor = Math.max(cursor, end);
        }
        if (cursor < 1) {
            fences.push({ from: at(cursor), to: at(1) });
        }
        return { ...plan, fences };
    });
}
