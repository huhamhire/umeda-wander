import { passageOutline } from '../../../domain/map/geometry.ts';
import type { Evidence, Facility, FloorArea, Point2, VerticalConnection, WalkwayCanopy } from '../../../domain/map/model.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

const operatorPlan = 'https://www.oud.co.jp/pdf/hinankeikaku.pdf#page=40';
const d22Survey = 'https://ocu-omu.repo.nii.ac.jp/record/2011144/files/111G0000009-2013-018.pdf';
const d31BusGuide = 'https://www.hankyu-kankobus.co.jp/limousine/busstop/12322/';

/** Align the street stairs around the Diamor (ディアモール大阪) circular plaza and the west side of DT Tower (梅田DTタワー). */
export function createDiamorCentralAccess() {
    const areas: FloorArea[] = [];
    const connections: VerticalConnection[] = [];
    const canopies: WalkwayCanopy[] = [];
    for (const entrance of [
        {
            number: 'D-22', blockId: 'hanshin-west-b1', lon: 135.4972766, lat: 34.7008440, node: '9677032133',
            ways: ['1053003667', '1053003665', '618802487'], source: d22Survey,
            foot: { x: 567.4, z: 784.9 }, join: { x: 559, z: 782 },
            street: { x: 575.3, z: 798.2 }, width: 2.45
        },
        {
            number: 'D-27', blockId: 'hanshin-west-b1', lon: 135.4970799, lat: 34.7005309, node: '12183322082',
            ways: ['1316299615', '1316299616', '1316299617', '1322885769', '618802482', '618802485'],
            foot: { x: 555.1, z: 839.7 }, join: { x: 559, z: 841 },
            street: { x: 556.9, z: 829.1 }, width: 2.9,
            roof: { points: [{ x: 555.5, z: 833.8 }, { x: 555.3, z: 837 }], width: 4.65 }
        },
        {
            number: 'D-31', blockId: 'hanshin-west-b1', lon: 135.4968916, lat: 34.7002097, node: '5884732792',
            ways: ['623086752', '623086754'], source: d31BusGuide,
            foot: { x: 546.4, z: 863.1 }, join: { x: 557.4, z: 862.1 },
            street: { x: 540.1, z: 868.8 }, width: 2.45
        },
        {
            number: 'D-33', blockId: 'hanshin-west-b1', lon: 135.4972166, lat: 34.7002488, node: '5848795583',
            ways: ['618802475', '618802472'],
            foot: { x: 571.5, z: 873.1 }, join: { x: 575, z: 873.6 },
            street: { x: 566.95, z: 863.03 }, width: 2.3,
            roof: { points: [{ x: 570.47, z: 861.75 }, { x: 570.61, z: 871.55 }], width: 2.95 }
        },
        {
            number: 'D-39', blockId: 'hanshin-west-b1', lon: 135.4972236, lat: 34.6998650, node: '5848795515',
            ways: ['618802442', '618802440'],
            foot: { x: 569.7, z: 897.2 }, join: { x: 575.5, z: 897.2 },
            street: { x: 566.32, z: 905.6 }, width: 2.25
        },
        {
            number: 'D-41', blockId: 'diamor-b1', lon: 135.4972208, lat: 34.6997557, node: '5848795512',
            ways: ['618802441', '618802439'],
            foot: { x: 569.4, z: 926.4 }, join: { x: 575.7, z: 926.4 },
            street: { x: 566.1, z: 917.6 }, width: 2.25
        },
        {
            number: 'D-44', blockId: 'diamor-b1', lon: 135.4975893, lat: 34.6995237, node: '5852387932',
            ways: ['619294225', '619294223'],
            foot: { x: 594.4, z: 943.7 }, join: { x: 598, z: 949.5 },
            street: { x: 602.98, z: 940.7 }, width: 2.3
        }
    ] as const) {
        const { blockId } = entrance;
        const id = 'diamor-exit-' + entrance.number.toLowerCase();
        const name = messageText('facilities.locations.diamorExit', { number: entrance.number });
        const urls = [
            'https://www.openstreetmap.org/node/' + entrance.node,
            ...entrance.ways.map(way => 'https://www.openstreetmap.org/way/' + way)
        ];
        if (entrance.number !== 'D-22') {
            urls.unshift(operatorPlan);
        }
        if (entrance.source) {
            urls.push(entrance.source);
        }
        const evidence: Evidence = {
            source: 'district',
            pages: entrance.number === 'D-22' ? [] : [40],
            urls,
            detail: 'OSM locates the street mouth and its sidewalk. The identified B1 approach anchors the fitted apron. Stair width, intermediate rise and tread geometry are schematic.'
        };
        const from = { id: id + '-b1', level: 'district-underground' as const, ...entrance.foot };
        const to = { id: id + '-ground', level: 'district-ground' as const, ...toGeographicPlan(entrance, geographicFrame) };
        /** Place a short apron from the connection end toward the adjacent walking surface. */
        const apron = (suffix: string, end: typeof from | typeof to, approach: Point2, width: number) => {
            const dx = end.x - approach.x;
            const dz = end.z - approach.z;
            const run = Math.hypot(dx, dz);
            const start = { x: end.x + dx / run * 1.25, z: end.z + dz / run * 1.25 };
            const finish = { x: approach.x - dx / run * 0.6, z: approach.z - dz / run * 0.6 };
            areas.push({
                id: id + suffix, name, level: end.level, blockId, kind: 'public', label: false,
                outline: passageOutline(start, finish, width), evidence
            });
        };
        apron('-b1-apron', from, entrance.join, 3.8);
        apron('-street-apron', to, entrance.street, 4);
        connections.push({
            id, kind: 'stairs', blockId, from, to, width: entrance.width, stairLandingLength: 1.35, evidence
        });
        if (entrance.roof) {
            canopies.push({
                id: id + '-canopy', level: to.level, points: [...entrance.roof.points],
                width: entrance.roof.width, clearHeight: 2.8,
                postClearances: [{ point: to, radius: 2 }], evidence
            });
        }
    }
    const d40 = createD40Stairs();
    return {
        areas: [...areas, ...d40.areas],
        connections: [...connections, ...d40.connections],
        canopies,
        facilities: [d40.facility]
    };
}

