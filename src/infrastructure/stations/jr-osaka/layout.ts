import { messageText } from '../../i18n/index.ts';
import { passageOutline, joinedPassageOutlines, platformLocalPoint, rotatePoint } from '../../../domain/map/geometry.ts';
import { undergroundRotationRad, undergroundSketchCorrectionRad } from '../../station-orientation.ts';
import { refineUpperLevelLinks } from './upper-links.ts';
import type { Evidence, Facility, FloorArea, Level, Platform, RouteNode, RouteEdge, StationLayout, VerticalConnection } from '../../../domain/map/model.ts';
// Source: JR West Osaka Station (大阪駅) guide, current as of 2026-01-14.
// Level/name/diagram references are checked; all X/Z and heights remain schematic.
/**
 * Record JR reference pages and interpretation limits without presenting fitted coordinates as surveyed facts.
 */
const source = (pages: number[], detail: string): Evidence => ({ pages, detail });
export const levels: Level[] = [
    {
        id: 'underground-platform',
        label: 'B2F',
        name: messageText('stations.jrOsaka.levels.undergroundPlatform.name'),
        y: -16,
        description: '梅北地下站台位于 B2F，两组站台为 21/22 与 23/24 番线。HARUKA 等列车在此区域停靠，乘车以当天站内信息为准。'
    },
    {
        id: 'underground-hall',
        label: 'B1F',
        name: messageText('stations.jrOsaka.levels.undergroundHall.name'),
        y: -8,
        description: 'B1F 梅北地下口与闸内站厅，向下连接 B2F 站台；它与 1F 中央改札口是不同区域。'
    },
    {
        id: 'concourse',
        label: '1F',
        name: messageText('stations.jrOsaka.levels.concourse.name'),
        y: 0,
        description: '中央改札口在地上 1F。公共中央通路与闸内区域分别显示。'
    },
    {
        id: 'mezzanine',
        label: 'M2F',
        name: messageText('stations.jrOsaka.levels.mezzanine.name'),
        y: 4,
        description: '1F 与 2F 之间的夹层，包含中央口与樱桥口内通道；不是地下层。此标高另显示南门大楼 2F 入口。'
    },
    {
        id: 'platform',
        label: '2F',
        name: messageText('stations.jrOsaka.levels.platform.name'),
        y: 8,
        description: '六组地面站台：1/2、3/4、5/6、7/8、9/10 与 11 番线。南门大楼 3F 入口在此标高单独标注。'
    },
    {
        id: 'bridge',
        label: '3F',
        name: messageText('stations.jrOsaka.levels.bridge.name'),
        y: 16,
        description: '公共南北连络桥与桥上改札内区域并行，北接开放中庭，南经 15/16/I 连接南门大楼 3F，另有同标高通道往大楼 4F。'
    },
    {
        id: 'jr-toki-plaza',
        label: '5F',
        name: messageText('stations.jrOsaka.entities.tokiPlaza.name'),
        y: 25,
        description: '时空广场北侧扶梯落台，标高为展示拟合。'
    },
];
/**
 * Construct a JR-local floor rectangle from its centre, width and depth.
 */
