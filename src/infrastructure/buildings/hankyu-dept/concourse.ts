import { messageText } from '../../i18n/index.ts';
import type { AtriumVoid, BuildingOpening, CommercialConcourse, Evidence, FloorArea, Point2, VerticalConnection } from '../../../domain/map/model.ts';
import { joinedPassageOutlines, passageOutline } from '../../../domain/map/geometry.ts';

const evidence: Evidence = {
    source: 'district',
    pages: [],
    urls: [
        'https://www.hankyu.co.jp/company/news/pdf/ER201209194N1.pdf',
        'https://website.hankyu-dept.co.jp/honten/about/',
    ],
    detail: 'Official public north–south and east–west concourses, with the department store and Grand Building kept separate. Cream arches, warm display windows and paving follow the earlier authored model/user photo. Metre-scale axes fitted to the current OSM building seam; widths and heights illustrative, not surveyed.',
};
// These axes follow the shared east facade of the department store and the
// separate Grand Building. Old display coordinates are deliberately not reused.
/**
 * Construct a ground-level public concourse from its axis and clear width, with independent evidence.
 */
function concourse(input: Pick<CommercialConcourse, 'id' | 'name' | 'axis' | 'width' | 'height'>): CommercialConcourse {
    return {
        ...input,
        level: 'district-ground',
        outline: passageOutline(...input.axis, input.width),
        evidence,
    };
}

export const hankyuConcourses: CommercialConcourse[] = [
    concourse({
        id: 'hankyu-north-south-concourse',
        name: messageText('buildings.hankyuDept.entities.hankyuNorthSouthConcourse.name'),
        axis: [{ x: 722, z: 542 }, { x: 723, z: 606 }],
        width: 12,
        height: 12,
    }),
    concourse({
        id: 'hankyu-east-west-concourse',
        name: messageText('buildings.hankyuDept.entities.hankyuEastWestConcourse.name'),
        axis: [{ x: 633, z: 549 }, { x: 764, z: 545 }],
        width: 10,
        height: 3.3,
    }),
];
const southAccessEvidence: Evidence = {
    source: 'district',
    pages: [],
    urls: [
        'https://www.city.osaka.lg.jp/shimin/page/0000600942.html',
        'https://www.hankyu.co.jp/company/news/pdf/ER201204123N2.pdf',
        'https://www.openstreetmap.org/way/637935250',
        'https://www.openstreetmap.org/way/1320007682',
        'https://www.openstreetmap.org/way/1320007680',
        'https://www.openstreetmap.org/way/1320007679',
        'https://www.openstreetmap.org/way/1010195556'
    ],
    detail: 'Six escalators and an adjacent stair descend from the south end of the public Hankyu concourse (南北コンコース). The two OSM axes and connected B1 paths locate the banks and westbound public approach. Slab edges, lane spacing and clearances are fitted.',
};
const northAccessEvidence: Evidence = {
    source: 'district',
    pages: [],
    urls: [
        'https://www.city.osaka.lg.jp/shimin/page/0000600942.html',
        'https://www.openstreetmap.org/way/557024413',
        'https://www.openstreetmap.org/way/330561958',
        'https://www.openstreetmap.org/way/747189967',
        'https://www.openstreetmap.org/way/747189969',
    ],
    detail: 'Osaka City describes the ground-floor public passage beside the moving walkway between Hankyu Osaka-Umeda Station (阪急大阪梅田駅) and the concourse. Connected OSM level-zero ways locate the axis under the JR tracks. Width, clearance and the overlap into the modeled concourse are fitted.',
};
const northAccessOutlines = joinedPassageOutlines([
    { x: 707.69, z: 547 },
    { x: 707.69, z: 528.61 },
    { x: 702.42, z: 516.07 },
    { x: 697.27, z: 503.53 },
    { x: 712.94, z: 493.36 },
    { x: 712.75, z: 490.43 },
    { x: 712.05, z: 437.67 },
    { x: 703.21, z: 388.63 },
], 6);

/** Fit a rectangular public landing or a local casing clearance in the district frame. */
function landing(west: number, north: number, east: number, south: number): Point2[] {
    return [{ x: west, z: north }, { x: east, z: north }, { x: east, z: south }, { x: west, z: south }];
}

