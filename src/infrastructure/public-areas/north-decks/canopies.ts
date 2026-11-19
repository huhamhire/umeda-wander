import type { Point2, WalkwayCanopy } from '../../../domain/map/model.ts';
import type { DeckPath } from '../../../domain/map/public-deck.ts';
import { closestPolygonPoint } from '../../../domain/map/geometry.ts';
import { building as yodobashi } from '../../buildings/yodobashi/index.ts';
import { sourceDeckPaths } from '../elevated-source.ts';

/** Fit a source point midway across the rendered Yodobashi (ヨドバシ梅田) gallery. */
function galleryCentre(point: Point2): Point2 {
    const gallery = yodobashi.galleries![0]!;
    const outer = closestPolygonPoint(point, gallery.outline);
    const inner = closestPolygonPoint(point, gallery.innerOutline);
    return { x: (outer.x + inner.x) / 2, z: (outer.z + inner.z) / 2 };
}

/** Reuse the public deck height and axis while fitting roof dimensions. */
function bridgeCanopy(path: DeckPath, points = path.points): WalkwayCanopy {
    return {
        id: 'canopy-' + path.id,
        level: 'district-north-deck',
        points,
        width: path.width + .6,
        clearHeight: 3.2,
        glazed: true,
        evidence: {
            ...path.evidence,
            detail: path.evidence.detail + ' Bridge canopy panel and support dimensions are fitted.'
        }
    };
}

/** Cover the documented arcade and bridge spans while leaving the northern frontage open. */
export function northDeckCanopies(): WalkwayCanopy[] {
    const paths = new Map(sourceDeckPaths([
        'grand-front-atrium',
        'yodobashi-west',
        'yodobashi-east',
        'yodobashi-ring',
        'hankyu-link'
    ]).map(path => [path.id.split(':')[1]!, path]));
    const grandFront = paths.get('501012843')!;
    const westBridge = paths.get('850399264')!;
    const eastBridge = paths.get('1313244355')!;
    const eastApron = paths.get('850398035')!;
    const hankyuBridge = paths.get('330561953')!;
    const westGallery = paths.get('533778889')!;
    const southGallery = paths.get('537367760')!;
    const southeastGallery = paths.get('504385461')!;
    const eastGallery = paths.get('788888926')!;

    const westMouth = westBridge.points[0]!;
    const eastMouth = eastBridge.points.at(-1)!;
    const postClearances = [westMouth, eastMouth].map(point => ({ point, radius: 4.5 }));

    const eastEnd = eastGallery.points.at(-1)!;
    const beforeEnd = eastGallery.points.at(-2)!;
    // Stop before the LINKS UMEDA (リンクス梅田) entrance flare at the end of the covered arcade.
    const eastRoofEnd = { x: (beforeEnd.x + eastEnd.x) / 2, z: (beforeEnd.z + eastEnd.z) / 2 };
    const galleryPoints = [
        ...westGallery.points.slice().reverse(),
        ...southGallery.points.slice(0, -1).reverse(),
        ...southeastGallery.points.slice(1),
        ...eastGallery.points.slice(1, -1),
        eastRoofEnd
    ].map(galleryCentre);
    return [
        bridgeCanopy(grandFront),
        {
            ...bridgeCanopy(westBridge, [galleryCentre(westMouth), ...westBridge.points]),
            postClearances
        },
        {
            ...bridgeCanopy(eastBridge, [...eastApron.points, ...eastBridge.points.slice(1), galleryCentre(eastMouth)]),
            postClearances,
            evidence: {
                ...eastBridge.evidence,
                urls: [...eastBridge.evidence.urls!, 'https://www.openstreetmap.org/way/850398035'],
                detail: 'The east bridge and its Carillon Plaza (カリヨン広場) apron share a fitted roof with an open mouth at the gallery.'
            }
        },
        {
            ...bridgeCanopy(hankyuBridge),
            evidence: {
                ...hankyuBridge.evidence,
                detail: 'OSM marks this bridge on the Hankyu (阪急) approach as covered. Roof width and support spacing are fitted.'
            }
        },
        {
            id: 'canopy-yodobashi-gallery',
            level: 'district-north-deck',
            points: galleryPoints,
            width: 4.6,
            clearHeight: 3.26,
            postClearances,
            evidence: {
                ...westGallery.evidence,
                urls: [
                    ...westGallery.evidence.urls!,
                    ...[southGallery, southeastGallery, eastGallery].map(path => path.evidence.urls!.at(-1)!),
                    'https://www.yodobashi.com/ec/support/news/190603326750/index.html'
                ],
                detail: 'The western, southern and eastern OSM covered arcades locate the pale roof on the Yodobashi (ヨドバシ梅田) podium gallery. Shape and extent are fitted to the gallery and user reference.'
            }
        }
    ];
}
