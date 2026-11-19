import { messageText } from '../../i18n/index.ts';
import { stationDraft } from '../../station-draft.ts';
import { districtPlacements } from '../../district-placement.ts';
// Local +X heads north; placement is a district sketch, not a surveyed footprint.
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
        'hankyu-umeda',
        messageText('stations.hankyuUmeda.name'),
        'hankyu',
        placement.origin,
        placement.angle,
        -1,
        placement.planScale
    );
    const { draft, area, facility, node, edge, connection, platform, proof } = b;
    draft.levels = [
        {
            id: 'hankyu-ground',
            station: draft.id,
            label: '1F',
            name: messageText('stations.hankyuUmeda.entities.hankyuGround.name'),
            y: 0,
            stackIndex: 0,
            description: '阪急地面入口、BIGMAN 方向及公共通路；周边商场仅保留接口。'
        },
        {
            id: 'hankyu-hall',
            station: draft.id,
            label: '2F',
            name: messageText('stations.hankyuUmeda.entities.hankyuHall.name'),
            y: 8,
            stackIndex: 2,
            description: '中央改札与茶屋町口改札分别建模，闸外公共站厅经阪急终端大楼直梯接 3F，闸内设独立的站台通道。'
        },
        {
            id: 'hankyu-platform',
            station: draft.id,
            label: '3F',
            name: messageText('stations.hankyuUmeda.entities.hankyuPlatform.name'),
            y: 16,
            stackIndex: 3,
            description: '1–9 番线与梳状终端站台；1–3 京都线、4–6 宝冢线、7–9 神户线。机柜与设施数量为示意。'
        },
    ];
    area(
        'ground',
        'hankyu-ground',
        messageText('stations.hankyuUmeda.areas.ground.name'),
        'public',
        -7,
        0,
        132,
        82
    );
    area(
        'bigman',
        'hankyu-ground',
        messageText('stations.hankyuUmeda.areas.bigman.name'),
        'service',
        -60,
        -24,
        9,
        13,
        2.2
    );
    area(
        'central-public',
        'hankyu-hall',
        messageText('stations.hankyuUmeda.areas.centralPublic.name'),
        'public',
        -24,
        0,
        24,
        82
    );
    area(
        'central-paid',
        'hankyu-hall',
        messageText('stations.hankyuUmeda.areas.centralPaid.name'),
        'paid',
        -3,
        0,
        18,
        76
    );
    area(
        'terminal-lift-approach',
        'hankyu-hall',
        messageText('stations.hankyuUmeda.areas.terminalLiftApproach.name'),
        'public',
        -52,
        -12,
        34,
        12
    );
    const liftApproach = draft.layout.areas.at(-1)!;
    liftApproach.label = false;
    liftApproach.evidence = proof('The 2F public concourse reaches Terminal Building elevator 2; the landing and approach outline are fitted.');
    liftApproach.evidence.urls = ['https://www.hankyu.co.jp/station/umeda_ev.html'];
    area(
        'chaya-paid',
        'hankyu-hall',
        messageText('stations.hankyuUmeda.areas.chayaPaid.name'),
        'paid',
        43,
        0,
        16,
        76
    );
    area(
        'chaya-public',
        'hankyu-hall',
        messageText('stations.hankyuUmeda.areas.chayaPublic.name'),
        'public',
        60,
        0,
        18,
        82
    );
    area(
        'jr-interface',
        'hankyu-hall',
        messageText('stations.hankyuUmeda.areas.jrInterface.name'),
        'public',
        -26,
        46,
        12,
        12
    );
    area(
        'upper-public',
        'hankyu-platform',
        messageText('stations.hankyuUmeda.areas.upperPublic.name'),
        'public',
        -64,
        0,
        18,
        82
    );
    area(
        'terminal-head',
        'hankyu-platform',
        messageText('stations.hankyuUmeda.areas.terminalHead.name'),
        'paid',
        -49,
        0,
        12,
        76
    );
    facility(
        'gate-3f',
        'hankyu-platform',
        messageText('stations.hankyuUmeda.facilities.gate3f.name'),
        'gate',
        -55,
        0,
        '3F 终端侧改札。进入后沿横向通道选择番线，线路配色来自参考图。',
        Math.PI / 2
    );
    facility(
        'gate-central',
        'hankyu-hall',
        messageText('stations.hankyuUmeda.facilities.gateCentral.name'),
        'gate',
        -12,
        0,
        '2F 中央改札，位于 3F 站台下方；经闸内设施上至各番线。',
        Math.PI / 2
    );
    facility(
        'gate-chaya',
        'hankyu-hall',
        messageText('stations.hankyuUmeda.facilities.gateChaya.name'),
        'gate',
        51,
        0,
        '与中央改札分开的另一组 2F 改札；周边店铺与出口以现场为准。',
        Math.PI / 2
    );
    facility(
        'machines-2f',
        'hankyu-hall',
        messageText('stations.hankyuUmeda.facilities.machines2f.name'),
        'ticket-machine',
        -33,
        14,
        '中央口闸外售票机，数量与间距为示意。',
        -Math.PI / 2
    );
    facility(
        'machines-3f',
        'hankyu-platform',
        messageText('stations.hankyuUmeda.facilities.machines3f.name'),
        'ticket-machine',
        -71,
        13,
        '3F 改札闸外沿墙机柜。',
        -Math.PI / 2
    );
    facility(
        'entry',
        'hankyu-ground',
        messageText('stations.hankyuUmeda.facilities.entry.name'),
        'entrance',
        -59,
        0,
        '地面入口及 BIGMAN 周边的公共通路示意，不表示与 JR 已建立完整可导航换乘。'
    );
    facility(
        'tourist-center-luggage',
        'hankyu-ground',
        messageText('stations.hankyuUmeda.facilities.touristCenterLuggage.name'),
        'luggage-storage',
        -48,
        18,
        '1F 公共通路的阪急游客中心提供人工行李寄存。'
    ).evidence.urls = ['https://www.hankyu.co.jp/station/tourist_center/index.html'];
    facility(
        'bigman-lockers',
        'hankyu-ground',
        messageText('stations.hankyuUmeda.facilities.bigmanLockers.name'),
        'locker',
        -50,
        -28,
        '1F BIGMAN 前广场一带的多组柜集中标记。'
    );
    facility(
        'bus-terminal-lockers',
        'hankyu-ground',
        messageText('stations.hankyuUmeda.facilities.busTerminalLockers.name'),
        'locker',
        46,
        -18,
        '1F 阪急三番街北馆高速巴士总站附近的柜组。'
    );
    facility(
        'central-lockers',
        'hankyu-hall',
        messageText('stations.hankyuUmeda.facilities.centralLockers.name'),
        'locker',
        -23,
        -29,
        '2F 中央改札外公共站厅的多组柜集中标记。'
    );
    facility(
        'chayamachi-lockers',
        'hankyu-hall',
        messageText('stations.hankyuUmeda.facilities.chayamachiLockers.name'),
        'locker',
        57,
        -20,
        '2F 茶屋町口改札旁公共侧的柜组。'
    );
    facility(
        'kobe-lockers',
        'hankyu-platform',
        messageText('stations.hankyuUmeda.facilities.kobeLockers.name'),
        'locker',
        -64,
        34,
        '3F 神户线侧闸外寄存柜室。'
    ).evidence.urls = ['https://multiecube.com/location/1339'];
    facility(
        'kyoto-lockers',
        'hankyu-platform',
        messageText('stations.hankyuUmeda.facilities.kyotoLockers.name'),
        'locker',
        -48,
        -32,
        '3F 闸内京都线 1 番线的站台端部。'
    );
    // Ten platform strips flank nine tracks. The outermost strip is alighting-only.
    for (let i = 0; i < 10; i++) {
        const z = -32.85 + i * 7.3;
        const track = i + 1;
        const line = i < 3 ? messageText('railways.hankyu.kyoto') : i < 6 ? messageText('railways.hankyu.takarazuka') : messageText('railways.hankyu.kobe');
        const p = platform(
            `platform-${i + 1}`,
            'hankyu-platform',
            i < 9 ? [track] : [],
            12,
            z,
            110,
            4,
            {
                terminal: true,
                trackSides: [1],
                lineName: i < 9 ? line : undefined,
                lineColor: i < 3 ? 0x579a67 : i < 6 ? 0xd3923f : 0x5c8fb4,
                name: i < 9 ? messageText('stations.hankyuUmeda.platforms.numberAndLine.name', { track: track, line: line }) : messageText('stations.hankyuUmeda.platforms.outerAlighting.name')
            }
        );
        if (i === 9) {
            continue;
        }
        const lower = node(`central-${track}-lower`, 'hankyu-hall', -3, z);
        const upper = node(`central-${track}-upper`, 'hankyu-platform', 7, z);
        connection(`central-bank-${track}`, 'escalator', lower, upper, p.id);
        const chayaLow = node(`chaya-${track}-lower`, 'hankyu-hall', 43, z);
        const chayaHigh = node(`chaya-${track}-upper`, 'hankyu-platform', 33, z);
        connection(`chaya-bank-${track}`, 'stairs', chayaLow, chayaHigh, p.id);
        if (track === 1) {
            const a = node(`lift-${track}-lower`, 'hankyu-hall', -8, z);
            const c = node(`lift-${track}-upper`, 'hankyu-platform', -8, z);
            connection(`lift-${track}`, 'elevator', a, c, p.id);
        }
    }
    facility(
        'escalator',
        'hankyu-hall',
        messageText('stations.hankyuUmeda.facilities.escalator.name'),
        'escalator',
        -3,
        -32.85,
        '选取的中央口至站台扶梯；数量和位置为首版示意。'
    );
    facility(
        'lift',
        'hankyu-hall',
        messageText('stations.hankyuUmeda.facilities.lift.name'),
        'elevator',
        -8,
        -32.85,
        '参考图中的 2F–3F 直梯，先到站台层再选择各线，不按每条线路虚构一座直梯。'
    );
    const lift2a = node('public-lift-1', 'hankyu-ground', -65, -12);
    const lift2b = node('public-lift-2', 'hankyu-hall', -65, -12);
    const lift2c = node('public-lift-3', 'hankyu-platform', -65, -12);
    const liftEvidence = proof('Terminal Building elevator 2 has public 1F, 2F and 3F landings in the Hankyu (阪急) diagram; shaft position fitted.');
    liftEvidence.urls = ['https://www.hankyu.co.jp/station/umeda_ev.html'];
    connection('public-lift', 'elevator', lift2a, lift2b).evidence = liftEvidence;
    connection('public-lift-upper', 'elevator', lift2b, lift2c).evidence = liftEvidence;
    const e = node('route-entry', 'hankyu-ground', -59, 0);
    const g0 = node('public-rise-lower', 'hankyu-ground', -30, 0);
    const g1 = node('public-rise-upper', 'hankyu-hall', -21, 0);
    connection('public-rise', 'escalator', g0, g1);
    edge(e, g0);
    edge(g0, g1, 'escalator');
    // Across the 3F gate frontage, the public banks descend past 2F to the ground concourse.
    for (const [key, kind, z, reference, width] of [
        ['direct-1f-3f', 'escalator', -31, 'A', undefined],
        ['direct-1f-3f-b', 'escalator', -22, 'B', undefined],
        ['direct-1f-3f-d', 'escalator', 8, 'D', undefined],
        ['direct-1f-3f-e', 'escalator', 27, 'E', undefined],
        ['direct-stairs-a', 'stairs', -36.5, 'A', 3.7],
        ['direct-stairs-c', 'stairs', -2, 'C', 4.4],
        ['direct-stairs-e', 'stairs', 34, 'E', 3.7],
    ] as const) {
        const low = node(`${key}-low`, 'hankyu-ground', -71, z);
        const high = node(`${key}-high`, 'hankyu-platform', -57, z);
        const bank = connection(key, kind, low, high);
        if (width) {
            bank.width = width;
        }
        bank.evidence = proof(`Public 3F–1F bank ${reference} in the Hankyu (阪急) station diagram; clearances and width fitted.`);
        bank.evidence.urls = ['https://www.city.osaka.lg.jp/shimin/page/0000600942.html'];
    }
    const out = node('gate-out', 'hankyu-hall', -15, 0);
    const inside = node('gate-in', 'hankyu-hall', -8, 0);
    edge(g1, out);
    edge(out, inside, 'gate');
    const lower = draft.nodes.find(n => n.id === 'hankyu-umeda-central-1-lower')!;
    const upper = draft.nodes.find(n => n.id === 'hankyu-umeda-central-1-upper')!;
    const aisle = node('route-aisle', 'hankyu-hall', -11, 0);
    const turn = node('route-turn', 'hankyu-hall', -11, -32.85);
    const dest = node('destination', 'hankyu-platform', 23, -32.85);
    edge(inside, aisle);
    edge(aisle, turn);
    edge(turn, lower);
    edge(lower, upper, 'escalator');
    edge(upper, dest);
    facility(
        'kyoto-platform',
        'hankyu-platform',
        messageText('stations.hankyuUmeda.facilities.kyotoPlatform.name'),
        'entrance',
        23,
        -32.85,
        '京都线站台方向示意。本站采用自己的番线身份，与 JR、Metro 的同号番线互不混用。'
    );
    return draft;
}

export const hankyuStation = createStation(districtPlacements.hankyu);