/** Place one bank on its OSM axis with the upper landing at the south end of the 1F hall. */
function southBank(id: string, kind: 'stairs' | 'escalator', low: Point2, high: Point2): VerticalConnection {
    return {
        id,
        kind,
        from: { ...low, id: id + '-b1', level: 'district-underground' },
        to: { ...high, id: id + '-ground', level: 'district-ground' },
        blockId: 'whity-b1',
        evidence: southAccessEvidence,
    };
}

export const hankyuConcourseConnections: VerticalConnection[] = [
    {
        ...southBank('hankyu-concourse-south-escalators', 'escalator', { x: 714.91, z: 631.27 }, { x: 714.62, z: 612.19 }),
        lanes: 6,
        laneSpacing: 1.72,
        width: 1.67,
        openingWidth: 2,
    },
    {
        ...southBank('hankyu-concourse-south-stairs', 'stairs', { x: 723.66, z: 631.13 }, { x: 723.5, z: 612.28 }),
        width: 4.5,
    },
];

const groundLanding = landing(708, 599, 729, 614);
const accessName = messageText('buildings.hankyuDept.entities.hankyuNorthSouthConcourse.name');

/** Connect the banks to the existing B1 public surface along the recorded westbound footway. */
export const hankyuConcourseBasementAreas: FloorArea[] = [
    landing(708, 629.5, 727, 638),
    ...joinedPassageOutlines([
        { x: 719.32, z: 634 }, { x: 719.41, z: 650.87 }, { x: 701.16, z: 652.84 },
        { x: 693.29, z: 653.78 }, { x: 679, z: 656.7 }
    ], 5),
].map((outline, i) => ({
    id: 'hankyu-concourse-south-b1-' + i,
    level: 'district-underground',
    name: accessName,
    kind: 'public',
    blockId: 'whity-b1',
    outline,
    label: false,
    evidence: southAccessEvidence,
}));

export const hankyuConcourseAreas: FloorArea[] = [...hankyuConcourses.map((hall): FloorArea => ({
    id: hall.id,
    name: hall.name,
    level: hall.level,
    kind: 'public',
    blockId: 'building:hankyu-concourse',
    outline: hall.outline,
    label: false,
    evidence,
})), {
    id: 'hankyu-concourse-south-ground',
    level: 'district-ground',
    name: accessName,
    kind: 'public',
    blockId: 'building:hankyu-concourse',
    outline: groundLanding,
    label: false,
    evidence: southAccessEvidence,
}, ...northAccessOutlines.map((outline, i): FloorArea => ({
    id: 'hankyu-concourse-north-ground-' + i,
    level: 'district-ground',
    name: messageText('buildings.hankyuDept.entities.hankyuStationGroundPassage.name'),
    kind: 'public',
    blockId: 'building:hankyu-concourse',
    outline,
    label: i === 5,
    evidence: northAccessEvidence,
}))];
export const hankyuConcourseOpenings: BuildingOpening[] = [
    ...hankyuConcourses.flatMap(hall => ['hankyu-dept', 'hankyu-grand'].map(buildingId => ({
        buildingId,
        outline: hall.outline,
        base: 0,
        top: hall.height + .4,
        evidence,
    }))),
    // Only the department-store exit and the station approach pass through modeled shells.
    ...northAccessOutlines.flatMap((outline, i) => {
        const buildingId = i < 3 ? 'hankyu-dept' : i === northAccessOutlines.length - 1 ? 'hankyu-sanbangai' : undefined;
        return buildingId ? [{ buildingId, outline, base: 0, top: 3.8, evidence: northAccessEvidence }] : [];
    }),
    {
        buildingId: 'hankyu-dept',
        outline: landing(707.5, 598.5, 729.5, 632),
        base: -8,
        top: 3.8,
        evidence: southAccessEvidence,
    },
];
// Only the tall hall is a void through 2F; the east–west passage has a deck above.
export const hankyuConcourseAtria: AtriumVoid[] = [{
    id: 'hankyu-concourse-void',
    name: messageText('buildings.hankyuDept.entities.hankyuConcourseVoid.name'),
    openings: [
        { level: 'district-south-deck', outline: hankyuConcourses[0]!.outline },
        { level: 'district-north-deck', outline: hankyuConcourses[0]!.outline },
    ],
    evidence,
}];
