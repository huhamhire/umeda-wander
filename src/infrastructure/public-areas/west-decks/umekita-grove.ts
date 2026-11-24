import clipping from 'polygon-clipping';
import source from '../../../../data/geography/elevated/umekita-grove.json' with { type: 'json' };
import { passageOutline, pointInPolygon } from '../../../domain/map/geometry.ts';
import type { FloorArea, Point2, PublicPark, VerticalConnection } from '../../../domain/map/model.ts';
import type { DeckPath } from '../../../domain/map/public-deck.ts';
import { parkTerrainElevation } from '../../../domain/map/park-terrain.ts';
import { messageText } from '../../i18n/index.ts';

/** Adapt the simplified operator plan into the shared east/south metre frame. */
function point(coordinates: number[]): Point2 {
    return { x: coordinates[0]!, z: coordinates[1]! };
}

/** Combine the displayed park paths into a single surface at bends and junctions. */
function parkPaths() {
    const rings = source.paths.flatMap(path => [
        ...path.slice(1).map((end, index) =>
            [passageOutline(point(path[index]!), point(end), 3.4).map(({ x, z }): clipping.Pair => [x, z])]
        ),
        ...path.map(([x, z]) => [Array.from({ length: 12 }, (_, index): clipping.Pair => [
            x! + Math.cos(index * Math.PI / 6) * 1.7,
            z! + Math.sin(index * Math.PI / 6) * 1.7
        ])])
    ]);
    const boundary: clipping.Polygon = [source.outline.map(([x, z]) => [x!, z!])];
    return clipping.intersection(clipping.union(rings[0]!, ...rings.slice(1)), boundary).map(([outer, ...holes]) => ({
        outline: outer!.map(point),
        holes: holes.map(ring => ring.map(point))
    }));
}

const paths = parkPaths();
const outline = source.outline.map(point);
const pond = source.pond.map(point);

/** Open portion of Umekita Grove (うめきたの森), fitted from the November opening and operator plan. */
export const umekitaGrove: PublicPark = {
    id: 'umekita-grove',
    name: messageText('publicAreas.westDecks.entities.umekitaGrove.name'),
    level: 'district-ground',
    labelPoint: point(source.label),
    outline,
    lawns: source.lawns.map(ring => ({ outline: ring.map(point) })),
    pond: { outline: pond },
    waterfall: {
        from: point(source.waterfall.from),
        to: point(source.waterfall.to),
        drop: source.waterfall.drop
    },
    paths,
    landform: { ...source.landform, basin: source.landform.basin.map(point) },
    trees: source.trees.map(coordinates => ({ ...point(coordinates), height: coordinates[2]! }))
        .filter(tree => pointInPolygon(tree, outline) && !pointInPolygon(tree, pond) &&
            !paths.some(path => pointInPolygon(tree, path.outline) && !path.holes.some(hole => pointInPolygon(tree, hole)))),
    evidence: {
        source: 'district',
        pages: [],
        urls: [
            ...source.sources.map(item => item.url),
            'https://www.mec.co.jp/news/detail/2026/11/20_mec261120_ggo',
            'https://www.nikken.jp/ja/dbook/nj202503/pageindices/index11.html'
        ],
        detail: 'Opened ' + source.opening + '. Grove (うめきたの森) boundary, planting and water positions are illustrative fits. ' +
            'Landform and basin elevations are relative display fits based on the surrounding mounds and waterfall. Reference geometry reuse permission pending.'
    }
};

const stairApproach = source.northAccess.upperApproach.map(point);
const lower = point(source.northAccess.lower);
const stairEvidence = {
    ...umekitaGrove.evidence,
    urls: [
        'https://www.openstreetmap.org/way/1314528005',
        'https://www.openstreetmap.org/way/1347368415',
        'https://www.openstreetmap.org/way/1347368414',
        'https://www.youtube.com/watch?v=VhSKsOq0Fws&t=133s'
    ],
    detail: 'Opening-day footage shows stairs into Umekita Grove (うめきたの森). OSM supplies the stair axis and connected approaches. ' +
        'The upper terrace and stair rise are fitted to the map 2F and park terrain; their levels are not measured.'
};

export const groveNorthStairs: VerticalConnection = {
    id: 'umekita-grove-north-stairs',
    kind: 'stairs',
    from: {
        id: 'umekita-grove-north-stairs-ground',
        level: 'district-ground',
        ...lower,
        elevationOffset: parkTerrainElevation(umekitaGrove, lower) - .55
    },
    to: { id: 'umekita-grove-north-stairs-deck', level: 'district-north-deck', ...stairApproach.at(-1)! },
    width: 3,
    blockId: 'west-decks',
    placement: 'exterior',
    evidence: stairEvidence
};

/** Flat lower landing meets the graded park path at the stair foot. */
export const groveNorthStairLanding: FloorArea = {
    id: 'umekita-grove-north-stairs-apron',
    name: umekitaGrove.name,
    kind: 'public',
    blockId: 'west-decks',
    level: groveNorthStairs.from.level,
    elevationOffset: groveNorthStairs.from.elevationOffset,
    height: .70,
    outline: passageOutline({ x: lower.x - 1.3, z: lower.z + 1.6 }, { x: lower.x + .8, z: lower.z - 1 }, 3.6),
    evidence: stairEvidence
};

/** Connect the OSM bridge end to the stairs along the mapped north-side walkway. */
export function groveNorthLanding(bridgeEnd: Point2): DeckPath {
    return {
        id: 'umekita-grove-north-landing',
        name: umekitaGrove.name,
        points: [bridgeEnd, ...stairApproach],
        width: 4,
        evidence: stairEvidence
    };
}
