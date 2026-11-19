import { messageText } from '../../i18n/index.ts';
import { stationDraft } from '../../station-draft.ts';
import { districtPlacements } from '../../district-placement.ts';

/**
 * Create this station’s local layout, facilities and evidence in the supplied frame without mutating other stations.
 */
export function createStation(placement: {
    origin: {
        x: number;
        z: number;
    };
    angle: number;
    planScale: number | {
        along: number;
        across: number;
    };
}) {
    const b = stationDraft(
        'metro-umeda',
        messageText('stations.metroUmeda.name'),
        'metro',
        placement.origin,
        placement.angle,
        1,
        placement.planScale
    );
    const { draft, area, facility, node, edge, connection, platform, point } = b;
    draft.levels = [
        {
            id: 'metro-platform',
            station: draft.id,
            label: messageText('facilities.types.platform'),
            name: messageText('stations.metroUmeda.entities.metroPlatform.name'),
            y: -16,
            stackIndex: -2,
            description: '御堂筋线 1 番线往难波、天王寺、中百舌鸟；2 番线往新大阪、箕面萱野。相对高度为示意。'
        },
        {
            id: 'metro-intermediate',
            station: draft.id,
            label: messageText('stations.metroUmeda.entities.metroIntermediate.label'),
            name: messageText('stations.metroUmeda.entities.metroIntermediate.name'),
            y: -12,
            stackIndex: -1.5,
            description: '参考图所示“中階”与站内通路，独立于 JR 的 M2F；随 B1 组一起探索，保留自身高度。站内连接为示意，不能据此推断已核验无障碍路线。'
        },
        {
            id: 'metro-hall',
            station: draft.id,
            label: messageText('stations.metroUmeda.entities.metroHall.label'),
            name: messageText('stations.metroUmeda.entities.metroHall.name'),
            y: -8,
            stackIndex: -1,
            description: '四组改札与闸外公共通路；地下商场、JR 与阪急去向保留接口，尚无跨站完整路线。'
        },
    ];
    const p = platform(
        'island',
        'metro-platform',
        [1, 2],
        0,
        0,
        122,
        8.5,
        {
            name: messageText('stations.metroUmeda.platforms.numbered.name'),
            lineName: messageText('stations.metroUmeda.p.lineName'),
            lineColor: 0xc6504f,
            trackSides: [1, -1],
            screenDoors: 'half-height'
        }
    );
    // Shared physical platform, with the E-area connection retained instead of isolated islands.
    area(
        'middle',
        'metro-intermediate',
        messageText('stations.metroUmeda.areas.middle.name'),
        'paid',
        0,
        0,
        110,
        10
    );
    area(
        'north-paid',
        'metro-hall',
        messageText('stations.metroUmeda.areas.northPaid.name'),
        'paid',
        51,
        0,
        18,
        27
    );
    area(
        'north-public',
        'metro-hall',
        messageText('stations.metroUmeda.areas.northPublic.name'),
        'public',
        67,
        0,
        14,
        44
    );
    area('east-paid', 'metro-hall', messageText('stations.metroUmeda.areas.eastPaid.name'), 'paid', 7, 10, 18, 12);
    area(
        'east-public',
        'metro-hall',
        messageText('stations.metroUmeda.areas.eastPublic.name'),
        'public',
        7,
        23,
        24,
        14
    );
    area(
        'west-paid',
        'metro-hall',
        messageText('stations.metroUmeda.areas.westPaid.name'),
        'paid',
        7,
        -10,
        18,
        12
    );
    area(
        'west-public',
        'metro-hall',
        messageText('stations.metroUmeda.areas.westPublic.name'),
        'public',
        7,
        -23,
        24,
        14
    );
    area(
        'jr-interface',
        'metro-hall',
        messageText('stations.metroUmeda.areas.jrInterface.name'),
        'public',
        7,
        -35,
        12,
        10
    );
    area(
        'south-paid',
        'metro-hall',
        messageText('stations.metroUmeda.areas.southPaid.name'),
        'paid',
        -47,
        0,
        18,
        27
    );
    area(
        'south-public',
        'metro-hall',
        messageText('stations.metroUmeda.areas.southPublic.name'),
        'public',
        -64,
        0,
        16,
        44
    );
    facility(
        'north-gate',
        'metro-hall',
        messageText('stations.metroUmeda.facilities.northGate.name'),
        'gate',
        60,
        0,
        '北改札闸内外分开。外侧指向阪急三番街、Yodobashi 等区域，接口尚未完成地理校准。',
        Math.PI / 2
    );
    facility(
        'east-gate',
        'metro-hall',
        messageText('stations.metroUmeda.facilities.eastGate.name'),
        'gate',
        7,
        16,
        '中北东侧改札，与中北西改札分别表达。'
    );
    facility(
        'west-gate',
        'metro-hall',
        messageText('stations.metroUmeda.facilities.westGate.name'),
        'gate',
        7,
        -16,
        '图中通往 JR 一侧的公共接口；不把 JR 改札内与 Metro 改札内直接相接。'
    );
    facility(
        'south-gate',
        'metro-hall',
        messageText('stations.metroUmeda.facilities.southGate.name'),
        'gate',
        -56,
        0,
        '南侧改札及阪神、地下街去向。',
        Math.PI / 2
    );
    facility(
        'north-machines',
        'metro-hall',
        messageText('stations.metroUmeda.facilities.northMachines.name'),
        'ticket-machine',
        71,
        10,
        '北侧闸外售票机，机柜数量为示意。',
        Math.PI / 2
    );
    facility(
        'south-machines',
        'metro-hall',
        messageText('stations.metroUmeda.facilities.southMachines.name'),
        'ticket-machine',
        -69,
        10,
        '南侧闸外售票机，机柜数量为示意。',
        -Math.PI / 2
    );
    facility(
        'platform-1',
        'metro-platform',
        messageText('stations.metroUmeda.facilities.platform1.name'),
        'entrance',
        -26,
        2.3,
        '1 番线往难波、天王寺、中百舌鸟方向；具体乘车信息以站内显示为准。'
    );
    facility(
        'platform-2',
        'metro-platform',
        messageText('stations.metroUmeda.facilities.platform2.name'),
        'entrance',
        25,
        -2.3,
        '2 番线往新大阪、箕面萱野方向。资料注明 E 楼梯前与 1 番线站台连接。'
    );
    facility(
        'exit-3a-lockers',
        'metro-hall',
        messageText('stations.metroUmeda.facilities.exit3aLockers.name'),
        'locker',
        66,
        -17,
        'B1 北改札外靠 3A 出口的柜组。'
    ).evidence.urls = ['https://subway.osakametro.co.jp/news/news/other/20261118_30station_locker.php'];
    facility(
        'exit-8-lockers',
        'metro-hall',
        messageText('stations.metroUmeda.facilities.exit8Lockers.name'),
        'locker',
        -1,
        -28,
        'B1 中北西改札外，靠往巴士总站的 8 号出口。'
    ).evidence.urls = ['https://subway.osakametro.co.jp/station_guide/station/M16_%E6%A2%85%E7%94%B0_%E6%A7%8B%E5%86%85%E5%9B%B3.pdf'];
    facility(
        'exit-9-lockers',
        'metro-hall',
        messageText('stations.metroUmeda.facilities.exit9Lockers.name'),
        'locker',
        17,
        -21,
        'B1 中北西改札外，靠 9 号出口楼梯。'
    ).evidence.urls = ['https://subway.osakametro.co.jp/station_guide/station/M16_%E6%A2%85%E7%94%B0_%E6%A7%8B%E5%86%85%E5%9B%B3.pdf'];
    for (const [key, x, z, hallX] of [
        ['A', 35, 2.3, 50],
        ['C', -8, 2.3, 7],
        ['E', -24, 2.3, -39],
        ['F', 35, -2.3, 50],
        ['H', -8, -2.3, 7],
        ['J', -24, -2.3, -39]
    ] as const) {
        const sign = Math.sign(hallX - x);
        const low = node(`${key}-platform`, 'metro-platform', x, z);
        const middle = node(`${key}-middle`, 'metro-intermediate', x + sign * 6, z);
        connection(`bank-${key}`, 'stairs', low, middle, p.id);
        // North/south flights turn into their hall; centre banks use a transverse landing.
        const high = node(`${key}-hall`, 'metro-hall', hallX, z);
        if (key === 'C' || key === 'H') {
            area(
                `centre-landing-${key}`,
                'metro-hall',
                messageText('stations.metroUmeda.areas.northPaidLanding.name'),
                'paid',
                7,
                z,
                8,
                8
            );
        }
        const transfer = node(`${key}-transfer`, 'metro-intermediate', x + sign * 9, z);
        edge(middle, transfer);
        connection(`rise-${key}`, 'escalator', transfer, high);
    }
    // Platform lifts first reach the intermediate layer, then continue to the halls.
    for (const [key, x, z] of [['north', 25, 0], ['south', -18, 0]] as const) {
        const low = node(`${key}-lift-platform`, 'metro-platform', x, z);
        const mid = node(`${key}-lift-middle`, 'metro-intermediate', x, z);
        connection(`lift-${key}`, 'elevator', low, mid, p.id);
    }
    area(
        'north-middle-arm',
        'metro-intermediate',
        messageText('stations.metroUmeda.areas.northMiddleArm.name'),
        'paid',
        39,
        0,
        28,
        7
    );
    const ml = node('hall-lift-middle', 'metro-intermediate', 52, 0);
    const mh = node('hall-lift-hall', 'metro-hall', 52, 0);
    connection('hall-lift', 'elevator', ml, mh);
    facility(
        'lift',
        'metro-intermediate',
        messageText('stations.metroUmeda.facilities.lift.name'),
        'elevator',
        52,
        0,
        '中间层北端直梯上接北改札闸内。经北改札出闸后，才前往阪急三番街、Yodobashi 方向；此连接为示意，未提供完整无障碍寻路。'
    );
    const start = node('route-entry', 'metro-hall', 71, 0);
    const out = node('route-gate-out', 'metro-hall', 63, 0);
    const inside = node('route-gate-in', 'metro-hall', 57, 0);
    const hall = draft.nodes.find(n => n.id === 'metro-umeda-A-hall')!;
    const transfer = draft.nodes.find(n => n.id === 'metro-umeda-A-transfer')!;
    const middle = draft.nodes.find(n => n.id === 'metro-umeda-A-middle')!;
    const low = draft.nodes.find(n => n.id === 'metro-umeda-A-platform')!;
    const dest = node('destination', 'metro-platform', 16, 2.3);
    edge(start, out);
    edge(out, inside, 'gate');
    edge(inside, hall);
    edge(hall, transfer, 'escalator');
    edge(middle, low, 'stairs');
    edge(low, dest);
    facility(
        'stairs',
        'metro-platform',
        messageText('stations.metroUmeda.facilities.stairs.name'),
        'stairs',
        35,
        2.3,
        '站台先经短楼梯到中间层，再沿落台与扶梯到站厅；各层不混用 JR 楼层编号。'
    );
    facility(
        'escalator',
        'metro-intermediate',
        messageText('stations.metroUmeda.facilities.escalator.name'),
        'escalator',
        44,
        3,
        '从中间层到北改札站厅的首版连接示意。'
    );
    const end = (id: string) => draft.nodes.find(n => n.id === `metro-umeda-${id}`)!;
    draft.layout.guides = [
        {
            id: 'metro-north-circulation',
            name: messageText('stations.metroUmeda.entities.metroNorthCirculation.name'),
            access: 'paid',
            points: [
                { ...end('north-lift-platform') },
                { ...end('north-lift-middle'), caption: messageText('stations.metroUmeda.entities.northLiftMiddle.caption') },
                { ...end('hall-lift-middle'), caption: messageText('stations.metroUmeda.entities.hallLiftMiddle.caption') },
                end('hall-lift-hall'),
                {
                    id: 'guide-north-arrival',
                    level: 'metro-hall',
                    ...point(56, 0),
                    caption: messageText('stations.metroUmeda.entities.level56.caption')
                }
            ],
            evidence: {
                source: 'metro',
                pages: [1],
                detail: 'North elevator transfer represented using the draft middle passage and hall lift; schematic geometry, not a certified accessible route'
            },
        },
        {
            id: 'metro-central-circulation',
            name: messageText('stations.metroUmeda.entities.metroCentralCirculation.name'),
            access: 'paid',
            points: [
                { id: 'guide-mid-central', level: 'metro-intermediate', ...point(0, -3) },
                { ...end('H-transfer'), caption: messageText('stations.metroUmeda.entities.hTransfer.caption') },
                end('H-hall'),
                {
                    id: 'guide-west-arrival',
                    level: 'metro-hall',
                    ...point(7, -10),
                    caption: messageText('stations.metroUmeda.entities.level7.caption')
                }
            ],
            evidence: {
                source: 'metro',
                pages: [1],
                detail: 'Middle passage to central-west paid hall via modeled H bank; illustrative circulation, escalator involved'
            },
        },
        {
            id: 'metro-south-circulation',
            name: messageText('stations.metroUmeda.entities.metroSouthCirculation.name'),
            access: 'paid',
            points: [
                end('south-lift-platform'),
                { ...end('south-lift-middle'), caption: messageText('stations.metroUmeda.entities.southLiftMiddle.caption') },
                { ...end('E-transfer'), caption: messageText('stations.metroUmeda.entities.eTransfer.caption') },
                end('E-hall'),
                {
                    id: 'guide-south-arrival',
                    level: 'metro-hall',
                    ...point(-49, 0),
                    caption: messageText('stations.metroUmeda.entities.metroSouthCirculation.caption')
                }
            ],
            evidence: {
                source: 'metro',
                pages: [1],
                detail: 'South circulation via the draft platform lift, middle passage and E escalator bank; not the verified step-free route to the south gate'
            },
        }
    ];
    return draft;
}

export const metroStation = createStation({ ...districtPlacements.metro, planScale: 1 });
