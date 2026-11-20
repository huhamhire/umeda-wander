import { passageOutline } from '../../../domain/map/geometry.ts';
import type { Point2, StationMap } from '../../../domain/map/model.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';

/** Project entrance nodes from the reviewed OSM snapshot into district metres. */
const project = (lon: number, lat: number) => toGeographicPlan({ lon, lat }, geographicFrame);

/** Build the confirmed B1 branches through Kitashinchi (北新地駅) and register their street equipment. */
export function calibrateKitashinchiConcourse(station: StationMap): void {
    const { layout, facilities } = station;
    const blockId = 'kitashinchi-public-b1';
    const publicShapes = [
        {
            id: 'north-public',
            ways: ['1010195560'],
            outline: [
                { x: 434, z: 1056 }, { x: 486, z: 1056 }, { x: 539, z: 1060 }, { x: 570, z: 1060 },
                { x: 644, z: 1065 }, { x: 706, z: 1071 }, { x: 706, z: 1087 }, { x: 675, z: 1079.4 },
                { x: 460, z: 1069.2 }, { x: 434, z: 1070 }
            ]
        },
        {
            id: 'west-public',
            ways: ['1010195560', '618802430', '618802428'],
            outline: [
                { x: 428, z: 1052 }, { x: 447, z: 1052 }, { x: 457, z: 1062 }, { x: 459, z: 1090 },
                { x: 445, z: 1090 }, { x: 445, z: 1074 }, { x: 428, z: 1074 }
            ]
        },
        {
            id: 'diamor-public',
            ways: ['1010195564', '1322885748'],
            outline: [
                { x: 570, z: 1052 }, { x: 585, z: 1052 }, { x: 585, z: 1066 },
                { x: 569, z: 1080 }, { x: 569, z: 1096 }, { x: 559, z: 1096 },
                { x: 559, z: 1072 }, { x: 570, z: 1065 }
            ]
        },
        {
            id: 'south-public',
            ways: ['1322885749'],
            outline: passageOutline({ x: 545, z: 1093.5 }, { x: 591, z: 1097 }, 8)
        },
        {
            id: 'east-public',
            ways: ['1010195560', '1322885751', '1322885752'],
            outline: [
                { x: 685, z: 1071 }, { x: 713, z: 1078 }, { x: 714, z: 1106 },
                { x: 693, z: 1106 }, { x: 693, z: 1086 }, { x: 685, z: 1086 }
            ]
        }
    ];
    for (const shape of publicShapes) {
        const area = layout.areas.find(a => a.id === 'kitashinchi-' + shape.id)!;
        Object.assign(area, { outline: shape.outline, blockId });
        area.evidence = {
            ...area.evidence,
            detail: 'Operator plan confirms public passage topology. Alignment follows the district plan and OSM underground links; width and B1 elevation are fitted.',
            urls: [...area.evidence.urls!, ...shape.ways.map(id => 'https://www.openstreetmap.org/way/' + id)]
        };
    }

    const lift = layout.connections.find(c => c.id === 'kitashinchi-street-lift')!;
    const shaft = project(135.4973701, 34.6984899);
    Object.assign(lift.from, shaft);
    Object.assign(lift.to, shaft);
    lift.blockId = blockId;
    lift.doorFacingRad = Math.atan2(1063.03 - shaft.z, 586.23 - shaft.x);
    lift.reverseLowerDoor = true;
    lift.evidence.urls!.push('https://www.openstreetmap.org/node/5865318040', 'https://www.openstreetmap.org/way/618802443');
    lift.evidence.detail += '; mapped street shaft near the Sakurabashi East intersection (桜橋東交差点), with fitted door directions';
    const liftFloor = layout.areas.find(a => a.id === 'kitashinchi-street-lift-ground')!;
    liftFloor.outline = passageOutline({ x: shaft.x - 3, z: shaft.z }, { x: shaft.x + 3, z: shaft.z }, 6);
    liftFloor.evidence = lift.evidence;

    const canopies: NonNullable<StationMap['layout']['canopies']> = [];
    const exits: {
        number: string;
        node: string;
        way: string;
        top: Point2;
        foot: Point2;
        width: number;
        roofEnd?: Point2;
        roofWidth?: number;
        escalator?: boolean;
    }[] = [
        {
            number: '11-4', node: '2314391261', way: '618802430',
            top: project(135.4957166, 34.6986245), foot: { x: 442, z: 1056 },
            width: 3, roofEnd: { x: 438, z: 1051.2 }, roofWidth: 3.75
        },
        {
            number: '11-5', node: '5024365384', way: '618802428',
            top: project(135.4958528, 34.6982536), foot: { x: 455, z: 1085.7 },
            width: 2.25, roofEnd: { x: 453.4, z: 1085.65 }, roofWidth: 2.8
        },
        {
            number: '11-21', node: '5024365383', way: '618802448',
            top: project(135.4968456, 34.6981846), foot: { x: 548.6, z: 1093.8 },
            width: 2.9, escalator: true
        },
        {
            number: '11-23', node: '5024365382', way: '618802446',
            top: project(135.4975513, 34.6981389), foot: { x: 586.5, z: 1096.8 },
            width: 2.7
        },
        {
            number: '11-41', node: '2314356653', way: '618802452',
            top: project(135.4985012, 34.6981007), foot: { x: 698, z: 1101.9 },
            width: 2.4, roofEnd: { x: 696.3, z: 1101.77 }, roofWidth: 3
        }
    ];
    for (const exit of exits) {
        const id = 'kitashinchi-exit-' + exit.number;
        const connection = layout.connections.find(c => c.id === id + '-stairs')!;
        const facility = facilities.find(f => f.id === id)!;
        const ground = layout.areas.find(a => a.id === id + '-ground')!;
        const evidence = {
            ...connection.evidence,
            detail: 'Operator exit branch and OSM street mouth. B1 landing, flight width and intermediate geometry are fitted.',
            urls: [
                ...connection.evidence.urls!,
                'https://www.openstreetmap.org/node/' + exit.node,
                'https://www.openstreetmap.org/way/' + exit.way
            ]
        };
        Object.assign(connection.from, exit.foot);
        Object.assign(connection.to, exit.top);
        Object.assign(connection, { blockId, evidence, width: exit.width });
        if (exit.escalator) {
            // Preserve the stored connection ID and the existing KS facility codes.
            connection.kind = 'escalator';
        }
        else {
            connection.stairLandingLength = 1.6;
        }
        Object.assign(facility, { ...exit.foot, evidence });
        const dx = exit.top.x - exit.foot.x;
        const dz = exit.top.z - exit.foot.z;
        const distance = Math.hypot(dx, dz);
        const ahead = { x: exit.top.x + 4 * dx / distance, z: exit.top.z + 4 * dz / distance };
        const behind = { x: exit.top.x - dx / distance, z: exit.top.z - dz / distance };
        ground.outline = passageOutline(behind, ahead, exit.width + 1.5);
        ground.evidence = evidence;
        if (exit.roofEnd && exit.roofWidth) {
            canopies.push({
                id: id + '-canopy',
                level: connection.to.level,
                points: [exit.top, exit.roofEnd],
                width: exit.roofWidth,
                clearHeight: 2.9,
                evidence
            });
        }
    }
    layout.canopies = canopies;
}
