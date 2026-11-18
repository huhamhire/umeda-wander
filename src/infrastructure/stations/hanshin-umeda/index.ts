import { messageText } from '../../i18n/index.ts';
import { stationDraft } from '../../station-draft.ts';
import { districtPlacements } from '../../district-placement.ts';
import { passageOutline } from '../../../domain/map/geometry.ts';
// +X runs west toward Kobe; -X is the eastern terminal. Coordinates are a
// schematic fit of the user-supplied 2025-12-24 plan, not measured station metres.
/**
 * Create this station’s local layout, facilities and evidence in the supplied frame without mutating other stations.
 */
export function createStation(
    placement: {
        origin: {
            x: number;
            z: number;
        };
        angle: number;
        planScale: number | {
            along: number;
            across: number;
        };
    },
    geographic = false
) {
    const b = stationDraft(
        'hanshin-umeda',
        messageText('stations.hanshinUmeda.name'),
        'hanshin',
        placement.origin,
        placement.angle,
        1,
        placement.planScale
    );
    const { draft, area, facility, node, edge, connection, platform, point, proof } = b;
    draft.levels = [
        {
            id: 'hanshin-platform',
            station: draft.id,
            label: 'B2',
            name: messageText('stations.hanshinUmeda.entities.hanshinPlatform.name'),
            y: -16,
            stackIndex: -2,
            description: '1–4 番线、分离降车区和同层东口；不能把东口误放到 B1。'
        },
        {
            id: 'hanshin-hall',
            station: draft.id,
            label: 'B1',
            name: messageText('stations.hanshinUmeda.entities.hanshinHall.name'),
            y: -8,
            stackIndex: -1,
            description: '西口、百货店口及闸外地下公共通路。'
        },
        {
            id: 'hanshin-ground',
            station: draft.id,
            label: '1F',
            name: messageText('stations.hanshinUmeda.entities.hanshinGround.name'),
            y: 0,
            stackIndex: 0,
            description: '南出口直梯地面落台，周边商场只保留外部接入。'
        },
        {
            id: 'hanshin-deck',
            station: draft.id,
            label: '2F',
            name: messageText('stations.hanshinUmeda.entities.hanshinDeck.name'),
            y: 4,
            stackIndex: 1,
            description: '南出口电梯接阪急阪神连桥，按相邻较低公共步行层对齐。'
        },
    ];
    const p12 = platform(
        'platform-12',
        'hanshin-platform',
        [1, 2],
        0,
        12.65,
        92,
        7,
        {
            width: 6.4,
            terminal: true,
            trackSides: [1, -1],
            screenDoors: 'half-height',
            name: messageText('stations.hanshinUmeda.p12.name'),
            lineName: messageText('stations.hanshinUmeda.p12.lineName'),
            lineColor: 0x6a9ebc
        }
    );
    const p23 = platform(
        'alighting-23',
        'hanshin-platform',
        [],
        0,
        2.15,
        92,
        6,
        {
            width: 4.2,
            terminal: true,
            screenDoors: 'half-height',
            screenDoorSides: [1, -1],
            name: messageText('stations.hanshinUmeda.p23.name')
        }
    );
    const p34 = platform(
        'platform-34',
        'hanshin-platform',
        [3, 4],
        0,
        -8.35,
        92,
        7,
        {
            width: 6.4,
            terminal: true,
            trackSides: [1, -1],
            screenDoors: 'half-height',
            name: messageText('stations.hanshinUmeda.p34.name'),
            lineName: messageText('stations.hanshinUmeda.p34.lineName'),
            lineColor: 0x6a9ebc
        }
    );
    const p4 = platform(
        'alighting-4',
        'hanshin-platform',
        [],
        0,
        -19,
        92,
        6,
        {
            width: 4.2,
            terminal: true,
            screenDoors: 'half-height',
            screenDoorSides: [1],
            name: messageText('stations.hanshinUmeda.p4.name')
        }
    );
    area(
        'east-paid',
        'hanshin-platform',
        messageText('stations.hanshinUmeda.areas.eastPaid.name'),
        'paid',
        -54,
        -2,
        16,
        50
    );
    area(
        'east-public',
        'hanshin-platform',
        messageText('stations.hanshinUmeda.areas.eastPublic.name'),
        'public',
        -75,
        -12,
        26,
        26
    );
    area(
        'east-upper-public',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.areas.eastUpperPublic.name'),
        'public',
        -100,
        -10,
        28,
        28
    );
    area(
        'east-upper-side-public',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.areas.eastUpperSidePublic.name'),
        'public',
        -101,
        14,
        10,
        38
    );
    area(
        'east-upper-link',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.areas.eastUpperLink.name'),
        'public',
        -74,
        32,
        68,
        10
    );
    area(
        'south-east-public',
        'hanshin-platform',
        messageText('stations.hanshinUmeda.areas.southEastPublic.name'),
        'public',
        -70,
        -29,
        18,
        16
    );
    area(
        'hall-paid',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.areas.hallPaid.name'),
        'paid',
        26,
        0,
        40,
        46
    );
    area(
        'west-public',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.areas.westPublic.name'),
        'public',
        58,
        0,
        24,
        62
    );
    area(
        'north-public',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.areas.northPublic.name'),
        'public',
        14,
        32,
        120,
        18
    );
    area(
        'central-public',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.areas.centralPublic.name'),
        'public',
        -6,
        0,
        24,
        64
    );
    // The B1 slab continues over the eastern platform hall and station office.
    // Only the actual vertical-access openings reveal B2; the whole bay is not an atrium.
    area(
        'east-hall-public',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.areas.centralPublic.name'),
        'public',
        -38.5,
        -1,
        89,
        48
    );
    const eastHall = draft.layout.areas.at(-1)!;
    eastHall.label = false;
    eastHall.evidence = proof('B1 continuous slab around the station office, restored after user review; only eastern main access and actual vertical equipment cut through it. Extent fitted in the station frame, not surveyed.');
    area(
        'department-public',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.areas.departmentPublic.name'),
        'public',
        -19,
        -32,
        130,
        18
    );
    area(
        'south-b1-landing',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.areas.southB1Landing.name'),
        'public',
        -79,
        -35,
        16,
        16
    );
    area(
        'south-ground',
        'hanshin-ground',
        messageText('stations.hanshinUmeda.areas.southGround.name'),
        'public',
        -76,
        -35,
        13,
        14
    );
    area(
        'south-deck',
        'hanshin-deck',
        messageText('stations.hanshinUmeda.areas.southDeck.name'),
        'public',
        -76,
        -35,
        13,
        14
    );
    area(
        'ticket-office',
        'hanshin-platform',
        messageText('stations.hanshinUmeda.areas.ticketOffice.name'),
        'service',
        -77,
        -21,
        8,
        5
    );
    area(
        'station-office',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.areas.stationOffice.name'),
        'service',
        -34,
        -13,
        10,
        8
    );
    // The independent department-store basement replaces the old station-owned
    // rectangle, which otherwise covers the DIAMOR circular public junction.
    facility(
        'west-gate',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.facilities.westGate.name'),
        'gate',
        46,
        0,
        'B1 西半侧付费区西端，闸外通往 JR 与西梅田方向。',
        Math.PI / 2
    );
    facility(
        'department-gate',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.facilities.departmentGate.name'),
        'gate',
        6,
        0,
        'B1 西半侧付费区东端；外接中央朝南的公共通路。',
        Math.PI / 2
    );
    facility(
        'east-gate',
        'hanshin-platform',
        messageText('stations.hanshinUmeda.facilities.eastGate.name'),
        'gate',
        -62,
        -10,
        '主出口：与 B2 站台同层，多通道闸机组，数量示意；终端通道连续接各站台。',
        Math.PI / 2
    ).gateCount = 12;
    facility(
        'west-machines',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.facilities.westMachines.name'),
        'ticket-machine',
        58,
        20,
        '西口闸外售票机，机柜数量示意。'
    );
    facility(
        'department-machines',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.facilities.departmentMachines.name'),
        'ticket-machine',
        -20,
        -32,
        '百货店口闸外售票机。',
        Math.PI
    );
    facility(
        'east-machines',
        'hanshin-platform',
        messageText('stations.hanshinUmeda.facilities.eastMachines.name'),
        'ticket-machine',
        -66,
        -16,
        '东口闸外售票机，避让前方地下通路扶梯落台。'
    );
    facility(
        'ticket',
        'hanshin-platform',
        messageText('stations.hanshinUmeda.facilities.ticket.name'),
        'ticket',
        -77,
        -21,
        'PDF 标出的定期券售票处，保留独立柜台设施。'
    );
    facility(
        'office',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.facilities.office.name'),
        'information',
        -34,
        -13,
        'B1 站务室及咨询位置示意。'
    );
    facility(
        'west-entry',
        'hanshin-hall',
        messageText('stations.hanshinUmeda.facilities.westEntry.name'),
        'entrance',
        58,
        0,
        '往 JR 与西梅田方向的闸外入口。'
    );
    facility(
        'south-entry',
        'hanshin-platform',
        messageText('stations.hanshinUmeda.facilities.southEntry.name'),
        'entrance',
        -80,
        -18,
        '东口公共空间往南出口；连接走向、高差和坡度为示意。'
    );
    for (const p of [p12, p34]) {
        const low = node(`${p.id}-escalator-low`, 'hanshin-platform', 20, p.id === p12.id ? 14.15 : -6.85);
        const high = node(`${p.id}-escalator-high`, 'hanshin-hall', 39, p.id === p12.id ? 14.15 : -6.85);
        connection(`${p.id}-escalator`, 'escalator', low, high, p.id);
        const stairLow = node(`${p.id}-stair-low`, 'hanshin-platform', 10, p.id === p12.id ? 11.15 : -9.85);
        const stairHigh = node(`${p.id}-stair-high`, 'hanshin-hall', 26, p.id === p12.id ? 11.15 : -9.85);
        connection(`${p.id}-stairs`, 'stairs', stairLow, stairHigh, p.id);
        const liftLow = node(`${p.id}-lift-low`, 'hanshin-platform', 33, p === p12 ? 12.65 : -8.35);
        const liftHigh = node(`${p.id}-lift-high`, 'hanshin-hall', 33, p === p12 ? 12.65 : -8.35);
        connection(`${p.id}-lift`, 'elevator', liftLow, liftHigh, p.id);
    }
    for (const p of [p23, p4]) {
        const z = p === p23 ? 2.15 : -19;
        connection(
            `${p.id}-stairs`,
            'stairs',
            node(`${p.id}-stairs-low`, 'hanshin-platform', 11, z),
            node(`${p.id}-stairs-high`, 'hanshin-hall', 25, z),
            p.id
        );
    }
    // Two distinct public banks outside the B2 gate. Do not confuse the south
    // exit B2-to-B1 bank with its separate B1-to-ground flights below.
    const eastBank = connection(
        'east-public-escalators',
        'escalator',
        node('east-public-escalators-low', 'hanshin-platform', -78, -10),
        node('east-public-escalators-high', 'hanshin-hall', -100, -10)
    );
    eastBank.lanes = 2;
    eastBank.laneSpacing = 9;
    const eastStairs = connection(
        'east-public-stairs',
        'stairs',
        node('east-public-stairs-low', 'hanshin-platform', -78, -10),
        node('east-public-stairs-high', 'hanshin-hall', -100, -10)
    );
    eastStairs.width = 6;
    eastStairs.stairLandingLength = 2.2;
    connection(
        'south-public-escalator',
        'escalator',
        node('south-public-escalator-low', 'hanshin-platform', -66, -23),
        node('south-public-escalator-high', 'hanshin-hall', -66, -40)
    );
    connection(
        'south-public-stairs',
        'stairs',
        node('south-public-stairs-low', 'hanshin-platform', -70, -23),
        node('south-public-stairs-high', 'hanshin-hall', -70, -40)
    );
    for (const c of draft.layout.connections.filter(c => c.id.includes('east-public-') || c.id.includes('south-public-'))) {
        c.evidence.detail = 'Hanshin diagram: public East/South Exit stairs and escalators between B2 and the B1 underground passage. Osaka City interchange sheet E confirms B1 to B2; heights and exact landing positions schematic.';
        c.evidence.urls = [
            'https://www.hanshin.co.jp/uploads/guidemap/umeda.pdf',
            'https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda01-5-2%28202109%29.pdf'
        ];
    }
    const southB1 = node('south-lift-b1', 'hanshin-hall', -76, -35);
    const southGround = node('south-lift-ground', 'hanshin-ground', -76, -35);
    const southDeck = node('south-lift-deck', 'hanshin-deck', -76, -35);
    for (const lift of [
        connection('south-lift-b1-ground', 'elevator', southB1, southGround),
        connection('south-lift-ground-deck', 'elevator', southGround, southDeck)
    ]) {
        lift.doorFacingRad = placement.angle + Math.PI;
    }
    connection(
        'south-ground-stairs',
        'stairs',
        node('south-stairs-b1', 'hanshin-hall', -67, -30.5),
        node('south-stairs-ground', 'hanshin-ground', -76, -30.5)
    );
    connection(
        'south-ground-escalator',
        'escalator',
        node('south-escalator-b1', 'hanshin-hall', -57, -39.5),
        node('south-escalator-ground', 'hanshin-ground', -76, -39.5)
    );
    // Diagram explicitly gives a step-free East Gate–South Exit relation; retain a
    // continuous public slope without claiming a measured gradient or routing edge.
    const rampLow = { ...point(-82, -17), level: 'hanshin-platform' as const, station: draft.id };
    const rampHigh = { ...point(-82, -34), level: 'hanshin-hall' as const, station: draft.id };
    draft.layout.passages = [{
        id: 'hanshin-east-south-public-slope',
        name: messageText('stations.hanshinUmeda.entities.hanshinEastSouthPublicSlope.name'),
        kind: 'underground',
        width: 4.5,
        points: [rampLow, rampHigh],
        evidence: proof('PDF step-free East Gate to South Exit relation; exploded-layer slope is schematic, not an engineering gradient')
    }];
    draft.layout.atria = [{
        id: 'hanshin-south-ramp-opening',
        name: messageText('stations.hanshinUmeda.entities.hanshinSouthRampOpening.name'),
        openings: [{ level: 'hanshin-hall', outline: passageOutline(point(-82, -27), point(-82, -35), 5) }],
        evidence: proof('Upper B1 opening for the public East Gate–South Exit slope')
    }];
    // One preview entirely inside Hanshin; no invented inter-operator routing edge.
    const entry = node('route-entry', 'hanshin-hall', 58, 0);
    const out = node('route-gate-out', 'hanshin-hall', 49, 0);
    const inside = node('route-gate-in', 'hanshin-hall', 42, 0);
    const high = draft.nodes.find(n => n.id === `hanshin-umeda-${p12.id}-escalator-high`)!;
    const low = draft.nodes.find(n => n.id === `hanshin-umeda-${p12.id}-escalator-low`)!;
    const dest = node('destination', 'hanshin-platform', -12, 12.65);
    edge(entry, out);
    edge(out, inside, 'gate');
    edge(inside, high);
    edge(high, low, 'escalator');
    edge(low, dest);
    for (const value of [...draft.facilities, ...draft.layout.areas, ...draft.layout.platforms, ...draft.layout.connections]) {
        value.evidence.urls ??= ['https://www.hanshin.co.jp/uploads/guidemap/umeda.pdf'];
    }
    return draft;
}

export const hanshinStation = createStation(districtPlacements.hanshin);