const rectangle = (x: number, z: number, w: number, d: number) => [
    { x: x - w / 2, z: z - d / 2 },
    { x: x + w / 2, z: z - d / 2 },
    { x: x + w / 2, z: z + d / 2 },
    { x: x - w / 2, z: z + d / 2 },
];
const p1 = source([5], '1F plan: public concourses, named gates and service areas');
const pm = source([4], 'Walkways inside Central/Sakurabashi gates on Mezzanine 2F');
const pp = source([3], '2F platforms numbered 1–11; north at track 11 side');
const pb = source([2], '3F North-South Bridge, Bridge Gate and paid platform access');
// Central Court's raised side stairs open onto the same landing while the centre is set back.
const southCentralLanding = [
    { x: -9, z: 47 }, { x: -4, z: 47 }, { x: -4, z: 49 },
    { x: 4, z: 49 }, { x: 4, z: 47 }, { x: 9, z: 47 },
    { x: 9, z: 56 }, { x: 6, z: 61 }, { x: -6, z: 61 }, { x: -9, z: 56 }
];
export const areas: FloorArea[] = [
    {
        id: 'north-b1-public',
        level: 'underground-hall',
        name: messageText('stations.jrOsaka.areas.northB1Public.name'),
        kind: 'public',
        outline: rectangle(-15, -52, 40, 8),
        label: true,
        evidence: source([6], 'B1F North Gate building, public route toward Umekita Underground Gate')
    },
    {
        id: 'north-b1-portal',
        level: 'underground-hall',
        name: messageText('stations.jrOsaka.areas.northB1Portal.name'),
        kind: 'public',
        outline: rectangle(-4, -61, 8, 10),
        label: true,
        evidence: source([6, 8], 'Northern underground public-area boundary; surrounding buildings not fully modeled')
    },
    {
        id: 'west-public',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.westPublic.name'),
        kind: 'public',
        outline: rectangle(-81, 0, 10, 73),
        label: true,
        evidence: source([7], '1F West Gate exterior passage')
    },
    {
        id: 'west-paid',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.westPaid.name'),
        kind: 'paid',
        outline: rectangle(-67, 0, 16, 68),
        evidence: source([7], '1F West Gate paid passage')
    },
    {
        id: 'west-south-link',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.westSouthLink.name'),
        kind: 'public',
        outline: rectangle(-68, 41, 36, 9),
        evidence: source([5, 7], 'West Gate / Sakurabashi public side')
    },
    {
        id: 'umekita-public',
        level: 'underground-hall',
        name: messageText('stations.jrOsaka.areas.umekitaPublic.name'),
        kind: 'public',
        outline: [
            { x: -104, z: -106 },
            { x: -104, z: -119 },
            { x: -99, z: -119 },
            { x: -99, z: -127 },
            { x: -91, z: -127 },
            { x: -91, z: -119 },
            { x: -79, z: -119 },
            { x: -79, z: -124 },
            { x: -74, z: -124 },
            { x: -74, z: -106 }
        ],
        label: true,
        evidence: source([8], 'B1F Umekita Underground Gate public side')
    },
    {
        id: 'umekita-paid',
        level: 'underground-hall',
        name: messageText('stations.jrOsaka.areas.umekitaPaid.name'),
        kind: 'paid',
        outline: [
            { x: -110.5, z: -106 },
            { x: -75.5, z: -106 },
            { x: -75.5, z: -89 },
            { x: -79, z: -80 },
            { x: -87, z: -80 },
            { x: -92, z: -84 },
            { x: -101, z: -80 },
            { x: -110.5, z: -83 }
        ],
        label: true,
        evidence: source([8], 'B1F paid concourse above platforms')
    },
    {
        id: 'umekita-east-link',
        level: 'underground-hall',
        name: messageText('stations.jrOsaka.areas.umekitaEastLink.name'),
        kind: 'public',
        outline: rectangle(-58, -112, 32, 7),
        evidence: source([6, 8], 'Public route toward Central Gate; only boundary stub modeled')
    },
    {
        id: 'central-public',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.centralPublic.name'),
        kind: 'public',
        outline: [
            { x: -8.5, z: -36 },
            { x: 8.5, z: -36 },
            { x: 8.5, z: 25 },
            { x: 20, z: 29 },
            { x: 20, z: 36 },
            { x: -8.5, z: 36 }
        ],
        label: true,
        evidence: p1
    },
    {
        id: 'central-paid',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.centralPaid.name'),
        kind: 'paid',
        outline: [
            { x: -37.5, z: -34 },
            { x: -8.5, z: -34 },
            { x: -8.5, z: 34 },
            { x: -50.5, z: 34 },
            { x: -50.5, z: 24 },
            { x: -37.5, z: 24 }
        ],
        evidence: p1
    },
    {
        id: 'north-public',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.northPublic.name'),
        kind: 'public',
        outline: rectangle(0, -41, 116, 10),
        evidence: p1
    },
    {
        id: 'south-public',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.southPublic.name'),
        kind: 'public',
        outline: rectangle(0, 41, 116, 10),
        evidence: p1
    },
    {
        id: 'midosuji-public',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.midosujiPublic.name'),
        kind: 'public',
        outline: rectangle(53, 0, 10, 72),
        label: true,
        evidence: p1
    },
    {
        id: 'midosuji-paid',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.midosujiPaid.name'),
        kind: 'paid',
        outline: rectangle(36.75, 0, 20.5, 68),
        evidence: p1
    },
    {
        id: 'eki-marche',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.ekiMarche.name'),
        kind: 'commercial',
        outline: rectangle(-47, -2, 17, 57),
        height: 1.8,
        label: true,
        evidence: p1
    },
    {
        id: 'ticket-office',
        level: 'concourse',
        name: messageText('facilities.types.ticketOffice'),
        kind: 'service',
        outline: rectangle(18, -7, 17, 12),
        height: 2.2,
        evidence: p1
    },
    {
        id: 'central-court-shop',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.centralCourtShop.name'),
        kind: 'commercial',
        outline: rectangle(18, 18, 17, 15),
        height: 1.6,
        label: true,
        evidence: p1
    },
    {
        id: 'information',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.information.name'),
        kind: 'service',
        outline: rectangle(17, -21, 16, 11),
        height: 1.7,
        evidence: p1
    },
    {
        id: 'north-lucua1100',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.northLucua1100.name'),
        kind: 'commercial',
        outline: rectangle(-33, -52, 41, 13),
        height: 2.8,
        label: true,
        evidence: p1
    },
    {
        id: 'north-lucua',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.northLucua.name'),
        kind: 'commercial',
        outline: rectangle(32, -52, 38, 13),
        height: 2.8,
        label: true,
        evidence: p1
    },
    {
        id: 'south-daimaru',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.southDaimaru.name'),
        kind: 'commercial',
        outline: rectangle(20, 55, 22, 16),
        elevationOffset: 1.3,
        height: 2.2,
        label: true,
        evidence: p1
    },
    {
        id: 'south-granvia',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.southGranvia.name'),
        kind: 'commercial',
        outline: rectangle(-16, 55, 14, 16),
        elevationOffset: 1.3,
        height: 2.2,
        label: true,
        evidence: p1
    },
    {
        id: 'south-central-raised',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.southCentralRaised.name'),
        kind: 'public',
        outline: southCentralLanding.map(point => ({ ...point })),
        elevationOffset: 1.3,
        label: true,
        evidence: source(
            [5],
            'Daimaru-side raised landing connects north to Central Court on both sides; user photo, height schematic'
        )
    },
    {
        id: 'south-raised-plinth',
        level: 'concourse',
        name: messageText('stations.jrOsaka.areas.southRaisedPlinth.name'),
        kind: 'service',
        outline: southCentralLanding.map(point => ({ ...point })),
        height: 1.3,
        evidence: source([5], 'Support volume for schematic local raised entrance, not an extra floor')
    },
    {
        id: 'crost-public',
        level: 'underground-hall',
        name: messageText('stations.jrOsaka.areas.crostPublic.name'),
        kind: 'public',
        outline: rectangle(0, 46, 28, 14),
        label: true,
        evidence: source([5, 6], 'Crost B1F landing south of Central Court; user photo confirms southward descent')
    },
    {
        id: 'central-mezz',
        level: 'mezzanine',
        name: messageText('stations.jrOsaka.areas.centralMezz.name'),
        kind: 'paid',
        outline: rectangle(-25, 0, 6, 68),
        label: true,
        evidence: pm
    },
    {
        id: 'sakurabashi-mezz',
        level: 'mezzanine',
        name: messageText('stations.jrOsaka.areas.sakurabashiMezz.name'),
        kind: 'paid',
        outline: rectangle(-40, -3, 5, 56),
        label: true,
        evidence: pm
    },
    {
        id: 'mezz-link',
        level: 'mezzanine',
        name: messageText('stations.jrOsaka.areas.mezzLink.name'),
        kind: 'paid',
        outline: rectangle(-32.5, 21, 20, 6),
        evidence: pm
    },
    {
        id: 'midosuji-mezz-north',
        level: 'mezzanine',
        name: messageText('stations.jrOsaka.areas.midosujiMezzNorth.name'),
        kind: 'paid',
        outline: rectangle(42, -30, 15, 6),
        evidence: pm
    },
    {
        id: 'midosuji-mezz-south',
        level: 'mezzanine',
        name: messageText('stations.jrOsaka.areas.midosujiMezzSouth.name'),
        kind: 'paid',
        outline: rectangle(42, 30, 23, 6),
        evidence: pm
    },
    {
        id: 'bridge-public',
        level: 'bridge',
        name: messageText('stations.jrOsaka.areas.bridgePublic.name'),
        kind: 'public',
        // Overlap the north public landing so the fitted bridge remains continuous after projection.
        outline: rectangle(-8, -0.5, 8, 77),
        label: true,
        evidence: pb
    },
    {
        id: 'bridge-paid',
        level: 'bridge',
        name: messageText('ui.facilities.bridgeStore'),
        kind: 'paid',
        outline: rectangle(2.5, 0, 13, 70),
        label: true,
        evidence: pb
    },
    {
        id: 'bridge-convenience-store',
        level: 'bridge',
        name: messageText('stations.jrOsaka.areas.bridgeConvenienceStore.name'),
        kind: 'commercial',
        outline: rectangle(-1, 25, 3.5, 4.5),
        height: 1.4,
        evidence: source(
            [2],
            'Seven-Eleven Heart-in symbol near the south end of the Bridge Gate paid concourse, adjacent to banks 11/13; frontage schematic'
        )
    },
    {
        id: 'bridge-ticket-wall',
        level: 'bridge',
        name: messageText('stations.jrOsaka.areas.bridgeTicketWall.name'),
        kind: 'service',
        outline: rectangle(-4.2, -11, 0.3, 7.5),
        height: 3.6,
        evidence: source([2], 'Ticket machines backed against the public passage wall; wall dimensions schematic')
    },
    {
        id: 'bridge-north',
        level: 'bridge',
        name: messageText('stations.jrOsaka.areas.bridgeNorth.name'),
        kind: 'public',
        outline: rectangle(0, -43.5, 61, 11),
        evidence: pb
    },
    {
        id: 'bridge-south',
        level: 'bridge',
        name: messageText('stations.jrOsaka.areas.bridgeSouth.name'),
        kind: 'public',
        outline: rectangle(-3, 44, 25, 12),
        evidence: pb
    },
];
export const platforms: Platform[] = [
    {
        id: 'p11',
        level: 'platform',
        tracks: [11],
        x: 0,
        z: -30,
        length: 119,
        width: 6,
        rotationRad: 0,
        evidence: pp
    },
    {
        id: 'p9-10',
        level: 'platform',
        tracks: [9, 10],
        x: 0,
        z: -18,
        length: 120,
        width: 7,
        rotationRad: 0,
        evidence: pp
    },
    {
        id: 'p7-8',
        level: 'platform',
        tracks: [7, 8],
        x: 0,
        z: -6,
        length: 120,
        width: 7,
        rotationRad: 0,
        evidence: pp
    },
    {
        id: 'p5-6',
        level: 'platform',
        tracks: [5, 6],
        x: 0,
        z: 6,
        length: 120,
        width: 7,
        rotationRad: 0,
        evidence: pp
    },
    {
        id: 'p3-4',
        level: 'platform',
        tracks: [3, 4],
        x: 0,
        z: 18,
        length: 120,
        width: 7,
        rotationRad: 0,
        evidence: pp
    },
    {
        id: 'p1-2',
        level: 'platform',
        tracks: [1, 2],
        x: 0,
        z: 30,
        length: 120,
        width: 7,
        rotationRad: 0,
        evidence: pp
    },
    {
        id: 'p21-22',
        level: 'underground-platform',
        tracks: [21, 22],
        x: -88,
        z: -109,
        length: 86,
        width: 7,
        rotationRad: undergroundRotationRad,
        evidence: {
            ...source(
                [8],
                'B2F platform for tracks 21 and 22; schematic length fitted to OSM outline ~218m at 2.5m per display unit'
            ),
            urls: ['https://www.openstreetmap.org/way/695972639']
        }
    },
    {
        id: 'p23-24',
        level: 'underground-platform',
        tracks: [23, 24],
        x: -104,
        z: -109,
        length: 86,
        width: 7,
        rotationRad: undergroundRotationRad,
        evidence: {
            ...source(
                [8],
                'B2F platform for tracks 23 and 24; schematic length fitted to OSM outline ~212m at 2.5m per display unit'
            ),
            urls: ['https://www.openstreetmap.org/way/695972638']
        }
    },
];
export const facilities: Facility[] = [
    {
        id: 'west-gate',
        name: messageText('stations.jrOsaka.facilities.westGate.name'),
        kind: 'gate',
        level: 'concourse',
        x: -75,
        z: 20,
        axis: 'z',
        note: '地上 1F 西口。图示通过 92 号扶梯及 B2F 连接通道通往梅北地下口；连接通道不是直达所有地面站台的捷径。',
        evidence: source([7, 8], 'West Gate and connecting walkway')
    },
    {
        id: 'umekita-gate',
        name: messageText('stations.jrOsaka.facilities.umekitaGate.name'),
        kind: 'gate',
        level: 'underground-hall',
        x: -88,
        z: -105,
        axis: 'x',
        note: '位于 B1F，向下前往 B2F 的 21–24 番线。与地上 1F 中央改札口不同。',
        evidence: source([8], 'Umekita Underground Gate at B1F')
    },
    {
        id: 'umekita-platform',
        name: messageText('stations.jrOsaka.facilities.umekitaPlatform.name'),
        kind: 'entrance',
        level: 'underground-platform',
        x: -88,
        z: -112,
        note: 'B2F 两组地下站台之一；HARUKA、黑潮等列车使用梅北区域。具体班次、方向和番线以当天站内信息为准。',
        evidence: source([8], 'B2F underground platforms 21–24')
    },
    {
        id: 'umekita-link',
        name: messageText('stations.jrOsaka.facilities.umekitaLink.name'),
        kind: 'entrance',
        level: 'underground-platform',
        x: -76,
        z: -55,
        note: '参考图注明此闸内通道用于西口与梅北地下口之间通行。几何长度及走向已简化，不显示步行时间。',
        evidence: source([7, 8], 'Connecting walkway restriction note')
    },
    {
        id: 'entry',
        name: messageText('stations.jrOsaka.facilities.entry.name'),
        kind: 'entrance',
        level: 'concourse',
        x: 0,
        z: 41,
        note: '1F 公共中央通路的南侧，北侧通往 LUCUA 一侧。入口坐标为简化布置。',
        evidence: p1
    },
    {
        id: 'gate-central-north',
        name: messageText('stations.jrOsaka.facilities.gateCentralNorth.name'),
        kind: 'gate',
        level: 'concourse',
        x: -9,
        z: -15,
        axis: 'z',
        note: '按 1F 图在中央通路西侧补上北侧闸机组，与南侧组共用付费区边界。机柜数量与尺寸为示意。',
        evidence: p1
    },
    {
        id: 'gate',
        name: messageText('stations.jrOsaka.facilities.gate.name'),
        kind: 'gate',
        level: 'concourse',
        x: -9,
        z: 4,
        axis: 'z',
        note: '位于地上 1F，西侧为闸内区域，东侧为公共中央通路；不是地下闸口。',
        evidence: source([5], 'Central Gate, 1F')
    },
    {
        id: 'sakurabashi-gate',
        name: messageText('stations.jrOsaka.facilities.sakurabashiGate.name'),
        kind: 'gate',
        level: 'concourse',
        x: -42,
        z: 32,
        axis: 'x',
        note: '参考图位于车站西南侧 1F。本轮仅表现位置关系，不提供该闸口完整导航。',
        evidence: p1
    },
    {
        id: 'eki-gate',
        name: messageText('stations.jrOsaka.facilities.ekiGate.name'),
        kind: 'gate',
        level: 'concourse',
        x: -37,
        z: 12,
        axis: 'z',
        note: 'Eki Marché 一侧的闸口，与中央改札分别建模。',
        evidence: p1
    },
    {
        id: 'midosuji-gate',
        name: messageText('stations.jrOsaka.facilities.midosujiGate.name'),
        kind: 'gate',
        level: 'concourse',
        x: 47,
        z: 0,
        axis: 'z',
        note: '1F 车站东侧，邻接御堂筋公共通路；路线尚未录入。',
        evidence: p1
    },
    {
        id: 'south-gate',
        name: messageText('stations.jrOsaka.facilities.southGate.name'),
        kind: 'gate',
        level: 'concourse',
        x: 38,
        z: 35,
        axis: 'x',
        note: '东南侧 1F 闸口；与南门大楼的名称不同。',
        evidence: p1
    },
    {
        id: 'machines-central',
        name: messageText('stations.jrOsaka.facilities.machinesCentral.name'),
        kind: 'ticket-machine',
        level: 'concourse',
        x: 6,
        z: -5,
        rotationRad: Math.PI / 2,
        note: '中央公共通路内、JR 售票处西侧的自动售票机位置。柜台与售票机分开标注，机型和数量以现场为准。',
        evidence: p1
    },
    {
        id: 'machines-sakura',
        name: messageText('stations.jrOsaka.facilities.machinesSakura.name'),
        kind: 'ticket-machine',
        level: 'concourse',
        x: -46,
        z: 39,
        rotationRad: 0,
        note: '樱桥改札附近的闸外售票机组，依据 1F 图整理。',
        evidence: p1
    },
    {
        id: 'machines-west',
        name: messageText('stations.jrOsaka.facilities.machinesWest.name'),
        kind: 'ticket-machine',
        level: 'concourse',
        x: -83,
        z: 29,
        rotationRad: -Math.PI / 2,
        note: '西口闸外通路内的售票机组，位置关系据西口平面图整理。',
        evidence: source([7], 'West Gate outside-ticket-gate ticket machines')
    },
    {
        id: 'machines-midosuji',
        name: messageText('stations.jrOsaka.facilities.machinesMidosuji.name'),
        kind: 'ticket-machine',
        level: 'concourse',
        x: 51,
        z: -20,
        rotationRad: -Math.PI / 2,
        note: '御堂筋公共通路侧的售票机位置，位于闸外。',
        evidence: p1
    },
    {
        id: 'machines-bridge',
        name: messageText('stations.jrOsaka.facilities.machinesBridge.name'),
        kind: 'ticket-machine',
        level: 'bridge',
        x: -4.8,
        z: -11,
        rotationRad: Math.PI / 2,
        note: '3F 公共南北连络桥、桥上改札外侧的靠墙售票机组，操作面朝公共通道。',
        evidence: pb
    },
    {
        id: 'machines-umekita',
        name: messageText('stations.jrOsaka.facilities.machinesUmekita.name'),
        kind: 'ticket-machine',
        level: 'underground-hall',
        x: -79,
        z: -114,
        rotationRad: 0,
        note: 'B1F 梅北地下改札闸外，售票机随地下区域朝向布置。',
        evidence: source([8], 'Umekita B1F outside-ticket-gate ticket machines')
    },
    {
        id: 'daimaru-steps',
        name: messageText('stations.jrOsaka.facilities.daimaruSteps.name'),
        kind: 'stairs',
        level: 'concourse',
        x: -7,
        z: 39,
        note: '南端往大丸／南中央口的小段台阶，与 1F 公共通路之间有局部高差；不作为独立完整楼层。高差与步数为示意。',
        evidence: source([5], 'User-marked Central Court / South Central Gate transition')
    },
    {
        id: 'daimaru-entry',
        name: messageText('stations.jrOsaka.facilities.daimaruEntry.name'),
        kind: 'entrance',
        level: 'concourse',
        x: 0,
        z: 55,
        elevationOffset: 1.3,
        note: '经小半层台阶衔接的 1F 南侧公共通道，两侧为大丸与 Hotel Granvia 一带。',
        evidence: p1
    },
    {
        id: 'ticket',
        name: messageText('stations.jrOsaka.facilities.ticket.name'),
        kind: 'ticket',
        level: 'concourse',
        x: 18,
        z: -7,
        note: '位于中央公共通路东侧；服务区位置关系据 1F 图整理，柜台尺寸与机柜数量为图形简化。',
        evidence: p1
    },
    {
        id: 'information',
        name: messageText('stations.jrOsaka.facilities.touristInformation.name'),
        kind: 'information',
        level: 'concourse',
        x: 17,
        z: -21,
        note: '中央通路东侧的 Train and Tourist Information，位于售票处北侧。',
        evidence: p1
    },
    {
        id: 'railway-police',
        name: messageText('stations.jrOsaka.facilities.railwayPolice.name'),
        kind: 'police',
        level: 'concourse',
        x: 45.8,
        z: -38,
        note: '1F 御堂筋北侧，定位点放在警务室旁的闸外公共通路。',
        evidence: source([5], 'Railway Police beside the north end of the JR Midosuji Gate (御堂筋口); public approach fitted')
    },
    {
        id: 'crosta-luggage',
        name: messageText('stations.jrOsaka.facilities.crostaLuggage.name'),
        kind: 'luggage-storage',
        level: 'concourse',
        x: 6,
        z: -31,
        note: '1F 中央改札北侧闸外的人工行李寄存处，邻日本旅行 TiS。',
        evidence: {
            ...source([5], 'The station guide locates TiS; the operator places its staffed counter next to TiS on 1F'),
            urls: ['https://handsfree-japan.com/osaka/']
        }
    },
    {
        id: 'sakurabashi-lockers',
        name: messageText('stations.jrOsaka.facilities.sakurabashiLockers.name'),
        kind: 'locker',
        level: 'concourse',
        x: -35,
        z: 41,
        note: '樱桥口改札外南侧公共通路的一组寄存柜。',
        evidence: source([5], 'Coin locker symbols in the public passage outside Sakurabashi Gate (桜橋口); grouped into one marker')
    },
    {
        id: 'midosuji-north-lockers',
        name: messageText('stations.jrOsaka.facilities.midosujiLockers.name'),
        kind: 'locker',
        level: 'concourse',
        x: 51,
        z: -39,
        note: '御堂筋北侧闸外公共通路的寄存柜。',
        evidence: source([5], 'Coin locker symbol at the north end of Midosuji Gate (御堂筋口); public approach fitted')
    },
    {
        id: 'bridge-lucua-lockers',
        name: messageText('stations.jrOsaka.facilities.bridgeLockers.name'),
        kind: 'locker',
        level: 'bridge',
        x: 27,
        z: -42,
        note: '3F 北侧公共区，位于大阪站城问讯台东侧、LUCUA 南侧。',
        evidence: source([2], 'Coin locker symbol east of the Osaka Station City (大阪ステーションシティ) information desk, south of LUCUA (ルクア)')
    },
    {
        id: 'escalator',
        name: messageText('stations.jrOsaka.facilities.escalator.name'),
        kind: 'escalator',
        level: 'concourse',
        x: -20,
        z: 6,
        note: '按图示编号 34 对照 1F 与 2F 的同一设施，简化为中央改札内至 5/6 番线的连接；上下行与几何仍为演示设定。',
        evidence: source([3, 5], 'Diagram escalator 34; diagram identifiers are not on-site signs')
    },
    {
        id: 'lift',
        name: messageText('stations.jrOsaka.facilities.lift.name'),
        kind: 'elevator',
        level: 'concourse',
        x: 43,
        z: -6,
        note: '依据图示 M 关联 1F 与 7/8 番线。M 仅为参考图内部编号，不是现场指示牌。',
        evidence: source([3, 5], 'Diagram elevator M')
    },
    {
        id: 'mezz-central',
        name: messageText('stations.jrOsaka.facilities.mezzCentral.name'),
        kind: 'stairs',
        level: 'mezzanine',
        x: -25,
        z: 0,
        note: '位于 1F 和 2F 站台之间，非地下层。用窄通道与楼梯表示，不做完整封闭楼板。',
        evidence: pm
    },
    {
        id: 'mezz-sakura',
        name: messageText('stations.jrOsaka.facilities.mezzSakura.name'),
        kind: 'stairs',
        level: 'mezzanine',
        x: -40,
        z: 0,
        note: '西侧窄通道，与中央口内通道在局部联络。这里只表现选取的楼梯与联络段。',
        evidence: pm
    },
    {
        id: 'platform',
        name: messageText('stations.jrOsaka.platforms.central.name'),
        kind: 'entrance',
        level: 'platform',
        x: 22,
        z: 6,
        note: '地上 2F，5 与 6 番线共享一组岛式站台；纠正首版将 6/7 配成一组的示意编号。',
        evidence: pp
    },
    {
        id: 'bridge',
        name: messageText('stations.jrOsaka.facilities.bridgeGate.name'),
        kind: 'gate',
        level: 'bridge',
        x: -3,
        z: 4,
        axis: 'z',
        note: '位于 3F。西侧是公共南北连络桥，东侧是通往各站台的闸内区域；与 1F 中央改札不同。',
        evidence: pb
    },
    {
        id: 'store-central',
        name: messageText('facilities.labels.convenienceStore'),
        kind: 'convenience-store',
        level: 'concourse',
        x: 18,
        z: 18,
        note: 'JR 参考图 1F 的 Souvenir and Convenience store 区域，位于中央通路东侧、改札外。只标店面位置，不展开内部布局。',
        evidence: source([5], 'Seven-Eleven Heart-in symbol in the souvenir/convenience-store area east of Central concourse')
    },
    {
        id: 'store-bridge',
        name: messageText('facilities.labels.convenienceStore'),
        kind: 'convenience-store',
        level: 'bridge',
        x: -1,
        z: 25,
        note: 'JR 参考图 3F 桥上改札内南段、11/13 号设施附近的便利店。与 1F 中央口店区分，位置与店面尺寸为示意。',
        evidence: source([2], 'Seven-Eleven Heart-in symbol south of Bridge Gate within the paid concourse, near banks 11/13')
    },
];
/**
 * Create a stable, floor-aware local landing shared by connections and facility anchors.
 */
