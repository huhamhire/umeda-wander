import type { Evidence, StationMap } from '../../../domain/map/model.ts';
import { passageOutline } from '../../../domain/map/geometry.ts';
import { jrAxisPoint } from './ground-frame.ts';

const evidence: Evidence = {
    source: 'jr',
    pages: [2, 3],
    urls: ['https://osakastationcity.com/guide/?floor3F='],
    detail: 'JR Osaka (大阪) and Osaka Station City (大阪ステーションシティ) plans show the diagonal 15 bank, its staggered western stair 16, elevator I and the separate level route to South Gate Building 4F. Relative positions follow the plans; widths and edge coordinates are fitted.'
};

/** Fit the south bridge and lower Daimaru (大丸) lobby in the railway frame. */
export function applySouthBridge(station: StationMap): void {
    const { areas, connections } = station.layout;
    const bridge = areas.find(area => area.id === 'bridge-south')!;
    bridge.outline = [
        [-39, 45], [-9.5, 45], [-7, 47.5], [-12.5, 52.9], [-17.3, 57.7],
        [-20.5, 52.55], [-25.5, 57.55], [-39, 57.55]
    ].map(([along, across]) => jrAxisPoint(along!, across!));
    bridge.evidence = evidence;
    const lobby = areas.find(area => area.id === 'south-building-3f')!;
    lobby.outline = [
        [-39, 59], [-28, 59], [-24.5, 62.5], [-16, 62.5], [-12, 61],
        [-4, 61], [1, 65], [32, 65], [32, 74], [23, 79], [12, 79],
        [10, 88], [-16, 88], [-18, 80], [-29, 80], [-39, 74]
    ].map(([along, across]) => jrAxisPoint(along!, across!));
    lobby.evidence = evidence;
    const liftBay = areas.find(area => area.id === 'south-building-3f-lift-bay')!;
    liftBay.outline = [[-39, 51], [-27, 51], [-27, 64], [-39, 64]]
        .map(([along, across]) => jrAxisPoint(along!, across!));
    liftBay.evidence = evidence;

    const fourthFloor = areas.find(area => area.id === 'south-building-4f')!;
    fourthFloor.outline = [[9, 72], [33, 72], [33, 81], [16, 81], [9, 78]]
        .map(([along, across]) => jrAxisPoint(along!, across!));
    fourthFloor.evidence = evidence;
    const link = areas.find(area => area.id === 'south-bridge-4f-link')!;
    link.outline = passageOutline(jrAxisPoint(-12, 46.6), jrAxisPoint(13, 75), 5.5);
    link.evidence = evidence;

    for (const [id, from, to] of [
        ['south-15', jrAxisPoint(-6, 64), jrAxisPoint(-15, 55)],
        ['south-stairs-16', jrAxisPoint(-13.5, 64.5), jrAxisPoint(-23, 55)],
        ['south-lift-i', jrAxisPoint(-33, 54.5), jrAxisPoint(-33, 54.5)]
    ] as const) {
        const connection = connections.find(item => item.id === id)!;
        Object.assign(connection.from, from);
        Object.assign(connection.to, to);
        connection.evidence = evidence;
    }
    const escalator = connections.find(connection => connection.id === 'south-15')!;
    escalator.lanes = 2;
    escalator.width = 2.15;
    escalator.laneSpacing = 2.3;
    const stair = connections.find(connection => connection.id === 'south-stairs-16')!;
    stair.width = 4.6;
    const access = station.facilities.find(facility => facility.id === 'south-bridge-access')!;
    Object.assign(access, jrAxisPoint(-24, 50));
    access.evidence = evidence;
}
