import { messageText } from '../../i18n/index.ts';
import { stationDraft } from '../../station-draft.ts';
import { districtPlacements } from '../../district-placement.ts';

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
        'kitashinchi',
        messageText('stations.kitashinchi.name'),
        'kitashinchi',
        placement.origin,
        placement.angle,
        1,
        placement.planScale
    );
    const { draft, area, facility, node, edge, connection, platform } = b;
    draft.levels = [
        {
            id: 'kitashinchi-platform',
            station: draft.id,
            label: 'B2',
            name: messageText('stations.kitashinchi.entities.kitashinchiPlatform.name'),
            y: -24,
            stackIndex: -2,
            description: 'JR 东西线岛式站台；图示轨道低于四桥线，仍归 B2 探索组，高差为示意。'
        },
        {
            id: 'kitashinchi-hall',
            station: draft.id,
            label: 'B1',
            name: messageText('stations.kitashinchi.entities.kitashinchiHall.name'),
            y: -8,
            stackIndex: -1,
            description: '东西改札与站外公共通路；北侧接 DIAMOR，西侧接西梅田及堂岛地下街。'
        },
        {
            id: 'kitashinchi-ground',
            station: draft.id,
            label: '1F',
            name: messageText('stations.kitashinchi.entities.kitashinchiGround.name'),
            y: 0,
            stackIndex: 0,
            description: '仅表达参考图街面楼梯、电梯与小型落台。'
        },
    ];
    const p = platform(
        'island',
        'kitashinchi-platform',
        [1, 2],
        0,
        0,
        100,
        7,
        {
            width: 7,
            name: messageText('stations.kitashinchi.platforms.numbered.name'),
            lineName: messageText('stations.kitashinchi.p.lineName'),
            lineColor: 0xd28faf,
            trackSides: [1, -1],
            screenDoors: 'half-height'
        }
    );
    const paidHalls = geographic ? [
        ['paid-hall-west', -26.5, 45],
        ['paid-hall-east', 36, 34]
    ] as const : [['paid-hall', 0, 90]] as const;
    for (const [id, x, width] of paidHalls) {
        area(
            id,
            'kitashinchi-hall',
            messageText('stations.kitashinchi.areas.paidHall.name'),
            'paid',
            x,
            geographic ? 2 : 0,
            width,
            12
        );
    }
    area(
        'west-public',
        'kitashinchi-hall',
        messageText('stations.kitashinchi.areas.westPublic.name'),
        'public',
        -57,
        0,
        24,
        52
    );
    area(
        'east-public',
        'kitashinchi-hall',
        messageText('stations.kitashinchi.areas.eastPublic.name'),
        'public',
        57,
        0,
        24,
        52
    );
    area(
        'north-public',
        'kitashinchi-hall',
        messageText('stations.kitashinchi.areas.northPublic.name'),
        'public',
        0,
        -11,
        114,
        10
    );
    area(
        'south-public',
        'kitashinchi-hall',
        messageText('stations.kitashinchi.areas.southPublic.name'),
        'public',
        0,
        20,
        114,
        10
    );
    area(
        'diamor-public',
        'kitashinchi-hall',
        messageText('stations.kitashinchi.areas.diamorPublic.name'),
        'public',
        0,
        -18,
        12,
        24
    );
    area(
        'office',
        'kitashinchi-hall',
        messageText('stations.kitashinchi.areas.office.name'),
        'service',
        geographic ? -12 : 0,
        geographic ? 8.5 : 11,
        geographic ? 6 : 14,
        geographic ? 3 : 4
    );
    const westGateX = -15.5;
    const eastGateX = 38.2;
    for (const [key, name, x, geographicX] of [
        ['west', messageText('stations.kitashinchi.items.west.name'), -45, westGateX],
        ['east', messageText('stations.kitashinchi.items.east.name'), 45, eastGateX]
    ] as const) {
        facility(
            `${key}-gate`,
            'kitashinchi-hall',
            messageText('stations.kitashinchi.labels.gate', { name: name }),
            'gate',
            geographic ? geographicX : x,
            geographic ? -4 : 0,
            '参考图 B1 改札；闸内外保持独立。',
            geographic ? 0 : Math.PI / 2
        );
        facility(
            `${key}-machines`,
            'kitashinchi-hall',
            messageText('stations.kitashinchi.labels.ticketMachine', { name: name }),
            'ticket-machine',
            geographic ? geographicX + (key === 'west' ? -6 : 6) : (key === 'west' ? -58 : 58),
            geographic ? -7.5 : -10,
            '指定券售票机位置按参考图示意。',
            key === 'west' ? Math.PI / 2 : -Math.PI / 2
        );
    }
    facility(
        'west-lockers',
        'kitashinchi-hall',
        messageText('stations.kitashinchi.facilities.westLockers.name'),
        'locker',
        -64,
        8,
        'B1 西改札外，往西梅田方向的联络通道。'
    );
    facility(
        'east-lockers',
        'kitashinchi-hall',
        messageText('stations.kitashinchi.facilities.eastLockers.name'),
        'locker',
        61,
        -8,
        'B1 东改札外，往御堂筋方向的联络通道。'
    );
    facility(
        'ticket',
        'kitashinchi-hall',
        messageText('stations.kitashinchi.facilities.ticket.name'),
        'ticket',
        geographic ? -8 : -55,
        geographic ? -7.5 : 12,
        '参考图“みどりの窓口”及相关受取柜台，具体柜台数量示意。'
    );
    facility(
        'office',
        'kitashinchi-hall',
        messageText('stations.kitashinchi.facilities.office.name'),
        'information',
        geographic ? -12 : 0,
        geographic ? 8.5 : 11,
        '参考图站务室位置。'
    );
    for (const [key, low, high] of [['west', -32, -44], ['west-inner', 0, -12], ['east', 32, 44]] as const) {
        const c = connection(
            `${key}-escalators`,
            'escalator',
            node(`${key}-escalators-low`, 'kitashinchi-platform', low, 0),
            node(`${key}-escalators-high`, 'kitashinchi-hall', high, 0),
            p.id
        );
        if (key !== 'west-inner') {
            c.lanes = 2;
        }
    }
    connection(
        'platform-lift',
        'elevator',
        node('platform-lift-low', 'kitashinchi-platform', -15, 0),
        node('platform-lift-high', 'kitashinchi-hall', -15, 0),
        p.id
    );
    area(
        'street-lift-ground',
        'kitashinchi-ground',
        messageText('stations.kitashinchi.areas.streetLiftGround.name'),
        'public',
        3,
        -28,
        7,
        7
    );
    connection(
        'street-lift',
        'elevator',
        node('street-lift-low', 'kitashinchi-hall', 3, -28),
        node('street-lift-high', 'kitashinchi-ground', 3, -28)
    );
    for (const [number, x, z, highX, highZ] of [
        [
            '11-4',
            -62,
            15,
            -62,
            29
        ],
        [
            '11-5',
            -55,
            15,
            -55,
            29
        ],
        [
            '11-21',
            15,
            20,
            15,
            34
        ],
        [
            '11-23',
            30,
            20,
            30,
            34
        ],
        [
            '11-41',
            65,
            0,
            79,
            0
        ],
    ] as const) {
        area(
            `exit-${number}-ground`,
            'kitashinchi-ground',
            messageText('stations.kitashinchi.labels.entrance', { number: number }),
            'public',
            highX,
            highZ,
            7,
            7
        );
        facility(
            `exit-${number}`,
            'kitashinchi-hall',
            messageText('stations.kitashinchi.labels.entrance', { number: number }),
            'entrance',
            x,
            z,
            '参考图的出口去向，坡道及局部路面高差归并到相应公共层。'
        );
        connection(
            `exit-${number}-stairs`,
            'stairs',
            node(`exit-${number}-low`, 'kitashinchi-hall', x, z),
            node(`exit-${number}-high`, 'kitashinchi-ground', highX, highZ)
        );
    }
    const entry = node('route-entry', 'kitashinchi-hall', geographic ? -35.1 : -60, geographic ? -12 : 0);
    const outside = node('route-west-out', 'kitashinchi-hall', geographic ? westGateX : -48, geographic ? -7 : 0);
    const inside = node('route-west-in', 'kitashinchi-hall', geographic ? westGateX : -42, geographic ? -1 : 0);
    if (geographic) {
        const eastOut = node('route-east-out', 'kitashinchi-hall', eastGateX, -7);
        const eastIn = node('route-east-in', 'kitashinchi-hall', eastGateX, -1);
        edge(eastOut, eastIn, 'gate');
        edge(eastIn, draft.nodes.find(n => n.id === 'kitashinchi-east-escalators-high')!);
    }
    const high = draft.nodes.find(n => n.id === 'kitashinchi-west-escalators-high')!;
    const low = draft.nodes.find(n => n.id === 'kitashinchi-west-escalators-low')!;
    const dest = node('destination', 'kitashinchi-platform', -4, 0);
    edge(entry, outside);
    edge(outside, inside, 'gate');
    edge(inside, high);
    edge(high, low, 'escalator');
    edge(low, dest);
    for (const value of [...draft.facilities, ...draft.layout.areas, ...draft.layout.platforms, ...draft.layout.connections]) {
        value.evidence.urls = ['https://eki.jr-odekake.net/premises?id=0612303'];
        value.evidence.detail += '; user Kitashinchi PDF p1 dated 2026-10-02, approximate dimensions; temporary equipment closure ignored';
    }
    return draft;
}

export const kitashinchiStation = createStation(districtPlacements.kitashinchi);
