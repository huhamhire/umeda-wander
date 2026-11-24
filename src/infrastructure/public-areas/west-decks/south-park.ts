import clipping from 'polygon-clipping';
import source from '../../../../data/geography/elevated/umekita-south-park.json' with { type: 'json' };
import buildings from '../../../../data/geography/buildings/umekita-south.json' with { type: 'json' };
import { passageOutline, pointInPolygon } from '../../../domain/map/geometry.ts';
import type { PlanRegion, Point2, PublicPark } from '../../../domain/map/model.ts';
import { messageText } from '../../i18n/index.ts';

/** Adapt prepared east/south metre coordinates. */
function point(coordinates: number[]): Point2 {
    return { x: coordinates[0]!, z: coordinates[1]! };
}

/** Convert a fitted plan ring into the clipping frame. */
function polygon(points: Point2[]): clipping.Polygon {
    return [points.map(({ x, z }) => [x, z])];
}

/** Union OSM-derived paths and the plaza before draping the paving on the terrain. */
function parkPaving(outline: Point2[], pond: Point2[]): PlanRegion[] {
    const strips = source.paths.flatMap(({ points, width }) => [
        ...points.slice(1).map((end, index) => polygon(passageOutline(point(points[index]!), point(end), width))),
        ...points.map(([x, z]) => [Array.from({ length: 10 }, (_, i): clipping.Pair => [
            x! + Math.cos(i * Math.PI / 5) * width / 2,
            z! + Math.sin(i * Math.PI / 5) * width / 2
        ])])
    ]);
    const paved = clipping.union(polygon(source.plaza.map(point)), ...strips);
    return clipping.difference(clipping.intersection(paved, polygon(outline)), polygon(pond))
        .map(([outer, ...holes]) => ({ outline: outer!.map(point), holes: holes.map(ring => ring.map(point)) }));
}

const outline = source.outline.map(point);
const pond = source.pond.map(point);
const paths = parkPaving(outline, pond);

/** South Park (サウスパーク) preserves the street and bridge landings around the low lawn and reflecting pool. */
export const umekitaSouthPark: PublicPark = {
    id: 'umekita-south-park',
    name: messageText('publicAreas.westDecks.entities.southPark.name'),
    level: 'district-ground',
    labelPoint: { x: 151, z: 503 },
    labels: [
        { name: messageText('publicAreas.westDecks.entities.southPlaza.name'), point: { x: 139, z: 555 }, height: 3 },
        { name: messageText('publicAreas.westDecks.entities.rohtoSquare.name'), point: { x: 170, z: 539 }, height: 13 }
    ],
    outline,
    lawns: [{ outline: source.lawn.map(point) }],
    planting: source.planting.map(ring => ({ outline: ring.map(point) })),
    pond: { outline: pond },
    paths,
    landform: {
        basin: source.basin.map(point),
        boundaryY: -1.5,
        basinY: -.48,
        moundRise: 2.65,
        pondY: -.62,
        seams: [
            { point: { x: 109.08, z: 441.6 }, y: 1.08, radius: 9 },
            { point: { x: 142.42, z: 435.32 }, y: -.94, radius: 10 },
            { point: { x: 142.7, z: 431.9 }, y: -.98, radius: 7 },
            { point: { x: 169, z: 573 }, y: -.35, radius: 9 },
            { point: { x: 117, z: 490 }, y: -.48, radius: 24 },
            { point: { x: 158, z: 503 }, y: .48, radius: 30 }
        ]
    },
    pavilions: Object.entries(buildings.pavilions).map(([id, item]) => ({
        id,
        roofs: item.roofs.map(face => face.map(ring => ring.map(([x, z, y]) => ({ x: x!, z: z!, y: y! })))),
        walls: item.walls.map(face => face.map(ring => ring.map(([x, z, y]) => ({ x: x!, z: z!, y: y! }))))
    })),
    trees: source.trees.map(([x, z, height]) => ({ x: x!, z: z!, height: height! }))
        .filter(tree => pointInPolygon(tree, outline) && !pointInPolygon(tree, pond) &&
            !paths.some(path => pointInPolygon(tree, path.outline) && !path.holes?.some(hole => pointInPolygon(tree, hole)))),
    evidence: {
        source: 'district',
        pages: [],
        urls: [...source.sources, buildings.source],
        detail: 'South Park (サウスパーク) plan and published landform inform the fitted terrain and planting. ' +
            'Park roofs and walls use Osaka PLATEAU LOD2. OSM supplies the mapped route axes; levels and ties to the display landings are fitted.'
    }
};
