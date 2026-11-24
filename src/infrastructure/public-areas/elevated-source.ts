import { messageText } from '../i18n/index.ts';
import north from '../../../data/geography/elevated/north.json' with { type: 'json' };
import south from '../../../data/geography/elevated/south.json' with { type: 'json' };
import west from '../../../data/geography/elevated/west.json' with { type: 'json' };
import snapshot from '../../../data/geography/elevated/ways.json' with { type: 'json' };
import type { Evidence, Point2, Level } from '../../domain/map/model.ts';
import type { DeckPath } from '../../domain/map/public-deck.ts';

export const elevatedLevels: Level[] = [
    {
        id: 'district-north-deck',
        label: '2F',
        name: messageText('publicAreas.elevatedSource.entities.districtNorthDeck.name'),
        y: 8,
        stackIndex: 2,
        description: '北中庭、Yodobashi、Grand Front、阪急公共连廊；展示标高，非测绘高程。'
    },
    {
        id: 'district-south-deck',
        label: '2F',
        name: messageText('publicAreas.elevatedSource.entities.districtSouthDeck.name'),
        y: 4,
        stackIndex: 1,
        description: '大丸前庭、阪急阪神步道桥与 JP Tower；探索层归 2F。'
    },
];
export const deckEvidence: Evidence = {
    source: 'district',
    pages: [1],
    urls: ['https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda02-3%28202404%29.pdf'],
    detail: 'Umeda elevated walkway reference, page 1 right elevated plan, station-city 2F/3F images and operator plans. OSM walking axes retained; deck widths, landings and heights estimated. Reference-derived geometry permission pending.'
};
/**
 * Project source longitude and latitude into the shared district metre frame, with east x and south z.
 */
const project = ([lon, lat]: number[]): Point2 => ({ x: (lon! - 135.491) * 111320 * Math.cos(34.708 * Math.PI / 180), z: (34.708 - lat!) * 111320 });
const configs: ((typeof north.links)[number] & { sourceUrls?: string[] })[] =
    [north, south, west].flatMap(c => c.links);
export const elevatedWidthEstimates = configs.filter(l => l.ways.length).map(l => ({
    id: l.id,
    ways: l.ways,
    widthMetres: l.widthMetres,
    basis: 'illustrative'
}));
export const pendingDecks = configs.filter(l => !l.ways.length && 'status' in l && l.status === 'provisional');
/**
 * Read OSM walkway axes for registered connections and fail explicitly when a source is missing.
 */
export function sourceDeckPaths(ids: string[]): DeckPath[] {
    return ids.flatMap(id => {
        const link = configs.find(l => l.id === id);
        if (!link) {
            throw new Error('Missing deck link ' + id);
        }
        return link.ways.map(way => {
            const f = snapshot.ways.find(f => f.id === String(way));
            if (!f) {
                throw new Error('Missing deck OSM way ' + way);
            }
            return {
                id: id + ':' + way,
                name: link.name,
                points: f.coordinates.map(project),
                width: link.widthMetres,
                evidence: {
                    ...deckEvidence,
                    urls: [
                        ...deckEvidence.urls!,
                        ...link.sourceUrls ?? [],
                        'https://www.openstreetmap.org/way/' + way
                    ],
                    detail: deckEvidence.detail + ' ' + link.source + '; ' + link.geometryEvidence
                }
            };
        });
    });
}

/**
 * Attach an estimated width and independent evidence to an authored public deck axis.
 */
export const deckPath = (id: string, name: string, points: Point2[], width = 6): DeckPath => ({
    id,
    name,
    points,
    width,
    evidence: {
        ...deckEvidence,
        detail: deckEvidence.detail + ' Authored source-aligned local adapter, not a nearest-building shortcut.'
    }
});
