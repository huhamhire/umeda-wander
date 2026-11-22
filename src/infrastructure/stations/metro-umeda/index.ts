import { messageText } from '../../i18n/index.ts';
import { stationDraft } from '../../station-draft.ts';
import { districtPlacements } from '../../district-placement.ts';
import { ekimoB1Evidence, southConcourse, southConcoursePartitions } from './south-concourse.ts';

export const northPaidBounds = { back: 42, gate: 60, halfWidth: 13.5 };

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
    draft.layout.partitions = southConcoursePartitions(point);
    draft.layout.partitions.push({
        id: 'metro-umeda-north-partition-west',
        level: 'metro-hall',
        from: point(northPaidBounds.back, -northPaidBounds.halfWidth),
        to: point(northPaidBounds.gate, -northPaidBounds.halfWidth),
        height: 2.3,
        thickness: .25,
        evidence: b.proof('North gate separates the public 3A/3B approach from the paid hall. West partition dimensions are fitted.'),
    });
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
            description: '五组改札与闸外公共通路；地下商场、JR 与阪急去向保留接口，尚无跨站完整路线。'
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
    // The operator distinguishes the south transfer landing from the north and centre landings.
    area(
        'middle',
        'metro-intermediate',
        messageText('stations.metroUmeda.areas.middle.name'),
        'paid',
        22.5,
        0,
        65,
        10
    );
    area('south-middle', 'metro-intermediate', messageText('stations.metroUmeda.areas.southMiddle.name'), 'paid', -26, 0, 26, 10);
    area(
        'north-paid',
        'metro-hall',
        messageText('stations.metroUmeda.areas.northPaid.name'),
        'paid',
        (northPaidBounds.gate + northPaidBounds.back) / 2,
        0,
        northPaidBounds.gate - northPaidBounds.back,
        northPaidBounds.halfWidth * 2
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
    area('east-paid', 'metro-hall', messageText('stations.metroUmeda.areas.eastPaid.name'), 'paid', 18, 7, 12, 14);
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
    area('west-paid', 'metro-hall', messageText('stations.metroUmeda.areas.westPaid.name'), 'paid', 18, -7, 12, 14);
    area('central-cross-public', 'metro-hall', messageText('stations.metroUmeda.areas.centralCrossPublic.name'), 'public', 7, 0, 10, 60);
    area('central-south-paid', 'metro-hall', messageText('stations.metroUmeda.areas.centralSouthPaid.name'), 'paid', -6, 0, 16, 22);
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
        (southConcourse.gate + southConcourse.stairEdge) / 2,
        0,
        southConcourse.stairEdge - southConcourse.gate,
        southConcourse.halfWidth * 2
    );
    // The confirmed B1 public route follows the eastern side of the station from ekimo Umeda (エキモ梅田).
    area('ekimo-public', 'metro-hall', messageText('stations.metroUmeda.areas.ekimoPublic.name'), 'public',
        -25, southConcourse.halfWidth + 3.5, 66, 7);
    draft.layout.areas.at(-1)!.evidence = ekimoB1Evidence;
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
        northPaidBounds.gate,
        0,
        '北改札闸内外分开。外侧指向阪急三番街、Yodobashi 等区域，接口尚未完成地理校准。',
        Math.PI / 2
    );
    facility(
        'east-gate',
        'metro-hall',
        messageText('stations.metroUmeda.facilities.eastGate.name'),
        'gate',
        12,
        7,
        '中北东检票口面向中部闸外横通道。',
        Math.PI / 2
    );
    facility(
        'west-gate',
        'metro-hall',
        messageText('stations.metroUmeda.facilities.westGate.name'),
        'gate',
        12,
        -7,
        '中北西检票口面向同一闸外横通道，西端往 JR。',
        Math.PI / 2
    );
    facility(
        'central-south-gate', 'metro-hall', messageText('stations.metroUmeda.facilities.centralSouthGate.name'), 'gate',
        2, 0, '中南检票口位于闸外横通道的南侧。', Math.PI / 2
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
        ['C', 27, 2.3, 14.4],
        ['E', -24, 2.3, -39],
        ['F', 35, -2.3, 50],
        ['H', 27, -2.3, 14.4],
        ['J', -24, -2.3, -39]
    ] as const) {
        const sign = Math.sign(hallX - x);
        const low = node(`${key}-platform`, 'metro-platform', x, z);
        const middle = node(`${key}-middle`, 'metro-intermediate', x + sign * 6, z);
        connection(`bank-${key}`, 'stairs', low, middle, p.id);
        // Each bank terminates on the paid side of its own hall.
        const high = node(`${key}-hall`, 'metro-hall', hallX, z);
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
                { id: 'guide-mid-central', level: 'metro-intermediate', ...point(26, -3) },
                { ...end('H-transfer'), caption: messageText('stations.metroUmeda.entities.hTransfer.caption') },
                end('H-hall'),
                {
                    id: 'guide-west-arrival',
                    level: 'metro-hall',
                    ...point(14, -7),
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
