import { passageOutline } from '../../../domain/map/geometry.ts';
import type { Evidence, Facility, FloorArea, Point2, RouteNode, VerticalConnection, WalkwayCanopy } from '../../../domain/map/model.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

const blockId = 'diamor-b1';
const operatorPlan = 'https://www.oud.co.jp/pdf/hinankeikaku.pdf#page=40';

/** Project a reviewed street entrance or lift from the source coordinates. */
const project = (lon: number, lat: number) => toGeographicPlan({ lon, lat }, geographicFrame);

/** Name a numbered exit separately from the elevator equipment. */
const exitName = (number: string) => messageText('facilities.locations.diamorExit', { number });

/** Preserve the operator's B1 interface and the OSM assets that locate the street end. */
const evidenceFor = (node: string, ways: readonly string[], detail: string): Evidence => ({
    source: 'district',
    pages: [40],
    urls: [
        operatorPlan,
        'https://www.openstreetmap.org/node/' + node,
        ...ways.map(way => 'https://www.openstreetmap.org/way/' + way)
    ],
    detail
});

/** Connect the mapped eastern exits of Diamor Osaka (ディアモール大阪) to their identified public approaches. */
export function createDiamorEastAccess() {
    const areas: FloorArea[] = [];
    const connections: VerticalConnection[] = [];
    const canopies: WalkwayCanopy[] = [];
    const facilities: Facility[] = [];

    /** Make the numbered street mouth available as a walking destination. */
    const entrance = (id: string, number: string, point: Point2, evidence: Evidence, connectionId?: string) => {
        facilities.push({
            id, kind: 'entrance', level: 'district-ground', name: exitName(number),
            x: point.x, z: point.z, note: '', evidence, connectionId
        });
    };

    /** Extend a landing slightly past its anchor and overlap the mapped approach. */
    const apron = (id: string, name: string, owner: string, end: RouteNode, approach: Point2, width: number, evidence: Evidence) => {
        const dx = approach.x - end.x;
        const dz = approach.z - end.z;
        const run = Math.hypot(dx, dz);
        areas.push({
            id, name, blockId: owner, level: end.level, elevationOffset: end.elevationOffset,
            kind: 'public', label: false, evidence,
            outline: passageOutline(
                { x: end.x - dx / run * 1.3, z: end.z - dz / run * 1.3 },
                { x: approach.x + dx / run * 0.35, z: approach.z + dz / run * 0.35 },
                width
            )
        });
    };

    const stairs = [
        {
            number: '10-18', node: '5884709881', lon: 135.4987500, lat: 34.6995251,
            ways: ['623086695', '623086694'], foot: { x: 700.54, z: 943.49 },
            hall: { x: 703, z: 953 }, sidewalk: { x: 709.16, z: 940.55 }
        },
        {
            number: '10-22', node: '5884709877', lon: 135.4988959, lat: 34.6995247,
            ways: ['623086693', '623086692'], foot: { x: 714.72, z: 943.46 },
            hall: { x: 721, z: 950 }, sidewalk: { x: 722.36, z: 940.56 }
        },
        {
            number: 'E-8', node: '5848795573', lon: 135.4979930, lat: 34.7001899,
            ways: ['618802469', '618802468'], foot: { x: 633.19, z: 864.69 },
            hall: { x: 631, z: 872 }, sidewalk: { x: 641.87, z: 866.77 }, owner: 'hanshin-west-b1'
        },
        {
            number: 'E-14', node: '5848795566', lon: 135.4983550, lat: 34.7000943,
            ways: ['618802467', '618802466'], foot: { x: 664.06, z: 881.15 },
            hall: { x: 647, z: 884 }, sidewalk: { x: 673.32, z: 881.33 }, owner: 'hanshin-west-b1',
            roofWidth: 3
        },
        {
            number: 'E-13', node: '5848795559', lon: 135.4980755, lat: 34.6997155,
            ways: ['618802460', '618802456', '618802458'], foot: { x: 653.49, z: 919.19 },
            hall: { x: 666, z: 919 }, sidewalk: { x: 643.84, z: 923.57 }
        },
        {
            number: 'E-17', node: '5848795557', lon: 135.4982126, lat: 34.6996302,
            ways: ['618802459', '618802455', '618802458'], foot: { x: 656.70, z: 924.84 },
            hall: { x: 672, z: 926 }, sidewalk: { x: 659.26, z: 937.20 }
        },
        {
            number: 'E-20', node: '5848795565', lon: 135.4982736, lat: 34.6997662,
            ways: ['618802465', '618802464'], foot: { x: 670.32, z: 926.16 },
            hall: { x: 671, z: 925 }, sidewalk: { x: 668.19, z: 915.50 }
        },
        {
            number: 'E-34', node: '5852387961', lon: 135.4987698, lat: 34.6986647,
            ways: ['623086700', '623086697'], foot: { x: 708.64, z: 1031.52 },
            hall: { x: 705, z: 1030 }, sidewalk: { x: 713.60, z: 1038.34 }
        },
        {
            number: 'E-35', node: '5852387965', lon: 135.4986522, lat: 34.6986333,
            ways: ['623086698', '623086696'], foot: { x: 697.84, z: 1034.98 },
            hall: { x: 704, z: 1035 }, sidewalk: { x: 697.07, z: 1043.76 }
        }
    ];
    for (const stair of stairs) {
        const id = 'diamor-exit-' + stair.number.toLowerCase();
        const owner = stair.owner ?? blockId;
        const name = exitName(stair.number);
        const evidence = evidenceFor(stair.node, stair.ways, stair.roofWidth
            ? 'The operator plan fixes the B1 branch. OSM fixes the street mouth and canopy axis; the stair and B1 apron are fitted.'
            : 'The operator plan fixes the B1 branch and OSM fixes the street mouth and stair axis. The B1 apron, stair width and intermediate landing are fitted.');
        const from = { id: id + '-b1', level: 'district-underground' as const, ...stair.foot };
        const to = { id: id + '-ground', level: 'district-ground' as const, ...project(stair.lon, stair.lat) };
        apron(id + '-b1-apron', name, owner, from, stair.hall, 3.4, evidence);
        apron(id + '-street-apron', name, owner, to, stair.sidewalk, 3.5, evidence);
        connections.push({
            id, kind: 'stairs', blockId: owner, from, to, width: 2.1, stairLandingLength: 1.2,
            openingWidth: stair.roofWidth ? 2.4 : undefined, evidence
        });
        entrance(id, stair.number, to, evidence, id);
        if (stair.roofWidth) {
            canopies.push({
                id: id + '-canopy', level: to.level, points: [from, to], width: stair.roofWidth, clearHeight: 2.8,
                postClearances: [{ point: to, radius: 2 }], evidence
            });
        }
    }

    // E-26 and 10-21 share the mapped lower flight and junction between Osaka Ekimae Buildings (大阪駅前ビル).
    const sharedId = 'diamor-exit-e-26-lower';
    const branchEvidence = evidenceFor('5852387923', ['619294213', '619294216', '1313639753', '1313639755', '619294210'],
        'The mapped stair ways share the junction. B1 floor registration and intermediate rises are fitted.');
    branchEvidence.urls?.push('https://www.openstreetmap.org/node/5852387925');
    const branchFrom = { id: sharedId + '-b1', level: 'district-underground' as const, x: 701.32, z: 969.78 };
    const branchTurn = { id: sharedId + '-turn', level: branchFrom.level, x: 695.66, z: 969.93, elevationOffset: 3 };
    const eastTurn = { id: 'diamor-exit-e-26-east-turn', level: branchFrom.level, x: 697.46, z: 975.03, elevationOffset: 5.5 };
    apron(sharedId + '-b1-apron', exitName('E-26'), blockId, branchFrom, { x: 694, z: 963 }, 3.6, branchEvidence);
    apron(sharedId + '-turn-apron', exitName('E-26'), blockId, branchTurn, { x: 696.8, z: 970.1 }, 3.5, branchEvidence);
    apron('diamor-exit-e-26-east-turn-apron', exitName('E-26'), blockId, eastTurn, { x: 698.5, z: 975.1 }, 3.2, branchEvidence);
    connections.push(
        { id: sharedId, kind: 'stairs', blockId, from: branchFrom, to: branchTurn, width: 2.1, placement: 'exterior', evidence: branchEvidence },
        {
            id: 'diamor-exit-e-26-intermediate', kind: 'stairs', blockId, from: branchTurn, to: eastTurn,
            width: 2.1, placement: 'exterior', evidence: branchEvidence
        }
    );
    for (const entry of [
        { number: '10-21', lon: 135.4985863, lat: 34.6993266, sidewalk: { x: 691.91, z: 962.71 } },
        { number: 'E-26', lon: 135.4986862, lat: 34.6992424, sidewalk: { x: 705.51, z: 978.11 } }
    ]) {
        const id = 'diamor-exit-' + entry.number.toLowerCase();
        const to = { id: id + '-ground', level: 'district-ground' as const, ...project(entry.lon, entry.lat) };
        apron(id + '-street-apron', exitName(entry.number), blockId, to, entry.sidewalk, 3.5, branchEvidence);
        connections.push({ id, kind: 'stairs', blockId, from: entry.number === 'E-26' ? eastTurn : branchTurn, to, width: 2.1, evidence: branchEvidence });
        entrance(id, entry.number, to, branchEvidence, id);
    }

    const liftId = 'diamor-lift-ev-4';
    const liftEvidence = evidenceFor('5853250928', ['619294219'],
        'The operator plan locates EV-4 at the east end of the B1 cross-passage. OSM records street and B1 stops and the street arcade. The B1 door approach is fitted.');
    const shaft = project(135.4987865, 34.6993587);
    const liftFrom = { id: liftId + '-b1', level: 'district-underground' as const, ...shaft };
    const liftTo = { id: liftId + '-ground', level: 'district-ground' as const, ...shaft };
    const liftName = messageText('facilities.locations.diamorLift', { number: 'EV-4' });
    apron(liftId + '-b1-apron', liftName, blockId, liftFrom, { x: 711, z: 957.5 }, 4.3, liftEvidence);
    apron(liftId + '-street-apron', liftName, blockId, liftTo, { x: 709.38, z: 961.95 }, 4.2, liftEvidence);
    connections.push({
        id: liftId, kind: 'elevator', blockId, from: liftFrom, to: liftTo, evidence: liftEvidence,
        doorFacingRad: Math.PI, lowerDoorFacingRad: -Math.PI / 2
    });

    for (const entry of [
        {
            number: 'E-32', node: '5852387962', lon: 135.4986812, lat: 34.6989311,
            ways: ['623086702', '623086703'], sidewalk: { x: 704.21, z: 1009.12 }
        },
        {
            number: 'E-33', node: '5852387966', lon: 135.4985377, lat: 34.6988889,
            ways: ['623086701', '623086705'], sidewalk: { x: 687.63, z: 1014.80 }
        }
    ]) {
        const id = 'diamor-exit-' + entry.number.toLowerCase();
        const evidence = evidenceFor(entry.node, entry.ways,
            'OSM locates the street mouth, sidewalk and entrance structure. The operator plan locates the B1 opening; the modeled approach ends at the street mouth.');
        const mouth = project(entry.lon, entry.lat);
        const end = { id: id + '-ground', level: 'district-ground' as const, ...mouth };
        apron(id + '-street-apron', exitName(entry.number), blockId, end, entry.sidewalk, 2.5, evidence);
        entrance(id, entry.number, mouth, evidence);
    }
    return { areas, connections, canopies, facilities };
}
