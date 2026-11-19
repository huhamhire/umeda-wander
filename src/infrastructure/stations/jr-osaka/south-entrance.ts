import { messageText } from '../../i18n/index.ts';
import type { StationMap, Point2, VerticalConnection } from '../../../domain/map/model.ts';
import type { BuildingEntrance } from '../../buildings/building-data.ts';

/** JR public entrance landings share the commercial facade's explicit entrance interface. */
export function applySouthEntrance(station: StationMap, e: BuildingEntrance): void {
    const c = Math.cos(e.angle);
    const s = Math.sin(e.angle);
    const point = (u: number, v: number): Point2 => ({ x: e.center.x + u * c - v * s, z: e.center.z + u * s + v * c });
    const proof = {
        source: 'district' as const,
        pages: [],
        urls: ['https://osakastationcity.com/guide/'],
        detail: 'Osaka Station City (大阪ステーションシティ) 2F and 3F plans and the user facade photo show the South Gate forecourt and the public approach between stair banks. The outlines and elevations are schematic.'
    };
    station.layout.areas = station.layout.areas.filter(a => !['south-building-2f', 'south-gate-west-escalator-ground'].includes(a.id));
    station.layout.areas.push(
        {
            id: 'south-entrance-ground',
            level: 'concourse',
            name: messageText('stations.jrOsaka.entities.southEntranceGround.name'),
            kind: 'public',
            label: false,
            elevationOffset: 1.3,
            evidence: proof,
            outline: [[-24, -14], [24, -14], [24, 7], [-24, 7]].map(([u, v]) => point(u!, v!))
        },
        {
            id: 'south-entrance-deck',
            level: 'south-deck',
            name: messageText('stations.jrOsaka.entities.southEntranceDeck.name'),
            kind: 'public',
            label: false,
            evidence: proof,
            outline: [
                [-24, -26],
                [-19, -34],
                [20, -34],
                [24, -26],
                [24, 3],
                [10, 3],
                ...Array.from(
                    { length: 17 },
                    (_, i) => {
                        const u = 10 - i * 20 / 16;
                        return [u, -7 + 5 * (u / 10) ** 2];
                    }
                ),
                [-10, 3],
                [-24, 3]
            ].map(([u, v]) => point(u!, v!))
        },
        {
            id: 'south-building-upper-landing',
            level: 'platform',
            name: messageText('stations.jrOsaka.entities.southBuildingUpperLanding.name'),
            kind: 'public',
            label: false,
            evidence: proof,
            // Continue the public 3F landing to the inner lobby before turning toward the bridge bank.
            outline: [[-11, -48], [14, -48], [23, -32], [23, -17], [-10, -17]].map(([u, v]) => point(u!, v!))
        }
    );
    const existing = station.layout.connections.find(c => c.id === 'south-building-61')!;
    const move = (n: typeof existing.from, u: number, v: number) => {
        Object.assign(n, point(u, v));
        Object.assign(station.nodes.find(p => p.id === n.id) ?? {}, n);
    };
    move(existing.from, -15, 2);
    move(existing.to, -15, -3);
    existing.lanes = 2;
    const east: VerticalConnection = {
        ...existing,
        id: 'south-entrance-east-escalators',
        evidence: proof,
        from: { ...existing.from, id: 'south-entrance-east-low', ...point(15, 2) },
        to: { ...existing.to, id: 'south-entrance-east-high', ...point(15, -3) }
    };
    station.layout.connections.push(east);
    station.nodes.push(east.from, east.to);
    const lift = station.layout.connections.find(c => c.id === 'south-lift-u')!;
    move(lift.from, -20, -10);
    move(lift.to, -20, -10);
    const bank50 = station.layout.connections.find(c => c.id === 'south-building-50')!;
    move(bank50.from, 4, -12);
    move(bank50.to, 4, -20);
    const liftT = station.layout.connections.find(c => c.id === 'south-lift-t')!;
    move(liftT.from, 16, -20);
    move(liftT.to, 16, -20);
    // Compatibility-view apertures must not cut unrelated positions in metre coordinates.
    station.layout.atria = station.layout.atria?.filter(a => !['south-gate-curved-setback', 'south-building-50-open-bay', 'south-building-t-open-bay'].includes(a.id));
}
