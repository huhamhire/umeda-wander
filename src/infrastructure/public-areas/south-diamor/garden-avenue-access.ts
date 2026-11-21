import { passageOutline } from '../../../domain/map/geometry.ts';
import type { MultiPolygon } from 'polygon-clipping';
import type { Evidence, Facility, FloorArea, LevelId, Point2, RouteNode, VerticalConnection, WalkwayCanopy } from '../../../domain/map/model.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

const blockId = 'hanshin-west-b1';
const underground = 'district-underground';
const ground = 'district-ground';
const westOwner = 'outer-underground';
const centralOwner = 'diamor-b1';
const signagePlan = 'https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000545/545556/12-4bessi2-2.pdf#page=9';

/** Align the western B1 spine with the mapped 6-13 junction and adjoining Garden Avenue (ガーデンアベニュー) axis. */
export function calibrateGardenAvenueOutline(network: MultiPolygon): MultiPolygon {
    // Shift the existing outline and its holes together, fading out before the separate north branch and the park landing.
    const shifts = [[-91, 0], [-72, 17], [-40, 24], [0, 26], [25, 36], [47, 31], [65, 17], [92, 0]] as const;
    return network.map(polygon => polygon.map(ring => ring.map(([x, z]) => {
        if (z <= 1032 || x <= shifts[0][0] || x >= shifts.at(-1)![0]) {
            return [x, z];
        }
        const index = shifts.findIndex(([east]) => x < east);
        const [west, start] = shifts[index - 1]!;
        const [east, end] = shifts[index]!;
        const offset = start + (end - start) * (x - west) / (east - west);
        return [x, z + offset * Math.min(1, (z - 1032) / 13)];
    })));
}

/** Keep the city corridor reference and the mapped steps, shaft and pedestrian approaches. */
function accessEvidence(node: string, ways: string[], detail: string): Evidence {
    return {
        source: 'district',
        pages: [9],
        urls: [
            signagePlan,
            'https://www.openstreetmap.org/node/' + node,
            ...ways.map(way => 'https://www.openstreetmap.org/way/' + way)
        ],
        detail
    };
}