/** Model the mapped bend and immediate B1 approach alongside Umeda DT Tower (梅田DTタワー). */
function createD40Stairs() {
    const id = 'diamor-exit-d-40';
    const blockId = 'diamor-b1';
    const name = messageText('facilities.locations.diamorExit', { number: 'D-40' });
    const evidence: Evidence = {
        source: 'district',
        pages: [],
        urls: [
            'https://www.openstreetmap.org/node/5884732789', 'https://www.openstreetmap.org/way/623086749',
            'https://www.openstreetmap.org/way/623086751', 'https://www.openstreetmap.org/way/1313639762',
            'https://www.kyobi.ac.jp/img/pdf/kyobikiyou2022.pdf'
        ],
        detail: 'OSM connects the bent stair line to the west-side B1 path and the street sidewalk. Flight widths and intermediate elevation are fitted. The extent stops at the mapped lower approach.'
    };
    const from = {
        id: id + '-b1', level: 'district-underground' as const,
        ...toGeographicPlan({ lon: 135.4974129, lat: 34.6996501 }, geographicFrame)
    };
    const turn = {
        id: id + '-turn', level: from.level, elevationOffset: 4.45,
        ...toGeographicPlan({ lon: 135.4974136, lat: 34.6996044 }, geographicFrame)
    };
    const to = {
        id: id + '-ground', level: 'district-ground' as const,
        ...toGeographicPlan({ lon: 135.4974440, lat: 34.6995785 }, geographicFrame)
    };
    const sidewalk = toGeographicPlan({ lon: 135.4974444, lat: 34.6995478 }, geographicFrame);
    const apronEnd = toGeographicPlan({ lon: 135.4974126, lat: 34.6996877 }, geographicFrame);
    const areas: FloorArea[] = [
        {
            id: id + '-b1-apron', name, level: from.level, blockId, kind: 'public', label: false, evidence,
            outline: passageOutline(apronEnd, { x: from.x, z: from.z + 1.1 }, 2.8)
        },
        {
            id: id + '-turn-apron', name, level: turn.level, blockId, kind: 'public', label: false, evidence,
            elevationOffset: turn.elevationOffset,
            outline: passageOutline({ x: turn.x, z: turn.z - 1.45 }, { x: turn.x, z: turn.z + 1.45 }, 2.9)
        },
        {
            id: id + '-street-apron', name, level: to.level, blockId, kind: 'public', label: false, evidence,
            outline: passageOutline({ x: to.x, z: to.z - 1.35 }, sidewalk, 3.6)
        }
    ];
    const connections: VerticalConnection[] = [
        { id: id + '-lower', kind: 'stairs', blockId, from, to: turn, width: 2.2, placement: 'exterior', evidence },
        { id, kind: 'stairs', blockId, from: turn, to, width: 2.2, evidence }
    ];
    const facility: Facility = {
        ...to, id, name, kind: 'stairs', note: '', evidence
    };
    return { areas, connections, facility };
}