const landing = (id: string, level: RouteNode['level'], x: number, z: number): RouteNode => ({
    id,
    level,
    x,
    z
});
export const connections: VerticalConnection[] = [
    {
        id: 'central-34',
        kind: 'escalator',
        from: landing('lower', 'concourse', -20, 6),
        to: landing('upper', 'platform', -10, 6),
        evidence: facilities.find(f => f.id === 'escalator')!.evidence
    },
    {
        id: 'lift-m',
        kind: 'elevator',
        from: landing('lift-m-1', 'concourse', 43, -6),
        to: landing('lift-m-2', 'platform', 43, -6),
        evidence: facilities.find(f => f.id === 'lift')!.evidence
    },
    {
        id: 'central-53',
        kind: 'stairs',
        from: landing('stair53-1', 'concourse', -34, 0),
        to: landing('stair53-m', 'mezzanine', -29, 0),
        evidence: source([4, 5], 'Staircase 53: user-corrected plan axis, parallel to platform length')
    },
    ...platforms.filter(platform => platform.level === 'platform').map((platform, index): VerticalConnection => ({
        id: `bridge-${platform.id}`,
        kind: 'escalator',
        from: landing(`bridge-${index}`, 'bridge', 6, platform.z),
        to: landing(`platform-${index}`, 'platform', 17, platform.z),
        travelDirection: platform.id === 'p1-2' ? 'from-to' : undefined,
        evidence: source(
            [2, 3],
            `Selected eastern 3F–2F escalator: diagram ${[
                4,
                6,
                8,
                10,
                12,
                14
            ][index]}`
        ),
    })),
    {
        id: 'bridge-lift-h',
        kind: 'elevator',
        from: landing('bridge-lift-h-2', 'platform', 4.1, 30),
        to: landing('bridge-lift-h-3', 'bridge', 4.1, 30),
        evidence: source([2, 3], 'Lift H connects the paid Bridge Gate concourse to the Osaka Loop Line platform for tracks 1 and 2; the shaft position is fitted.')
    },
    ...platforms.filter(platform => platform.level === 'platform').map((platform, index): VerticalConnection => ({
        id: `west-${platform.id}`,
        kind: 'escalator',
        from: landing(`west-floor-${index}`, 'concourse', -65, platform.z),
        to: landing(`west-platform-${index}`, 'platform', -56, platform.z),
        evidence: source(
            [3, 7],
            `Selected West Gate/platform access, diagram ${[
                91,
                90,
                88,
                86,
                84,
                82
            ][index]}`
        ),
    })),
    {
        id: 'west-92',
        kind: 'escalator',
        from: landing('west-lower', 'concourse', -67, -31),
        to: landing('walkway-start', 'underground-platform', -76, -39),
        evidence: source([7, 8], 'Diagram escalator 92, West Gate / B2F walkway')
    },
    {
        id: 'umekita-93',
        kind: 'escalator',
        from: landing('walkway-end', 'underground-platform', -76, -71),
        to: landing('umekita-arrival', 'underground-hall', -81, -80),
        evidence: source([7, 8], 'Diagram escalator 93, B2F walkway / B1F concourse')
    },
    {
        id: 'umekita-95',
        kind: 'escalator',
        from: landing('underground-lower', 'underground-hall', -88, -86),
        to: landing('underground-upper', 'underground-platform', -88, -76),
        evidence: source([8], 'Southern bank 95 descends away from central elevator AD toward the connecting-walkway end')
    },
    {
        id: 'umekita-97',
        kind: 'escalator',
        from: landing('b1-97', 'underground-hall', -104, -86),
        to: landing('b2-97', 'underground-platform', -104, -76),
        evidence: source([8], 'Southern bank 97 descends away from central elevator AE toward the connecting-walkway end')
    },
    {
        id: 'umekita-ad',
        kind: 'elevator',
        from: landing('ad-1', 'underground-hall', -88, -94),
        to: landing('ad-2', 'underground-platform', -88, -94),
        evidence: source([8], 'Diagram elevator AD, between the northern 94 and southern 95 banks')
    },
    {
        id: 'umekita-ae',
        kind: 'elevator',
        from: landing('ae-1', 'underground-hall', -104, -94),
        to: landing('ae-2', 'underground-platform', -104, -94),
        evidence: source([8], 'Diagram elevator AE, between the northern 96 and southern 97 banks')
    },
    {
        id: 'umekita-94',
        kind: 'escalator',
        from: landing('b1-94', 'underground-hall', -88, -102),
        to: landing('b2-94', 'underground-platform', -88, -112),
        evidence: source([8], 'Northern bank 94 descends away from central elevator AD toward the gate end')
    },
    {
        id: 'umekita-96',
        kind: 'escalator',
        from: landing('b1-96', 'underground-hall', -104, -102),
        to: landing('b2-96', 'underground-platform', -104, -112),
        evidence: source([8], 'Northern bank 96 descends away from central elevator AE toward the gate end')
    },
    {
        id: 'walkway-ab',
        kind: 'elevator',
        doorFacingRad: -Math.PI / 2,
        from: landing('ab-1', 'concourse', -72, -29),
        to: landing('ab-b2', 'underground-platform', -72, -29),
        evidence: source([7, 8], 'Elevator AB links West Gate 1F and the B2F connecting walkway; bay positions schematic')
    },
    {
        id: 'walkway-ac',
        kind: 'elevator',
        doorFacingRad: Math.PI / 2 + undergroundSketchCorrectionRad,
        from: landing('ac-b1', 'underground-hall', -84, -72),
        to: landing('ac-b2', 'underground-platform', -84, -72),
        evidence: source(
            [7, 8],
            'Elevator AC links B1F Umekita paid hall and the B2F connecting walkway; bay positions schematic'
        )
    },
];
export const layout: StationLayout = { areas, platforms, connections };
export const nodes: RouteNode[] = [
    landing('entry', 'concourse', 0, 41),
    // Use the public space between Crost (クロスト) escalator 67 and stair 68.
    landing('hall-crost-side', 'concourse', -4.1, 35.5),
    landing('hall', 'concourse', 0, 4),
    landing('gate-out', 'concourse', -6, 4),
    landing('gate-in', 'concourse', -13, 4),
    landing('central-north-gate-out', 'concourse', -6, -15),
    landing('central-north-gate-in', 'concourse', -13, -15),
    landing('turn', 'concourse', -20, 4),
    connections[0]!.from,
    connections[0]!.to,
    landing('destination', 'platform', 22, 6),
    landing('public-b1-entry', 'underground-hall', 0, -52),
    landing('public-b1-turn', 'underground-hall', -31, -52),
    landing('public-join', 'underground-hall', -42, -112),
    landing('umekita-gate-out', 'underground-hall', -88, -110),
    landing('umekita-gate-in', 'underground-hall', -88, -101),
    landing('west-entry', 'concourse', -81, 20),
    landing('west-inside', 'concourse', -67, 20),
    landing('west-public-turn', 'concourse', -81, 41),
    ...connections.filter(connection => ['west-92', 'umekita-93', 'umekita-95'].includes(connection.id)).flatMap(connection => [connection.from, connection.to]),
    landing('umekita-hall-north', 'underground-hall', -94, -100),
    landing('umekita-hall-south', 'underground-hall', -94, -87),
    landing('umekita-arrival-bypass', 'underground-hall', -94, -80),
    landing('underground-side-south', 'underground-platform', -91.3, -79),
    landing('underground-side-north', 'underground-platform', -91.3, -120),
    landing('underground-destination', 'underground-platform', -88, -120),
];
export const edges: RouteEdge[] = [
    {
        from: 'public-b1-entry',
        to: 'public-b1-turn',
        cost: 31,
        kind: 'walk'
    },
    {
        from: 'public-b1-turn',
        to: 'public-join',
        cost: 30,
        kind: 'walk'
    },
    {
        from: 'public-join',
        to: 'umekita-gate-out',
        cost: 46,
        kind: 'walk'
    },
    {
        from: 'umekita-gate-out',
        to: 'umekita-gate-in',
        cost: 9,
        kind: 'gate'
    },
    {
        from: 'umekita-gate-in',
        to: 'umekita-hall-north',
        cost: 6,
        kind: 'walk'
    },
    {
        from: 'umekita-hall-north',
        to: 'umekita-hall-south',
        cost: 13,
        kind: 'walk'
    },
    {
        from: 'umekita-hall-south',
        to: 'underground-lower',
        cost: 6,
        kind: 'walk'
    },
    {
        from: 'entry',
        to: 'hall-crost-side',
        cost: 9.5,
        kind: 'walk'
    },
    {
        from: 'hall-crost-side',
        to: 'hall',
        cost: 28.2,
        kind: 'walk'
    },
    {
        from: 'hall-crost-side',
        to: 'gate-out',
        cost: 28.2,
        kind: 'walk'
    },
    {
        from: 'hall',
        to: 'gate-out',
        cost: 6,
        kind: 'walk'
    },
    {
        from: 'gate-out',
        to: 'gate-in',
        cost: 7,
        kind: 'gate'
    },
    {
        from: 'gate-out',
        to: 'central-north-gate-out',
        cost: 19,
        kind: 'walk'
    },
    {
        from: 'central-north-gate-out',
        to: 'central-north-gate-in',
        cost: 7,
        kind: 'gate'
    },
    {
        from: 'central-north-gate-in',
        to: 'gate-in',
        cost: 19,
        kind: 'walk'
    },
    {
        from: 'gate-in',
        to: 'turn',
        cost: 7,
        kind: 'walk'
    },
    {
        from: 'turn',
        to: 'lower',
        cost: 2,
        kind: 'walk'
    },
    {
        from: 'lower',
        to: 'upper',
        cost: 14,
        kind: 'escalator',
        directed: true
    },
    {
        from: 'upper',
        to: 'destination',
        cost: 32,
        kind: 'walk'
    },
    {
        from: 'entry',
        to: 'west-public-turn',
        cost: 111,
        kind: 'walk'
    },
    {
        from: 'west-public-turn',
        to: 'west-entry',
        cost: 21,
        kind: 'walk'
    },
    {
        from: 'west-entry',
        to: 'west-inside',
        cost: 14,
        kind: 'gate'
    },
    {
        from: 'west-inside',
        to: 'west-lower',
        cost: 51,
        kind: 'walk'
    },
    {
        from: 'west-lower',
        to: 'walkway-start',
        cost: 20,
        kind: 'escalator',
        directed: true
    },
    {
        from: 'walkway-start',
        to: 'walkway-end',
        cost: 32,
        kind: 'walk'
    },
    {
        from: 'walkway-end',
        to: 'umekita-arrival',
        cost: 14,
        kind: 'escalator',
        directed: true
    },
    {
        from: 'umekita-arrival',
        to: 'umekita-arrival-bypass',
        cost: 13,
        kind: 'walk'
    },
    {
        from: 'umekita-arrival-bypass',
        to: 'umekita-hall-south',
        cost: 7,
        kind: 'walk'
    },
    {
        from: 'underground-lower',
        to: 'underground-upper',
        cost: 14,
        kind: 'escalator',
        directed: true
    },
    {
        from: 'underground-upper',
        to: 'underground-side-south',
        cost: 5,
        kind: 'walk'
    },
    {
        from: 'underground-side-south',
        to: 'underground-side-north',
        cost: 41,
        kind: 'walk'
    },
    {
        from: 'underground-side-north',
        to: 'underground-destination',
        cost: 4,
        kind: 'walk'
    },
];
// Correct the whole underground station sketch, not just its visible platform slabs.
// Keep the West Gate landing and North Gate B1F fixed; rebuild the paid passage
// between that landing and the corrected Umekita (うめきた) landing after the transform.
const undergroundSketchOrigin = { x: -96, z: -102 };
// Keep the West Gate–Umekita (うめきた) spine roughly perpendicular to the surface tracks.
// Location/scale follow the supplied layout sketch; they are not surveyed coordinates.
// Extend surface platforms westward while retaining the east-end gate alignment.
for (const platform of platforms) {
    if (platform.level === 'platform') {
        platform.x -= 20;
        platform.length += 40;
    }
}
const shiftedWest = new Set<object>();
/**
 * Shift a shared coordinate object only once to avoid compounding offsets through repeated references.
 */
