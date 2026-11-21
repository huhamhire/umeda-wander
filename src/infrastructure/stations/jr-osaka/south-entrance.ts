import { messageText } from '../../i18n/index.ts';
import type { StationMap, Point2, VerticalConnection } from '../../../domain/map/model.ts';
import type { BuildingEntrance } from '../../buildings/building-data.ts';
import { passageOutline } from '../../../domain/map/geometry.ts';

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
    // Fit the OSM indoor corridor from the raised Central South Exit to the ground arcade.
    const passage = passageOutline(point(-4.1, -61), point(-6.8, -10.7), 5);
    const passageProof = {
        source: 'district' as const,
        pages: [],
        urls: [
            'https://osakastationcity.com/guide/?floor1F=',
            'https://www.openstreetmap.org/way/557170595',
            'https://www.openstreetmap.org/way/330561968'
        ],
        detail: 'The South Gate Building (サウスゲートビルディング) ground plan shows the public passage from the JR Central Concourse to South Gate Plaza. OSM indoor corridor and arcade locate its axis. The fitted width and continuity at the raised model elevation are schematic.'
    };
    station.layout.areas = station.layout.areas.filter(a => !['south-building-2f', 'south-gate-west-escalator-ground'].includes(a.id));
    station.layout.areas.push(
        {
            id: 'south-entrance-ground-passage',
            level: 'concourse',
            name: messageText('stations.jrOsaka.entities.southEntranceGround.name'),
            kind: 'public',
            label: false,
            elevationOffset: 1.3,
            evidence: passageProof,
            outline: passage
        },
        {
            id: 'south-entrance-ground-passage-base',
            level: 'concourse',
            name: messageText('stations.jrOsaka.entities.southEntranceGround.name'),
            kind: 'service',
            label: false,
            height: 1.3,
            evidence: passageProof,
            outline: passageOutline(point(-4.42, -55), point(-6.8, -10.7), 5)
        },
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
    const directB1 = {
        source: 'jr' as const,
        pages: [4, 5, 6],
        urls: ['https://osakastationcity.com/guide/?floor2F='],
        detail: 'South Gate Plaza (南ゲート広場): east escalator 62 runs directly between building 2F and B1; adjacent stair 74 serves 1F and B1. The two banks and their landings are fitted to the public floors.'
    };
    const east: VerticalConnection = {
        ...existing,
        id: 'south-entrance-east-escalators',
        evidence: directB1,
        from: { level: 'underground-hall', id: 'south-entrance-east-low', ...point(14, 15) },
        to: { ...existing.to, id: 'south-entrance-east-high', ...point(15, -3) }
    };
    const eastStairs: VerticalConnection = {
        id: 'south-plaza-stairs-74',
        kind: 'stairs',
        width: 2.8,
        from: { level: 'underground-hall', id: 'south-plaza-stairs-74-low', ...point(17, 18.5) },
        to: { level: 'concourse', id: 'south-plaza-stairs-74-high', elevationOffset: 1.3, ...point(22.5, 6.9) },
        evidence: directB1
    };
    station.layout.connections.push(east, eastStairs);
    station.nodes.push(east.from, east.to, eastStairs.from, eastStairs.to);
    const lift = station.layout.connections.find(c => c.id === 'south-lift-u')!;
    move(lift.from, -20, -10);
    move(lift.to, -20, -10);
    const bank50 = station.layout.connections.find(c => c.id === 'south-building-50')!;
    move(bank50.from, 4, -12);
    move(bank50.to, 4, -20);
    const bank50Evidence = {
        source: 'jr' as const,
        pages: [3, 4],
        urls: ['https://osakastationcity.com/guide/?floor2F=', 'https://osakastationcity.com/guide/?floor3F='],
        detail: 'South Gate Building (サウスゲートビルディング) 2F/3F bank 50: two escalator lanes sit east of the adjacent stair. Landing positions and widths are fitted.'
    };
    Object.assign(bank50, { lanes: 2, width: 2, laneSpacing: 2.15, evidence: bank50Evidence });
    const stairs50: VerticalConnection = {
        id: 'south-building-stairs-50',
        kind: 'stairs',
        width: 3.3,
        from: { ...bank50.from, id: 'south-building-stairs-50-low', ...point(-.4, -12) },
        to: { ...bank50.to, id: 'south-building-stairs-50-high', ...point(-.4, -20) },
        evidence: bank50Evidence
    };
    station.layout.connections.push(stairs50);
    station.nodes.push(stairs50.from, stairs50.to);
    const liftT = station.layout.connections.find(c => c.id === 'south-lift-t')!;
    move(liftT.from, 16, -20);
    move(liftT.to, 16, -20);
    // Compatibility-view apertures must not cut unrelated positions in metre coordinates.
    station.layout.atria = station.layout.atria?.filter(a => !['south-gate-curved-setback', 'south-building-50-open-bay', 'south-building-t-open-bay'].includes(a.id));
    // Bank 62 passes through the raised plaza slab without making a 1F stop.
    station.layout.atria?.push({
        id: 'south-plaza-62-slot',
        name: messageText('stations.jrOsaka.entities.southEntranceGround.name'),
        openings: [{ level: 'concourse', outline: passageOutline(point(14.8, .7), point(14.4, 6.2), 5.5) }],
        evidence: directB1
    });
}
