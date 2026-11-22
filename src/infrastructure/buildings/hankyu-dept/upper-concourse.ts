import clipping from 'polygon-clipping';
import type { BuildingOpening, Evidence, FloorArea, Point2, VerticalConnection } from '../../../domain/map/model.ts';
import type { DeckPath } from '../../../domain/map/public-deck.ts';
import { joinedPassageOutlines, passageOutline } from '../../../domain/map/geometry.ts';
import { messageText } from '../../i18n/index.ts';
import { building as departmentStore } from './index.ts';
import { building as grandBuilding } from '../hankyu-grand/index.ts';

const name = messageText('buildings.hankyuDept.entities.hankyuEastWestConcourse.name');
const evidence: Evidence = {
    source: 'district',
    pages: [],
    urls: [
        'https://www.hankyu.co.jp/company/news/pdf/ER201209194N1.pdf#page=1',
        'https://www.openstreetmap.org/way/496684916',
        'https://www.openstreetmap.org/way/685434319',
        'https://www.openstreetmap.org/way/620835769',
        'https://www.openstreetmap.org/way/685434321',
        'https://www.openstreetmap.org/way/557024415',
        'https://www.openstreetmap.org/way/620835764',
        'https://www.openstreetmap.org/way/557024417',
        'https://www.openstreetmap.org/way/620835762'
    ],
    detail: 'The Hankyu (阪急) two-floor diagram confirms the bridge continues into the upper east–west passage. The OSM ways locate the separate Sun Plaza (阪急サン広場) ground approaches, stairs and escalator; widths and heights are display fits.'
};

const blockId = 'south-decks';
const deckLevel = 'district-south-deck';

/** Land each device at the corresponding OSM endpoint on its physical level. */
function sunPlazaConnection(id: string, kind: 'stairs' | 'escalator', ground: Point2, deck: Point2): VerticalConnection {
    return {
        id,
        kind,
        blockId,
        width: 3,
        from: { ...ground, id: id + '-ground', level: 'district-ground' },
        to: { ...deck, id: id + '-deck', level: deckLevel },
        evidence,
    };
}

export const hankyuSunPlazaConnections = [
    sunPlazaConnection('hankyu-concourse-sun-stairs', 'stairs', { x: 737.12, z: 487.56 }, { x: 721.1, z: 498.3 }),
    sunPlazaConnection('hankyu-concourse-sun-escalator', 'escalator', { x: 738.96, z: 506.95 }, { x: 721.8, z: 506.8 }),
];

const plazaOutlines = [
    passageOutline({ x: 700.5, z: 517.3 }, { x: 731, z: 502.2 }, 9),
    [{ x: 729, z: 504.8 }, { x: 729.5, z: 498 }, { x: 751.3, z: 487.6 }, { x: 753.8, z: 504.3 },
        { x: 743.5, z: 509 }, { x: 736, z: 509 }],
    passageOutline({ x: 736.6, z: 486.6 }, { x: 741.6, z: 494 }, 4.2),
];

export const hankyuSunPlazaAreas: FloorArea[] = plazaOutlines.map((outline, i) => ({
    id: 'hankyu-concourse-sun-ground-' + i,
    name,
    kind: 'public',
    level: 'district-ground',
    blockId,
    outline,
    label: false,
    evidence,
}));

/** Extend the northern bridge arm using the sourced indoor 2F axes and their shared junction. */
export function hankyuUpperDeckPaths(bridgeMouth: Point2): DeckPath[] {
    const junction = { x: 717.06, z: 505.71 };
    const [stairs, escalator] = hankyuSunPlazaConnections;
    return [
        [bridgeMouth, { x: 652.9, z: 558.2 }, { x: 650.9, z: 547.8 }, junction],
        [junction, { x: 716.5, z: 501.2 }, stairs!.to],
        [junction, { x: 717.4, z: 508.9 }, escalator!.to],
    ].map((points, i) => ({ id: 'hankyu-dept-upper-concourse-' + i, name, points, width: 6, evidence }));
}

/** Carve only the parts of the 1F/2F public space that overlap the two exterior shells. */
export function hankyuUpperConcourseOpenings(paths: DeckPath[], deckY: number): BuildingOpening[] {
    const slots = paths.flatMap(path => {
        const radius = path.width / 2 + .7;
        const joints = path.points.map(point => Array.from({ length: 12 }, (_, i) => ({
            x: point.x + radius * Math.cos(i * Math.PI / 6),
            z: point.z + radius * Math.sin(i * Math.PI / 6),
        })));
        return [...joinedPassageOutlines(path.points, 2 * radius), ...joints];
    });
    const cuts = [
        { outlines: plazaOutlines, base: 0, top: 3.75 },
        { outlines: slots, base: deckY - .1, top: deckY + 3.7 },
    ];
    return cuts.flatMap(({ outlines, base, top }) => {
        const polygons = outlines.map(outline => [outline.map((p): clipping.Pair => [p.x, p.z])]);
        const clearance = clipping.union(polygons[0]!, ...polygons.slice(1));
        return [departmentStore, grandBuilding].flatMap(building => {
            const host: clipping.Polygon = [building.volumes[0]!.outline.map(p => [p.x, p.z])];
            return clipping.intersection(host, clearance).map(([ring]) => ({
                buildingId: building.id,
                outline: ring!.map(([x, z]) => ({ x, z })),
                base,
                top,
                evidence,
            }));
        });
    });
}