function shiftWest(point: {
    x: number;
}): void {
    if (shiftedWest.has(point)) {
        return;
    }
    point.x -= 30;
    shiftedWest.add(point);
}
for (const area of areas.filter(a => ['west-public', 'west-paid'].includes(a.id))) {
    for (const p of area.outline) {
        shiftWest(p);
    }
}
areas.find(a => a.id === 'west-south-link')!.outline = rectangle(-83, 41, 66, 9);
for (const facility of facilities.filter(f => ['west-gate', 'machines-west'].includes(f.id))) {
    shiftWest(facility);
}
for (const connection of connections.filter(c => c.id.startsWith('west-') || c.id === 'walkway-ab')) {
    shiftWest(connection.from);
    shiftWest(connection.to);
}
for (const node of nodes.filter(n => ['west-entry', 'west-inside', 'west-public-turn', 'west-lower', 'walkway-start'].includes(n.id))) {
    shiftWest(node);
}
const undergroundAnchor = { x: -90, z: -110 };
const corrected = new Set<object>();
const keepPosition = new Set(['walkway-start', 'ab-b2', 'public-b1-entry', 'public-b1-turn']);
/**
 * Correct eligible underground coordinates while skipping previously processed objects and retained anchors.
 */
function correctPosition(point: {
    x: number;
    z: number;
}, level: RouteNode['level'], id = ''): void {
    if (!['underground-hall', 'underground-platform'].includes(level) || keepPosition.has(id) || corrected.has(point)) {
        return;
    }
    const rotated = rotatePoint(point, undergroundSketchOrigin, undergroundSketchCorrectionRad);
    Object.assign(
        point,
        {
            x: undergroundAnchor.x + rotated.x - undergroundSketchOrigin.x,
            z: undergroundAnchor.z + rotated.z - undergroundSketchOrigin.z
        }
    );
    corrected.add(point);
}
for (const area of areas) {
    if (['north-b1-public', 'north-b1-portal', 'crost-public'].includes(area.id)) {
        continue;
    }
    for (const point of area.outline) {
        correctPosition(point, area.level);
    }
}
for (const platform of platforms) {
    correctPosition(platform, platform.level);
}
for (const facility of facilities) {
    if (facility.id === 'umekita-link') {
        continue;
    }
    correctPosition(facility, facility.level);
    if (facility.level === 'underground-hall' && facility.rotationRad !== undefined) {
        facility.rotationRad += undergroundSketchCorrectionRad;
    }
    else if (facility.level === 'underground-hall' && facility.kind === 'gate') {
        facility.rotationRad = undergroundSketchCorrectionRad;
    }
}
for (const connection of connections) {
    correctPosition(connection.from, connection.from.level, connection.from.id);
    correctPosition(connection.to, connection.to.level, connection.to.id);
}
for (const node of nodes) {
    correctPosition(node, node.level, node.id);
}
const passageStart = nodes.find(node => node.id === 'walkway-start')!;
const passageEnd = nodes.find(node => node.id === 'walkway-end')!;
for (const id of ['walkway-ab', 'walkway-ac']) {
    const connection = connections.find(c => c.id === id)!;
    const b2 = connection.to;
    const end = id === 'walkway-ab' ? passageStart : passageEnd;
    // Separate access bays support each shaft and connect it to the paid walkway.
    areas.push({
        id: `${id}-b2-bay`,
        level: 'underground-platform',
        name: messageText('stations.jrOsaka.areas.walkwayLiftBay.name'),
        kind: 'paid',
        outline: passageOutline(b2, end, 7),
        evidence: connection.evidence
    });
    for (const point of [connection.from, connection.to]) {
        areas.push({
            id: `${point.id}-landing`,
            level: point.level,
            name: messageText('stations.jrOsaka.areas.accessibleLiftLanding.name'),
            kind: 'paid',
            outline: rectangle(point.x, point.z, 7, 7),
            evidence: connection.evidence
        });
    }
    facilities.push({
        id: `${id}-poi`,
        name: messageText('stations.jrOsaka.facilities.walkwayLift.name', { code: id === 'walkway-ab' ? 'AB' : 'AC' }),
        kind: 'elevator',
        level: connection.from.level,
        x: connection.from.x,
        z: connection.from.z,
        note: '参考图中的连接通道无障碍直梯；井道、轿厢与候梯区为示意，尚未提供完整无障碍路线规划。',
        evidence: connection.evidence
    });
}
const ac = connections.find(c => c.id === 'walkway-ac')!;
const arrival = connections.find(c => c.id === 'umekita-93')!.to;
areas.push({
    id: 'ac-b1-access',
    level: 'underground-hall',
    name: messageText('stations.jrOsaka.entities.acB1Access.name'),
    kind: 'paid',
    outline: passageOutline(ac.from, arrival, 7),
    evidence: ac.evidence
});
const southBypass = nodes.find(n => n.id === 'umekita-arrival-bypass')!;
const southHall = nodes.find(n => n.id === 'umekita-hall-south')!;
for (const [i, a, b] of [[0, arrival, southBypass], [1, southBypass, southHall]] as const) {
    areas.push({
        id: `umekita-south-circulation-${i}`,
        level: 'underground-hall',
        name: messageText('stations.jrOsaka.areas.umekitaSouthBypass.name'),
        kind: 'paid',
        outline: passageOutline(a, b, 5),
        evidence: source([8], 'Schematic circulation around the southern escalator banks')
    });
}
for (const id of ['umekita-94', 'umekita-96']) {
    const connection = connections.find(c => c.id === id)!;
    facilities.push({
        id: `${id}-poi`,
        name: messageText('stations.jrOsaka.facilities.umekitaEscalator.name', { id: id.slice(-2) }),
        kind: 'escalator',
        level: connection.from.level,
        x: connection.from.x,
        z: connection.from.z,
        note: '补充梅北闸内北端站台扶梯，编号用于对照参考图，位置与宽度为示意。',
        evidence: connection.evidence
    });
}
areas.push({
    id: 'underground-walkway',
    level: 'underground-platform',
    name: messageText('stations.jrOsaka.entities.undergroundWalkway.name'),
    kind: 'paid',
    outline: passageOutline(passageStart, passageEnd, 7),
    label: true,
    evidence: source(
        [7, 8],
        'B2F connecting walkway; rebuilt from the West Gate landing to the rotated Umekita landing, geometry remains schematic'
    )
});
const passageFacility = facilities.find(facility => facility.id === 'umekita-link')!;
passageFacility.x = (passageStart.x + passageEnd.x) / 2;
passageFacility.z = (passageStart.z + passageEnd.z) / 2;
const join = nodes.find(node => node.id === 'public-join')!;
// PDF B1F: the public Umekita (うめきた) approach skirts north of LUCUA 1100,
// then turns south along the atrium side, rather than cutting through the store.
const publicEntry = nodes.find(node => node.id === 'public-b1-entry')!;
const publicTurn = nodes.find(node => node.id === 'public-b1-turn')!;
Object.assign(publicTurn, { x: -4, z: -75 });
Object.assign(join, { x: -60, z: -75 });
const publicGate = nodes.find(node => node.id === 'umekita-gate-out')!;
const northPublicSlabs = joinedPassageOutlines([publicEntry, publicTurn, join, publicGate], 7);
areas.find(area => area.id === 'north-b1-public')!.outline = northPublicSlabs[0]!;
areas.push({
    id: 'north-b1-east-public',
    level: 'underground-hall',
    kind: 'public',
    name: messageText('stations.jrOsaka.entities.northB1EastPublic.name'),
    outline: passageOutline(publicEntry, { x: 61, z: -52 }, 7),
    evidence: source(
        [6],
        'North Gate B1F public east-west passage through the LUCUA side, ending at the diagram boundary toward Metro/Hankyu/Yodobashi'
    )
});
areas.find(area => area.id === 'umekita-east-link')!.outline = northPublicSlabs[2]!;
areas.push({
    id: 'public-b1-connector',
    level: 'underground-hall',
    name: messageText('stations.jrOsaka.entities.publicB1Connector.name'),
    kind: 'public',
    outline: northPublicSlabs[1]!,
    evidence: source(
        [6, 8],
        'B1F public connection around the north edge of LUCUA 1100 and the atrium-side turn; schematic widths and positions'
    )
});
for (const edge of edges.filter(e => ['public-b1-entry', 'public-b1-turn', 'public-join'].includes(e.from))) {
    const a = nodes.find(n => n.id === edge.from)!;
    const b = nodes.find(n => n.id === edge.to)!;
    edge.cost = Math.hypot(b.x - a.x, b.z - a.z);
}
// Additional banks read from the floor plans. Only set routing directions where supported separately.
/**
 * Register an escalator with its two landings and reference pages.
 */