/** Connect the mapped Garden Avenue (ガーデンアベニュー) stairs and street lift to the B1 public corridor. */
export function createGardenAvenueAccess() {
    const areas: FloorArea[] = [];
    const connections: VerticalConnection[] = [];
    const facilities: Facility[] = [];
    const canopies: WalkwayCanopy[] = [];

    /** Continue the walkable strip past both anchors so consecutive legs overlap at bends. */
    const passage = (
        id: string, name: string, level: LevelId, from: Point2, to: Point2, width: number, evidence: Evidence,
        owner = blockId, elevationOffset?: number
    ) => {
        const span = Math.hypot(to.x - from.x, to.z - from.z);
        const dx = (to.x - from.x) / span;
        const dz = (to.z - from.z) / span;
        areas.push({
            id, name, level, blockId: owner, kind: 'public', label: false, evidence, elevationOffset,
            outline: passageOutline(
                { x: from.x - .9 * dx, z: from.z - .9 * dz },
                { x: to.x + .9 * dx, z: to.z + .9 * dz },
                width
            )
        });
    };

    for (const item of [
        {
            number: '6-71', node: '12162921476', lon: 135.4948808, lat: 34.7002754,
            foot: { x: 350.1532, z: 863.0528 }, sidewalk: { x: 356.0009, z: 856.5183 },
            join: { x: 343.9212, z: 866.9824 }, ways: ['1314094124', '1314094123', '1322885759', '1322885760']
        },
        {
            number: '6-77', node: '5887068977', lon: 135.4950590, lat: 34.7002877,
            foot: { x: 380.1418, z: 851.3531 }, sidewalk: { x: 370.6611, z: 859.1455 },
            join: { x: 382.3289, z: 849.5052 }, ways: ['639381340', '639381341', '1322885761']
        }
    ]) {
        const id = 'garden-avenue-exit-' + item.number;
        const name = messageText('facilities.locations.gardenAvenueExit', { number: item.number });
        const evidence = accessEvidence(item.node, item.ways,
            'The city plan identifies the numbered exit. Shared OSM nodes tie the staircase to the street sidewalk and the B1 branch. Width, rise and intermediate landing are fitted.');
        const from: RouteNode = { id: id + '-b1', level: underground, ...item.foot };
        const to: RouteNode = { id: id + '-ground', level: ground, ...toGeographicPlan(item, geographicFrame) };
        connections.push({ id, kind: 'stairs', blockId, from, to, width: 2.2, stairLandingLength: 1.1, evidence });
        passage(id + '-b1-apron', name, underground, from, item.join, 3.7, evidence);
        passage(id + '-ground-apron', name, ground, to, item.sidewalk, 3.7, evidence);
        facilities.push({ id, name, kind: 'entrance', level: ground, x: to.x, z: to.z, connectionId: id, note: '', evidence });
    }

    const id = 'garden-avenue-lift-6-71';
    const name = messageText('facilities.locations.gardenAvenueExit', { number: '6-71' });
    const evidence = accessEvidence('5887068978', ['1316049308', '1322885759', '1322885760', '1318982038'],
        'The mapped 6-71 elevator has separate surface and B1 approaches. The B1 branch follows the shared junction with the numbered stair; widths and the shaft door angles are fitted.');
    const shaft = toGeographicPlan({ lon: 135.4946730, lat: 34.7001666 }, geographicFrame);
    const junction = { x: 343.9212, z: 866.9824 };
    const street = { x: 332.427, z: 875.777 };
    connections.push({
        id, kind: 'elevator', blockId, evidence,
        from: { id: id + '-b1', level: underground, ...shaft },
        to: { id: id + '-ground', level: ground, ...shaft },
        doorFacingRad: Math.atan2(street.z - shaft.z, street.x - shaft.x),
        lowerDoorFacingRad: Math.atan2(junction.z - shaft.z, junction.x - shaft.x)
    });
    passage(id + '-b1-apron', name, underground, shaft, junction, 4.2, evidence);
    passage(id + '-b1-branch', name, underground, junction, { x: 336.4722, z: 853.1565 }, 4, evidence);
    passage(id + '-ground-apron', name, ground, shaft, street, 4.2, evidence);

    const kitteId = 'garden-avenue-exit-6-58';
    const kitteName = messageText('facilities.locations.gardenAvenueExit', { number: '6-58' });
    const kitteEvidence: Evidence = {
        source: 'district',
        pages: [],
        urls: [
            'https://www.global-style.jp/archives/562222',
            'https://www.openstreetmap.org/node/12215503523',
            'https://www.openstreetmap.org/way/1473638614',
            'https://www.openstreetmap.org/way/1473638615',
            'https://www.openstreetmap.org/way/1459201009'
        ],
        detail: 'The KITTE Osaka (ＫＩＴＴＥ大阪) tenant guide names 6-58. OSM ties the stair foot to the two-leg underground branch and ties the numbered mouth to the outer sidewalk. Stair width and landing dimensions are fitted.'
    };
    const kitteFoot: RouteNode = { id: kitteId + '-b1', level: underground, x: 266.429, z: 888.356 };
    const kitteTop: RouteNode = { id: kitteId + '-ground', level: ground, x: 275.324, z: 879.695 };
    const kitteBend = { x: 255.749, z: 899.276 };
    const kitteSidewalkBend = { x: 280.65, z: 875.053 };
    passage(kitteId + '-b1-apron', kitteName, underground, kitteFoot, kitteBend, 4.4, kitteEvidence);
    passage(kitteId + '-b1-branch', kitteName, underground, kitteBend, { x: 267.435, z: 910.097 }, 4.4, kitteEvidence);
    passage(kitteId + '-ground-apron', kitteName, ground, kitteTop, kitteSidewalkBend, 3.7, kitteEvidence);
    passage(kitteId + '-ground-link', kitteName, ground, kitteSidewalkBend, { x: 279.167, z: 873.283 }, 3.7, kitteEvidence);
    connections.push({
        id: kitteId, kind: 'stairs', blockId, from: kitteFoot, to: kitteTop, width: 2.35, stairLandingLength: 1.35, evidence: kitteEvidence
    });
    facilities.push({
        id: kitteId, name: kitteName, kind: 'entrance', level: ground, x: kitteTop.x, z: kitteTop.z,
        connectionId: kitteId, note: '', evidence: kitteEvidence
    });

    const parkId = 'garden-avenue-exit-6-1';
    const parkOwner = westOwner;
    const parkName = messageText('facilities.locations.gardenAvenueExit', { number: '6-1' });
    const parkProof: Evidence = {
        source: 'district',
        pages: [1],
        urls: [
            'https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda01-4-2%28202109%29.pdf',
            'https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000545/545556/12-4bessi2-2.pdf#page=9',
            'https://yuruku-walk.hatenablog.jp/entry/240810',
            'https://www.openstreetmap.org/way/623352523',
            'https://www.openstreetmap.org/way/484570654'
        ],
        detail: 'The city map identifies the west terminal beside Nishi-Umeda Park (西梅田公園) with a street lift. Published access photos show a roof over the western stair and adjoining up escalator. Equipment positions are fitted between the city plan terminal bay and the OSM park-side sidewalk; the shaft is independently shown.'
    };
    const parkFoot: RouteNode = { id: parkId + '-b1', level: underground, x: -83.5, z: 1148.3 };
    const parkTop: RouteNode = { id: parkId + '-ground', level: ground, x: -72.8, z: 1155.5 };
    const escalatorFoot: RouteNode = { id: parkId + '-escalator-b1', level: underground, x: -81.9, z: 1145.9 };
    const escalatorTop: RouteNode = { id: parkId + '-escalator-ground', level: ground, x: -71.2, z: 1153.1 };
    const parkLift = { x: -78.3, z: 1158.8 };
    const parkSidewalk = { x: -73.466, z: 1165.832 };
    const terminal = { x: -89.4, z: 1150.1 };
    passage(parkId + '-b1-apron', parkName, underground, parkFoot, terminal, 4.5, parkProof, parkOwner);
    passage(parkId + '-escalator-b1-apron', parkName, underground, escalatorFoot, parkFoot, 3.3, parkProof, parkOwner);
    passage(parkId + '-street-apron', parkName, ground, parkTop, parkSidewalk, 4.6, parkProof, parkOwner);
    passage(parkId + '-escalator-street-apron', parkName, ground, escalatorTop, { x: -71.2, z: 1158.6 }, 3.2, parkProof, parkOwner);
    passage(parkId + '-lift-b1-apron', parkName, underground, parkLift, terminal, 4.2, parkProof, parkOwner);
    passage(parkId + '-lift-street-apron', parkName, ground, parkLift, parkSidewalk, 4.2, parkProof, parkOwner);
    connections.push(
        {
            id: parkId, kind: 'stairs', blockId: parkOwner, from: parkFoot, to: parkTop, width: 2.8,
            stairLandingLength: 1.3, evidence: parkProof
        },
        {
            id: parkId + '-escalator', kind: 'escalator', blockId: parkOwner, from: escalatorFoot, to: escalatorTop,
            width: 1.85, travelDirection: 'from-to', evidence: parkProof
        },
        {
            id: 'garden-avenue-lift-6-1', kind: 'elevator', blockId: parkOwner, evidence: parkProof,
            from: { id: 'garden-avenue-lift-6-1-b1', level: underground, ...parkLift },
            to: { id: 'garden-avenue-lift-6-1-ground', level: ground, ...parkLift },
            doorFacingRad: Math.atan2(parkSidewalk.z - parkLift.z, parkSidewalk.x - parkLift.x),
            lowerDoorFacingRad: Math.atan2(terminal.z - parkLift.z, terminal.x - parkLift.x)
        }
    );
    canopies.push({
        id: parkId + '-canopy', level: ground,
        points: [{ x: -82.7, z: 1147.1 }, { x: -72, z: 1154.3 }],
        width: 5.8, clearHeight: 2.9, postClearances: [{ point: parkTop, radius: 2 }], evidence: parkProof
    });
    facilities.push({
        id: parkId, name: parkName, kind: 'entrance', level: ground, x: parkTop.x, z: parkTop.z,
        connectionId: parkId, note: '', evidence: parkProof
    });

    for (const item of [
        {
            number: '6-20', node: '5887069653', owner: westOwner,
            top: { x: 49.792, z: 1078.713 }, sidewalk: { x: 44.786, z: 1082.576 },
            foot: { x: 56.5, z: 1073.5 }, joins: [{ x: 57.5, z: 1078.5 }],
            ways: ['623352521', '553431514', '1318982038'],
            detail: 'The city plan places the entrance on the north side of the corridor. The runway follows the mapped steps; the foot and return into the realigned B1 bay are fitted.'
        },
        {
            number: '6-36', node: '5887069628', owner: centralOwner,
            top: { x: 143.683, z: 1000.366 }, sidewalk: { x: 141.322, z: 1002.036 },
            foot: { x: 150.45, z: 995.08 }, joins: [{ x: 153, z: 993 }],
            ways: ['639381333', '1314270881'],
            detail: 'The mapped street mouth and step axis anchor the entrance. The lower runway is extended within the indicated B1 branch to fit the schematic rise.'
        },
        {
            number: '6-46', node: '5887069641', owner: centralOwner,
            top: { x: 210.121, z: 951.986 }, sidewalk: { x: 215.575, z: 947.545 },
            foot: { x: 201.6, z: 958.8 }, joins: [{ x: 206, z: 959 }],
            ways: ['623352516', '553431514'],
            sources: ['https://yume-kana.co.jp/231105umeda/'],
            detail: 'The public walking instructions confirm the street access. OSM fixes the sidewalk and stair heading; the lower return is fitted into the north branch.'
        },
        {
            number: '6-13', node: '5887069663', owner: westOwner,
            top: { x: 28.973, z: 1137.924 }, sidewalk: { x: 24.135, z: 1142.41 },
            foot: { x: 30.364, z: 1123.831 }, turn: { x: 31.31, z: 1129.88, rise: 3.6 },
            joins: [{ x: 30.62, z: 1121.79 }, { x: 32.32, z: 1116.65 }, { x: 26.49, z: 1116.58 }, { x: 24.96, z: 1112.73 }],
            ways: ['1323837456', '813837089', '813837083', '813837082', '1318982038'],
            sources: ['https://hanshin-enkachi.com/parkguide/'],
            detail: 'The park guide confirms the numbered public access. The modeled flight follows the mapped bend to the park path. The B1 branch follows the mapped line to its shared Garden Avenue (ガーデンアベニュー) axis.'
        },
        {
            number: '6-19', node: '5887069652', owner: westOwner,
            top: { x: 61.469, z: 1093.853 }, sidewalk: { x: 58.385, z: 1101.367 },
            foot: { x: 70.1, z: 1087.0 }, joins: [{ x: 72.4, z: 1081.8 }, { x: 70.5, z: 1072.5 }],
            ways: ['623352522', '623352519', '1318982038'],
            sources: ['https://stg.www.2nd-inn.com/access/'],
            detail: 'Hotel access photos confirm the stair from Garden Avenue (ガーデンアベニュー) to the street. The city plan puts its short branch opposite 6-20. The stair axis follows OSM; the lower return is fitted.'
        },
        {
            number: '6-40', node: '5887069632', owner: centralOwner,
            top: { x: 164.521, z: 982.41 }, sidewalk: { x: 162.507, z: 979.828 },
            foot: { x: 171.4, z: 977 }, joins: [{ x: 174.2, z: 974.8 }],
            ways: ['623352512', '623352511'],
            detail: 'Use the numbered mouth sharing a sidewalk vertex and the short stair on the city branch. Extend the lower runway within the B1 outline. The second OSM label is kept out of this connection.'
        },
        {
            number: '6-48', node: '5887069635', owner: centralOwner,
            top: { x: 195.534, z: 946.91 }, sidewalk: { x: 198.17, z: 950.239 },
            foot: { x: 201.254, z: 939.541 }, turn: { x: 195.305, z: 944.272, rise: 5.9 },
            joins: [{ x: 207.6, z: 934.5 }, { x: 215, z: 931.5 }],
            ways: ['623352514', '1316049318', '623352513'],
            sources: ['https://www.bayer.jp/sites/bayer_jp/files/access-map-jp-underground.pdf'],
            detail: 'Two mapped flights share the numbered turn. The city plan identifies the northward underground branch; the short lower approach is fitted to that branch.'
        }
    ]) {
        const id = 'garden-avenue-exit-' + item.number;
        const name = messageText('facilities.locations.gardenAvenueExit', { number: item.number });
        const evidence = accessEvidence(item.node, item.ways, item.detail);
        evidence.urls!.push(...item.sources ?? []);
        const from: RouteNode = { id: id + '-b1', level: underground, ...item.foot };
        const to: RouteNode = { id: id + '-ground', level: ground, ...item.top };
        const stair = { kind: 'stairs', blockId: item.owner, width: 2.2, evidence } as const;
        let start: Point2 = from;
        for (const [i, join] of item.joins.entries()) {
            passage(id + '-b1-apron-' + i, name, underground, start, join, 3.8, evidence, item.owner);
            start = join;
        }
        passage(id + '-ground-apron', name, ground, to, item.sidewalk, 3.6, evidence, item.owner);
        if (item.turn) {
            const { x, z, rise } = item.turn;
            const turn: RouteNode = { id: id + '-turn', level: underground, elevationOffset: rise, x, z };
            passage(id + '-turn-apron', name, underground, { x: x - .65, z }, { x: x + .65, z },
                3.1, evidence, item.owner, rise);
            // The lower flight ends on a freestanding landing. Its upper counterpart cuts the street.
            connections.push(
                { ...stair, id: id + '-lower', from, to: turn, placement: 'exterior' },
                { ...stair, id, from: turn, to }
            );
        } else {
            connections.push({ ...stair, id, from, to, stairLandingLength: 1.15 });
        }
        facilities.push({ id, name, kind: 'entrance', level: ground, x: to.x, z: to.z, connectionId: id, note: '', evidence });
    }

    return { areas, connections, facilities, canopies };
}
