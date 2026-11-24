import type { BuildingOpening, Level, VerticalConnection } from '../../domain/map/model.ts';
import type { DeckPortal } from '../../domain/map/public-deck.ts';
import { passageOutline } from '../../domain/map/geometry.ts';

/** Declared wall mouths; no closest-building selection or implicit walking edge. */
export function deckBuildingOpenings(portals: DeckPortal[], levels: Level[]): BuildingOpening[] {
    return portals.filter(p => !p.target.startsWith('station:')).map(p => {
        const halfDepth = p.openingHalfDepth ?? 8;
        const dx = Math.cos(p.angle) * halfDepth;
        const dz = Math.sin(p.angle) * halfDepth;
        const y = levels.find(l => l.id === p.level)!.y;
        return {
            buildingId: p.target,
            base: y - .1,
            top: y + 4.5,
            outline: passageOutline(
                { x: p.point.x - dx, z: p.point.z - dz },
                { x: p.point.x + dx, z: p.point.z + dz },
                p.width + 1
            ),
            evidence: p.evidence
        };
    });
}

/** Only explicitly associated host buildings yield to their public access equipment. */
export function equipmentBuildingOpenings(
    connections: VerticalConnection[],
    bindings: {
        connectionId: string;
        buildingId: string;
    }[],
    levels: Level[]
): BuildingOpening[] {
    return bindings.map(b => {
        const c = connections.find(c => c.id === b.connectionId);
        if (!c) {
            throw new Error('Missing building access equipment ' + b.connectionId);
        }
        const low = levels.find(l => l.id === c.from.level)!.y;
        const high = levels.find(l => l.id === c.to.level)!.y;
        const dx = c.to.x - c.from.x;
        const dz = c.to.z - c.from.z;
        const run = Math.hypot(dx, dz);
        const nx = run ? dx / run : Math.cos(c.doorFacingRad ?? 0);
        const nz = run ? dz / run : Math.sin(c.doorFacingRad ?? 0);
        return {
            buildingId: b.buildingId,
            base: Math.min(low, high) - .1,
            top: Math.max(low, high) + 4.5,
            evidence: c.evidence,
            outline: passageOutline(
                { x: c.from.x - nx * 2.5, z: c.from.z - nz * 2.5 },
                { x: c.to.x + nx * 2.5, z: c.to.z + nz * 2.5 },
                Math.max(5, (c.width ?? 3) + 2)
            )
        };
    });
}
