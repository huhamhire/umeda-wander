/** Data and provenance for the PDF projection and offline station reservation map. */
export type Point = [
    number,
    number
];
export type LevelEvidence = 'underground-level-unresolved' | 'station-reservation';
export interface NetworkPart {
    id: string;
    name: string;
    block: string;
    evidence: LevelEvidence;
    source: string;
    page: number;
    note: string;
    /** Variable-width sections: east, south, full width in metres. */
    sections: [
        number,
        number,
        number
    ][];
    /** Compound source geometry, including interior building islands. */
    polygons?: Point[][][];
    label: Point;
}
const jr = 'references/stations/jr-osaka/station-guide.pdf';

/** Reserve a station interface envelope without treating it as confirmed excavated or walkable space. */
const reserve = (id: string, name: string, sections: NetworkPart['sections'], label: Point, source: string): NetworkPart => ({
    id,
    name,
    sections,
    label,
    source,
    page: 1,
    block: id,
    evidence: 'station-reservation',
    note: '仅为地理基底上的近似接口包络，不表示实际站体开挖范围、可通行面积或统一 B1 楼层。'
});
export const stationReservations: NetworkPart[] = [
    reserve('umekita', '梅北 · 车站留位', [[228, 590, 45], [242, 480, 45]], [190, 575], jr),
    reserve(
        'm16',
        'M16 · 车站留位',
        [[575, 446, 32], [625, 585, 32], [674, 677, 32]],
        [595, 611],
        'references/stations/metro-umeda/station-guide.pdf'
    ),
    reserve(
        'hankyu',
        '阪急 · 地下接口留位',
        [[656, 225, 54], [674, 335, 58], [696, 419, 66]],
        [652, 315],
        'references/stations/hankyu-umeda/station-guide.svg'
    ),
    reserve(
        'hanshin',
        '阪神 · 车站留位',
        [[450, 813, 34], [648, 697, 34]],
        [546, 746],
        'references/stations/hanshin-umeda/station-guide.pdf'
    ),
    reserve(
        'y11',
        '西梅田 · 车站留位',
        [[435, 847, 30], [425, 1068, 30]],
        [400, 978],
        'references/stations/nishi-umeda/station-guide.pdf'
    ),
    reserve(
        't20',
        '东梅田 · 车站留位',
        [[768, 768, 30], [797, 844, 30], [828, 940, 30]],
        [831, 815],
        'references/stations/higashi-umeda/station-guide.pdf'
    ),
    reserve(
        'kitashinchi',
        '北新地 · 车站留位',
        [[425, 1091, 32], [568, 1096, 32], [711, 1099, 32], [800, 1101, 32]],
        [590, 1135],
        'references/stations/kitashinchi/station-guide.pdf'
    ),
];
export const excludedConnections = [
    { id: 'jr-central-north-south', reason: '中央通路是 1F；没有资料证明沿其下方存在贯穿 JR 的地下公共直通。' },
    { id: 'umekita-paid-west', reason: '梅北—西口 B2 闸内连接不属于本次 B1 公共网络。' },
    { id: 'all-road-underground', reason: '地面道路仅作拟合参照，不能自动推导其下存在地下公共通路。' },
];