function addEscalator(id: string, from: RouteNode, to: RouteNode, pages: number[], detail: string): void {
    connections.push({
        id,
        kind: 'escalator',
        from,
        to,
        evidence: source(pages, detail)
    });
}
for (const [diagram, platformId] of [[32, 'p9-10'], [33, 'p7-8'], [35, 'p3-4']] as const) {
    const platform = platforms.find(p => p.id === platformId)!;
    addEscalator(
        `central-${diagram}`,
        landing(`central-${diagram}-1`, 'concourse', -20, platform.z),
        landing(`central-${diagram}-2`, 'platform', -10, platform.z),
        [3, 5],
        `Central Gate bank, diagram ${diagram}`
    );
}
for (const [i, platformId] of ['p9-10', 'p7-8', 'p5-6', 'p3-4'].entries()) {
    const platform = platforms.find(p => p.id === platformId)!;
    for (let side = 0; side < 2; side++) {
        const diagram = 36 + i * 2 + side;
        const x = 28 + side * 8;
        addEscalator(
            `midosuji-${diagram}`,
            landing(`midosuji-${diagram}-1`, 'concourse', x, platform.z),
            landing(`midosuji-${diagram}-2`, 'platform', x - 6, platform.z),
            [3, 5],
            `Midosuji Gate bank, diagram ${diagram}`
        );
        if (side === 0) {
            connections.at(-1)!.lanes = 2;
        }
    }
}
for (const [i, platformId] of [
    'p9-10',
    'p7-8',
    'p5-6',
    'p3-4',
    'p1-2'
].entries()) {
    const platform = platforms.find(p => p.id === platformId)!;
    addEscalator(
        `bridge-west-${5 + i * 2}`,
        landing(`bridge-west-${i}-3`, 'bridge', 1.5, platform.z),
        landing(`bridge-west-${i}-2`, 'platform', -8.5, platform.z),
        [2, 3],
        `Western Bridge Gate bank, diagram ${5 + i * 2}`
    );
    if (platformId === 'p1-2') {
        connections.at(-1)!.travelDirection = 'to-from';
    }
}
areas.push({
    id: 'north-2f-public',
    level: 'platform',
    name: messageText('stations.jrOsaka.entities.north2fPublic.name'),
    kind: 'public',
    outline: rectangle(0, -44, 122, 12),
    label: true,
    evidence: source([3], 'North Gate building 2F public concourse and Carillon Plaza approach')
});
for (const [id, x] of [[47, -3], [48, 3]]) {
    addEscalator(
        `north-${id}`,
        landing(`north-${id}-1`, 'concourse', x!, -41),
        landing(`north-${id}-2`, 'platform', x!, -46),
        [3, 5],
        `North public bank, diagram ${id}`
    );
}
addEscalator(
    'carillon-49',
    landing('carillon-49-1', 'concourse', 53, -40),
    landing('carillon-49-2', 'platform', 53, -45),
    [3, 5],
    'Carillon Plaza public escalator, diagram 49'
);
for (const [id, x] of [['central-daimaru-steps', -7], ['central-daimaru-east-steps', 7]] as const) {
    connections.push({
        id,
        kind: 'stairs',
        width: 4,
        from: landing(`${id}-lower`, 'concourse', x, 39),
        to: { ...landing(`${id}-upper`, 'concourse', x, 47), elevationOffset: 1.3 },
        evidence: source(
            [5],
            'User photo facing north from Daimaru: raised public landing joins Central Court by side stairs; central bank descends south to B1'
        )
    });
}
for (const [id, z] of [[52, -14], [54, 14]]) {
    connections.push({
        id: `central-stairs-${id}`,
        kind: 'stairs',
        from: landing(`central-stairs-${id}-1`, 'concourse', -34, z!),
        to: landing(`central-stairs-${id}-m`, 'mezzanine', -29, z!),
        evidence: source([4, 5], `Central Gate staircase ${id}: user-corrected plan axis parallel to platforms`)
    });
}
for (const [id, z] of [[52, -14], [53, 0], [54, 14]]) {
    areas.push({
        id: `central-mezz-landing-${id}`,
        level: 'mezzanine',
        name: messageText('stations.jrOsaka.areas.centralMezzanineLanding.name'),
        kind: 'paid',
        outline: rectangle(-29, z!, 14, 4),
        evidence: pm
    });
}
addEscalator(
    'central-55',
    landing('central55-1', 'concourse', -34, 26),
    landing('central55-m', 'mezzanine', -34, 21),
    [4, 5],
    'Central Gate north/south mezzanine escalator 55'
);
addEscalator(
    'crost-67',
    landing('crost67-1', 'concourse', 0, 31),
    landing('crost67-b1', 'underground-hall', 0, 43),
    [5, 6],
    'Central Court / Crost B1F escalator 67; descends south, confirmed by user photo'
);
for (const [id, x] of [[68, -8], [69, 8]]) {
    connections.push({
        id: `crost-stairs-${id}`,
        kind: 'stairs',
        from: landing(`crost${id}-1`, 'concourse', x!, 31),
        to: landing(`crost${id}-b1`, 'underground-hall', x!, 43),
        evidence: source([5, 6], `Crost B1F staircase ${id}; descends south alongside bank 67`)
    });
}
refineUpperLevelLinks(areas, connections, facilities);
// Ownership supplies one shared frame for equipment, landing doors and shaft cuts.
for (const connection of connections) {
    if (connection.doorFacingRad !== undefined) {
        continue;
    }
    /**
     * Create a stable, floor-aware local landing shared by connections and facility anchors.
     */
    const landing = [connection.from, connection.to].find(point => point.level === 'platform' || point.level === 'underground-platform');
    if (!landing) {
        continue;
    }
    connection.platformId = platforms.find(platform => {
        if (platform.level !== landing.level) {
            return false;
        }
        const local = platformLocalPoint(platform, landing);
        return Math.abs(local.x) <= platform.length / 2 + 1e-6 && Math.abs(local.z) <= platform.width / 2 + 1e-6;
    })?.id;
}
