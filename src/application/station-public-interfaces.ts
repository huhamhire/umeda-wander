import { pointInPolygon } from '../domain/map/geometry.ts';
import type { StationMap } from '../domain/map/model.ts';
import type { StationPublicInterface } from '../domain/map/spatial-block.ts';
import { planGateBoundaries } from './gate-boundaries.ts';

/** Gate ownership defines the outward side; proximity never creates a walking edge. */
export function stationPublicInterfaces(station: StationMap): StationPublicInterface[] {
    return planGateBoundaries(station.facilities, station.layout.areas).map(g => {
        const gate = station.facilities.find(f => f.id === g.gateId)!;
        const dx = Math.cos(g.rotationRad);
        const dz = Math.sin(g.rotationRad);
        const probe = { x: g.center.x - dz, z: g.center.z + dx };
        const paid = station.layout.areas.filter(a => a.level === g.level && a.kind === 'paid');
        const sign = paid.some(a => pointInPolygon(probe, a.outline)) ? -1 : 1;
        const normal = { x: -dz * sign, z: dx * sign };
        const width = (gate.gateCount ?? 6) * 1.7 + 1;
        return {
            id: station.id + ':' + gate.id,
            station: station.id,
            gateId: gate.id,
            level: g.level,
            elevation: station.levels.find(l => l.id === g.level)!.y + (gate.elevationOffset ?? 0),
            boundary: [
                { x: g.center.x - dx * width / 2, z: g.center.z - dz * width / 2 },
                { x: g.center.x + dx * width / 2, z: g.center.z + dz * width / 2 }
            ],
            inside: { x: g.center.x - normal.x * 2, z: g.center.z - normal.z * 2 },
            outside: { x: g.center.x + normal.x * 2, z: g.center.z + normal.z * 2 },
            width,
            access: 'public',
            evidence: gate.evidence
        };
    });
}
