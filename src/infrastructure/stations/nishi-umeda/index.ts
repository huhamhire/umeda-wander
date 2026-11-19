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
        'nishi-umeda',
        messageText('stations.nishiUmeda.name'),
        'yotsubashi',
        placement.origin,
        placement.angle,
        1,
        placement.planScale
    );
    const { draft, area, facility, node, edge, connection, platform } = b;
    draft.levels = [
        {
            id: 'y11-platform',
            station: draft.id,
            label: 'B2',
            name: messageText('stations.nishiUmeda.entities.y11Platform.name'),
            y: -16,
            stackIndex: -2,
            description: '北端尽头的岛式站台，1/2 番线往本町、难波、住之江公园。'
        },
        {
            id: 'y11-hall',
            station: draft.id,
            label: 'B1',
            name: messageText('stations.nishiUmeda.entities.y11Hall.name'),
            y: -8,
            stackIndex: -1,
            description: '北改札仅出站，中改札仅进站；南改札及公共地下通路分别表达。'
        },
        {
            id: 'y11-ground',
            station: draft.id,
            label: '1F',
            name: messageText('stations.nishiUmeda.entities.y11Ground.name'),
            y: 0,
            stackIndex: 0,
            description: '只保留参考图明确的街面楼梯、电梯和小型落台。'
        },
    ];
    const p = platform(
        'island',
        'y11-platform',
        [1, 2],
        0,
        0,
        86,
        7,
        {
            width: 7,
            name: messageText('stations.nishiUmeda.platforms.numbered.name'),
            lineName: messageText('stations.nishiUmeda.p.lineName'),
            lineColor: 0x328bb7,
            terminal: true,
            terminalEnd: 'end',
            trackSides: [1, -1],
            screenDoors: 'half-height'
        }
    );
    area(
        'paid-hall',
        'y11-hall',
        messageText('stations.nishiUmeda.areas.paidHall.name'),
        'paid',
        -2,
        geographic ? -4 : 0,
        90,
        geographic ? 14 : 12
    );
    area(
        'public-hall',
        'y11-hall',
        messageText('stations.nishiUmeda.areas.publicHall.name'),
        'public',
        0,
        geographic ? 13 : 16,
        116,
        20
    );
    area(
        'north-public',
        'y11-hall',
        messageText('stations.nishiUmeda.areas.northPublic.name'),
        'public',
        55,
        7,
        16,
        38
    );
    area(
        'south-public',
        'y11-hall',
        messageText('stations.nishiUmeda.areas.southPublic.name'),
        'public',
        -60,
        geographic ? -4 : 12,
        26,
        geographic ? 42 : 28
    );
    area(
        'north-west-public',
        'y11-hall',
        messageText('stations.nishiUmeda.areas.northWestPublic.name'),
        'public',
        55,
        -20,
        16,
        40
    );
    area(
        'west-public',
        'y11-hall',
        messageText('stations.nishiUmeda.areas.westPublic.name'),
        'public',
        -2.5,
        -28,
        115,
        8
    );
    area(
        'south-west-public',
        'y11-hall',
        messageText('stations.nishiUmeda.areas.southWestPublic.name'),
        'public',
        -60,
        -14,
        12,
        28
    );
    for (const [key, name, x] of [
        ['north', messageText('stations.nishiUmeda.items.north.name'), 33],
        ['middle', messageText('stations.nishiUmeda.items.middle.name'), 6],
        ['south', messageText('stations.nishiUmeda.items.south.name'), -32]
    ] as const) {
        facility(
            `${key}-gate`,
            'y11-hall',
            `Y11 · ${name}`,
            'gate',
            geographic && key === 'south' ? -47 : x,
            geographic ? (key === 'south' ? -4 : 3) : 6,
            '参考图保留改札使用方向；模型通路和设备间距为示意。',
            geographic && key === 'south' ? Math.PI / 2 : 0
        );
        facility(
            `${key}-machines`,
            'y11-hall',
            messageText(
                'stations.nishiUmeda.labels.ticketMachine',
                {
                    position: key === 'north' ? messageText('ui.directions.north') : key === 'middle' ? messageText('ui.directions.middle') : messageText('ui.directions.south')
                }
            ),
            'ticket-machine',
            geographic && key === 'south' ? -55 : x + 6,
            geographic ? 13 : 17,
            '闸外售票机组，数量和机柜间距为示意。',
            Math.PI
        );
    }
    facility(
        'north-lockers',
        'y11-hall',
        messageText('stations.nishiUmeda.facilities.northLockers.name'),
        'locker',
        27,
        10,
        'B1 北改札与中改札之间，靠北侧商铺。'
    );
    facility(
        'middle-lockers',
        'y11-hall',
        messageText('stations.nishiUmeda.facilities.middleLockers.name'),
        'locker',
        9,
        13,
        'B1 中改札附近，靠往 6 号出口的公共通路。'
    );
    facility(
        'opus-lockers',
        'y11-hall',
        messageText('stations.nishiUmeda.facilities.opusLockers.name'),
        'locker',
        -16,
        11,
        'B1 中改札往南改札的公共通路，靠 Metro Opus。'
    );
    facility(
        'south-lockers',
        'y11-hall',
        messageText('stations.nishiUmeda.facilities.southLockers.name'),
        'locker',
        -56,
        6,
        'B1 南改札附近，往 7-A 出口方向。'
    );
    area(
        'office',
        'y11-hall',
        messageText('stations.nishiUmeda.areas.office.name'),
        'service',
        -23,
        geographic ? -21 : 21,
        10,
        6
    );
    facility(
        'office',
        'y11-hall',
        messageText('stations.nishiUmeda.facilities.office.name'),
        'information',
        -23,
        geographic ? -21 : 21,
        '图示站长室／咨询区域。'
    );
    facility(
        'ticket',
        'y11-hall',
        messageText('stations.nishiUmeda.facilities.ticket.name'),
        'ticket',
        geographic ? -55 : -42,
        geographic ? -12 : 17,
        '南改札外售票处，位置按图示整理。'
    );
    area(
        'opus',
        'y11-hall',
        messageText('stations.nishiUmeda.areas.opus.name'),
        'service',
        -10,
        geographic ? -23 : 23,
        8,
        3
    );
    for (const [key, x, high, z] of [['north', 30, 42, 1.5], ['middle', -6, 8, 0], ['south', -32, -18, 1.5]] as const) {
        connection(
            `${key}-stairs`,
            'stairs',
            node(`${key}-stairs-low`, 'y11-platform', x, z),
            node(`${key}-stairs-high`, 'y11-hall', high, z),
            p.id
        );
    }
    connection(
        'north-escalator',
        'escalator',
        node('north-escalator-low', 'y11-platform', 30, -1.5),
        node('north-escalator-high', 'y11-hall', 42, -1.5),
        p.id
    );
    connection(
        'south-escalator',
        'escalator',
        node('south-escalator-low', 'y11-platform', -32, -1.5),
        node('south-escalator-high', 'y11-hall', -18, -1.5),
        p.id
    );
    connection(
        'platform-lift',
        'elevator',
        node('platform-lift-low', 'y11-platform', -40, 0),
        node('platform-lift-high', 'y11-hall', -40, 0),
        p.id
    );
    const streetLiftZ = geographic ? 13 : 20;
    area(
        'street-lift-ground',
        'y11-ground',
        messageText('stations.nishiUmeda.areas.streetLiftGround.name'),
        'public',
        30,
        streetLiftZ,
        7,
        7
    );
    connection(
        'street-lift',
        'elevator',
        node('street-lift-low', 'y11-hall', 30, streetLiftZ),
        node('street-lift-high', 'y11-ground', 30, streetLiftZ)
    );
    area(
        'yoshimoto-raised',
        'y11-hall',
        messageText('stations.nishiUmeda.areas.yoshimotoRaised.name'),
        'public',
        14,
        26,
        12,
        8
    );
    draft.layout.areas.at(-1)!.elevationOffset = 1.2;
    const liftLow = node('hydraulic-low', 'y11-hall', 10, 24);
    const liftHigh = { ...node('hydraulic-high', 'y11-hall', 10, 24), elevationOffset: 1.2 };
    draft.nodes[draft.nodes.length - 1] = liftHigh;
    connection('hydraulic-lift', 'elevator', liftLow, liftHigh);
    facility(
        'hydraulic',
        'y11-hall',
        messageText('stations.nishiUmeda.facilities.hydraulic.name'),
        'elevator',
        10,
        24,
        '参考图标出油压式升降平台，按 B1 局部高差表达；1.2 高差为示意。'
    );
    for (const [key, x, z] of [['2', 55, 19], ['6', 16, 24], ['9', -62, -7], ['10', -53, -15]] as const) {
        area(
            `exit-${key}-arm`,
            'y11-hall',
            messageText('stations.nishiUmeda.labels.passageEntrance', { key: key }),
            'public',
            x,
            z > 0 ? 16 : z / 2,
            6,
            z > 0 ? 20 : Math.abs(z) + 18
        );
        area(
            `exit-${key}-ground`,
            'y11-ground',
            messageText('stations.nishiUmeda.labels.entrance', { key: key }),
            'public',
            x + 10,
            z,
            7,
            7
        );
        connection(
            `exit-${key}-stairs`,
            'stairs',
            node(`exit-${key}-low`, 'y11-hall', x, z),
            node(`exit-${key}-high`, 'y11-ground', x + 10, z)
        );
        facility(
            `exit-${key}`,
            'y11-hall',
            messageText('stations.nishiUmeda.labels.streetEntrance', { key: key }),
            'entrance',
            x,
            z,
            '参考图标出的街面楼梯与出入口。'
        );
    }
    for (const [key, name, x, z] of [
        ['3', messageText('stations.nishiUmeda.labels.hiltonEast'), 42, 23],
        ['4-A', 'Herbis ENT', 25, -20],
        ['4-B', 'Hilton Plaza West', 0, -20],
        ['7-A', messageText('stations.nishiUmeda.items.level7A.name'), -32, 24],
        ['7-B', messageText('stations.nishiUmeda.items.level7B.name'), -60, 23],
        ['8', messageText('stations.nishiUmeda.labels.dojima'), -68, 12],
    ] as const) {
        if (z < 0) {
            area(
                `exit-${key}-public`,
                'y11-hall',
                messageText('stations.nishiUmeda.labels.basementInterface', { name: name }),
                'public',
                x,
                -22,
                6,
                12
            );
        }
        facility(`exit-${key}`, 'y11-hall', `Y11 · ${key} / ${name}`, 'entrance', x, z, '仅表达构内图明确的地下连接，不推断商业内部路线。');
    }
    // Gate directions are retained in the local preview, without inter-station edges.
    const common = node('paid-route', 'y11-hall', 0, 0);
    for (const [key, x] of [['north', 33], ['middle', 6], ['south', -32]] as const) {
        const south = geographic && key === 'south';
        const outside = node(`${key}-route-out`, 'y11-hall', south ? -50 : x, geographic ? (south ? -4 : 6) : 10);
        const inside = node(`${key}-route-in`, 'y11-hall', south ? -44 : x, geographic ? (south ? -4 : 0) : 3);
        if (key === 'north') {
            draft.edges.push({
                from: inside.id,
                to: outside.id,
                kind: 'gate',
                cost: 7,
                directed: true
            });
        }
        else if (key === 'middle') {
            draft.edges.push({
                from: outside.id,
                to: inside.id,
                kind: 'gate',
                cost: 7,
                directed: true
            });
        }
        else {
            edge(outside, inside, 'gate');
        }
        edge(inside, common);
    }
    const entry = node('route-entry', 'y11-hall', 6, geographic ? 13 : 17);
    const high = draft.nodes.find(n => n.id === 'nishi-umeda-middle-stairs-high')!;
    const low = draft.nodes.find(n => n.id === 'nishi-umeda-middle-stairs-low')!;
    const dest = node('destination', 'y11-platform', 8, 0);
    edge(entry, draft.nodes.find(n => n.id === 'nishi-umeda-middle-route-out')!);
    edge(common, high);
    edge(high, low, 'stairs');
    edge(low, dest);
    for (const value of [...draft.facilities, ...draft.layout.areas, ...draft.layout.platforms, ...draft.layout.connections]) {
        value.evidence.urls = ['https://subway.osakametro.co.jp/station_guide/station/Y11_%E8%A5%BF%E6%A2%85%E7%94%B0_%E6%A7%8B%E5%86%85%E5%9B%B3.pdf'];
        value.evidence.detail += '; user Y11 map p1, equipment spacing and vertical dimensions schematic';
    }
    return draft;
}

export const nishiStation = createStation(districtPlacements.nishi);
