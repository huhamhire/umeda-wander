import { passageOutline } from '../../../domain/map/geometry.ts';
import type { Evidence, FloorArea, Point2, PublicLandmark, VerticalConnection, WalkwayCanopy } from '../../../domain/map/model.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

const blockId = 'whity-b1';
const operatorPlan = 'https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf';
const cityPlan = 'https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda04-1%28202303%29.pdf';
const aerial = 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/18/229741/104099.jpg';

interface ForkedStair {
    number: string;
    bottom: Point2;
    join: Point2;
    apronEnd?: Point2;
    fork: Point2;
    landing: Point2[];
    nodes: string[];
    sidewalkWays?: string[];
    branches: { start: Point2; mouth: Point2; street?: Point2 }[];
    roofs: { way: string; points: Point2[]; width: number; mouth?: Point2 }[];
}

/** Project the reviewed street entrance nodes into district metres. */
const project = (lon: number, lat: number) => toGeographicPlan({ lon, lat }, geographicFrame);

/** Model the four forked stairs and public lift at Izumi-no-hiroba (泉の広場). */
export function createIzumiPlazaAccess() {
    const areas: FloorArea[] = [];
    const connections: VerticalConnection[] = [];
    const canopies: WalkwayCanopy[] = [];
    /** Register a local apron or fitted intermediate landing with explicit B1 ownership. */
    const floor = (id: string, name: string, level: FloorArea['level'], outline: Point2[], evidence: Evidence, elevationOffset?: number) => {
        areas.push({ id, name, level, kind: 'public', blockId, outline, evidence, elevationOffset, label: false });
    };
    const mouth91 = project(135.5016922, 34.7023076);
    const mouth92 = project(135.5015787, 34.7021653);
    const mouth131 = project(135.5015937, 34.7019696);
    const mouth132 = project(135.5017356, 34.7018506);
    const mouth101 = project(135.5022035, 34.7022208);
    const mouth102 = project(135.5020434, 34.7023507);
    const mouth141 = project(135.5020835, 34.7018697);
    const mouth142 = project(135.5021985, 34.7020201);
    const groups: ForkedStair[] = [
        {
            number: 'M-9',
            bottom: { x: 990.4, z: 650.5 },
            join: { x: 994.1, z: 652.5 },
            fork: { x: 979.8, z: 644.9 },
            landing: [
                { x: 975.3, z: 641.2 }, { x: 980.15, z: 641.2 }, { x: 981.1, z: 644.1 },
                { x: 979.5, z: 647.2 }, { x: 975.1, z: 647 }
            ],
            nodes: ['5018031051', '5846148786', '5846148785'],
            branches: [
                { start: { x: 978.1, z: 642.1 }, mouth: mouth91 },
                { start: { x: 976, z: 645.9 }, mouth: mouth92 }
            ],
            roofs: [{
                way: '618516674',
                points: [mouth91, { x: 978.7, z: 638.8 }, { x: 977.5, z: 642.6 }, { x: 975, z: 645.6 }, { x: 972, z: 648 }, mouth92],
                width: 3.25
            }]
        },
        {
            number: 'M-13',
            bottom: { x: 987.7, z: 663.5 },
            join: { x: 990.4, z: 659.9 },
            fork: { x: 978.9, z: 675.2 },
            landing: [
                { x: 975.9, z: 672.3 }, { x: 980.5, z: 672.7 }, { x: 981.1, z: 676.3 },
                { x: 980.5, z: 678.5 }, { x: 976.9, z: 677.4 }, { x: 975.7, z: 674.2 }
            ],
            nodes: ['5018031049', '5847763269', '5847763268'],
            branches: [
                { start: { x: 976.8, z: 673.4 }, mouth: mouth131 },
                { start: { x: 979.8, z: 677.5 }, mouth: mouth132 }
            ],
            roofs: [
                { way: '618713380', points: [{ x: 975.7, z: 673.9 }, mouth131], width: 2.6 },
                { way: '618713379', points: [{ x: 980, z: 678.2 }, { x: 981.4, z: 680.7 }, mouth132], width: 2.35 }
            ]
        },
        {
            number: 'M-10',
            bottom: { x: 1006.7, z: 651.5 },
            join: { x: 1003.5, z: 654.4 },
            apronEnd: { x: 1007.6, z: 650.4 },
            fork: project(135.5020929, 34.7022520),
            landing: [
                { x: 1010.6, z: 637.4 }, { x: 1013.4, z: 635.7 }, { x: 1015.2, z: 637.7 },
                { x: 1019.65, z: 640.15 }, { x: 1018.9, z: 643.5 }, { x: 1015.4, z: 643.2 },
                { x: 1012.15, z: 640.8 }
            ],
            nodes: ['2715291684', '5846147483', '5846147484'],
            sidewalkWays: ['618516667', '618516668'],
            branches: [
                { start: { x: 1018.1, z: 641.45 }, mouth: mouth101, street: { x: 1029.38, z: 642.53 } },
                { start: { x: 1012.9, z: 637.25 }, mouth: mouth102, street: { x: 1011.04, z: 626.92 } }
            ],
            roofs: [
                { way: '618516673', points: [{ x: 1018.04, z: 641.49 }, { x: 1021.59, z: 642.84 }, mouth101], width: 3.05, mouth: mouth101 },
                { way: '618516672', points: [{ x: 1013.07, z: 636.4 }, { x: 1011.23, z: 632.93 }, mouth102], width: 2.85, mouth: mouth102 }
            ]
        },
        {
            number: 'M-14',
            bottom: { x: 1009.5, z: 665.35 },
            join: { x: 1004.5, z: 665.2 },
            apronEnd: { x: 1010.65, z: 666.2 },
            fork: project(135.5021115, 34.7019719),
            landing: [
                { x: 1013.5, z: 669.15 }, { x: 1017.8, z: 667.4 }, { x: 1020.7, z: 668.9 },
                { x: 1018.55, z: 672.25 }, { x: 1016.6, z: 676.15 }, { x: 1013.5, z: 676.3 },
                { x: 1013.25, z: 672.85 }
            ],
            nodes: ['5018031050', '5847763275', '5847763274'],
            sidewalkWays: ['618713378', '618713377'],
            branches: [
                { start: { x: 1015.1, z: 675.65 }, mouth: mouth141, street: { x: 1014.58, z: 687.19 } },
                { start: { x: 1019.3, z: 669.15 }, mouth: mouth142, street: { x: 1031.05, z: 665.3 } }
            ],
            roofs: [
                { way: '618713381', points: [{ x: 1015.13, z: 675.28 }, { x: 1014.28, z: 679.47 }, mouth141], width: 2.95, mouth: mouth141 },
                { way: '618713382', points: [{ x: 1019.13, z: 669.28 }, { x: 1022.17, z: 666.9 }, mouth142], width: 2.85, mouth: mouth142 }
            ]
        }
    ];
    for (const group of groups) {
        const id = 'whity-exit-' + group.number.toLowerCase();
        const name = messageText('facilities.locations.whityExit', { number: group.number });
        const evidence: Evidence = {
            source: 'district',
            pages: [50, 53],
            urls: [
                operatorPlan,
                ...group.nodes.map(node => 'https://www.openstreetmap.org/node/' + node),
                ...group.roofs.map(roof => 'https://www.openstreetmap.org/way/' + roof.way),
                ...(group.sidewalkWays ?? []).map(way => 'https://www.openstreetmap.org/way/' + way)
            ],
            detail: 'Operator diagrams show the shared stair from Izumi-no-hiroba (泉の広場) and the divided street mouths. The OSM roof ends locate both branches. The shared landing height, widths and underground coordinates are fitted.'
        };
        const elevationOffset = 4.2;
        const from = { id: id + '-b1', level: 'district-underground' as const, ...group.bottom };
        const fork = { id: id + '-fork', level: from.level, elevationOffset, ...group.fork };
        connections.push({ id, kind: 'stairs', blockId, from, to: fork, placement: 'exterior', width: 3.1, evidence });
        floor(id + '-b1-apron', name, from.level, passageOutline(group.join, group.apronEnd ?? group.bottom, 5), evidence);
        floor(id + '-middle-landing', name, fork.level, group.landing, evidence, elevationOffset);
        for (const [i, branch] of group.branches.entries()) {
            const branchId = id + '-' + (i + 1);
            const low = { id: branchId + '-fork', level: fork.level, elevationOffset, ...branch.start };
            const top = { id: branchId + '-ground', level: 'district-ground' as const, ...branch.mouth };
            const width = 2.15;
            connections.push({ id: branchId, kind: 'stairs', blockId, from: low, to: top, width, evidence });
            const dx = top.x - low.x;
            const dz = top.z - low.z;
            const run = Math.hypot(dx, dz);
            const behind = { x: top.x - dx / run, z: top.z - dz / run };
            const ahead = branch.street ?? { x: top.x + 3 * dx / run, z: top.z + 3 * dz / run };
            floor(branchId + '-street-apron', name, top.level, passageOutline(behind, ahead, width + 1.4), evidence);
        }
        for (const [i, roof] of group.roofs.entries()) {
            canopies.push({
                id: id + '-canopy-' + (i + 1),
                level: 'district-ground',
                points: roof.points,
                width: roof.width,
                clearHeight: 2.9,
                postClearances: roof.mouth ? [{ point: roof.mouth, radius: 2 }] : undefined,
                evidence
            });
        }
    }

    const liftProof: Evidence = {
        source: 'district',
        pages: [50, 53],
        urls: [operatorPlan, cityPlan, 'https://whity.osaka-chikagai.jp/service', aerial],
        detail: 'The operator distinguishes the passenger and service lifts. Osaka City shows the B1 and street passenger access on the road median. The displayed shaft position and headings are fitted to the map, photos and aerial roof.'
    };
    const shaft = { x: 998.5, z: 675.7 };
    const lift: VerticalConnection = {
        id: 'whity-izumi-public-lift',
        kind: 'elevator',
        blockId,
        from: { id: 'whity-izumi-lift-b1', level: 'district-underground', ...shaft },
        to: { id: 'whity-izumi-lift-street', level: 'district-ground', ...shaft },
        doorFacingRad: -Math.PI / 2,
        evidence: liftProof
    };
    connections.push(lift);
    const liftName = messageText('facilities.locations.whityIzumi');
    floor('whity-izumi-lift-b1-apron', liftName, lift.from.level, passageOutline({ x: 996.2, z: 665.5 }, shaft, 4.6), liftProof);
    floor('whity-izumi-lift-street-apron', liftName, lift.to.level, passageOutline({ x: shaft.x, z: shaft.z - 5.5 }, shaft, 4.2), liftProof);
    const plaza = project(135.5019124, 34.7020743);
    const plazaOutline = Array.from({ length: 24 }, (_, i) => {
        const angle = i * Math.PI / 12;
        return { x: plaza.x + 8.8 * Math.cos(angle), z: plaza.z + 8.8 * Math.sin(angle) };
    });
    floor('whity-izumi-plaza', liftName, 'district-underground', plazaOutline, {
        source: 'district',
        pages: [50, 53],
        urls: [operatorPlan, 'https://www.openstreetmap.org/node/5018031057'],
        detail: 'Operator plan shows the round public square around the landmark. The centre follows the OSM plaza node; the outline is fitted.'
    });
    const landmark: PublicLandmark = {
        id: 'whity-izumi-water-tree',
        kind: 'water-tree',
        name: messageText('publicAreas.whity.entities.waterTree.name'),
        level: 'district-underground',
        ...plaza,
        evidence: {
            source: 'district',
            pages: [],
            urls: ['https://www.osaka-chikagai.jp/facility/whity', 'https://naked.co.jp/works/6817/'],
            detail: 'The static model follows the silver trunk and reflective crown installed in 2019. Dimensions and lighting colour are fitted; the former fountain is absent.'
        }
    };
    return { areas, connections, canopies, landmarks: [landmark] };
}
