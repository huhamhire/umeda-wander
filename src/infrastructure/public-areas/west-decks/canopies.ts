import type { WalkwayCanopy } from '../../../domain/map/model.ts';
import type { DeckBlock } from '../../../domain/map/public-deck.ts';

/** Cover the sourced west-side bridges without closing their building mouths. */
export function westDeckCanopies({ paths, level }: DeckBlock): WalkwayCanopy[] {
    const bridge = paths.find(path => path.id === 'lucua-umekita:1347368424')!;
    const lucua = paths.find(path => path.id === 'lucua-umekita:1388246368')!;
    const north = paths.find(path => path.id === 'grand-green-north-connection:1327400333')!;
    const stationDoor = paths.find(path => path.id === 'lucua-west-calibrated-concourse')!.points.at(-1)!;
    // Finish just inside the continuous building roof, which covers the rest of the crossing.
    const points = [stationDoor, ...lucua.points.slice().reverse(), ...bridge.points.slice(1, 4)];
    return [{
        id: 'canopy-lucua-umekita-bridge',
        level,
        points,
        width: bridge.width + .6,
        clearHeight: 3.2,
        glazed: true,
        postClearances: [points[0]!, points.at(-1)!].map(point => ({ point, radius: 4.5 })),
        evidence: {
            ...bridge.evidence,
            urls: [
                ...bridge.evidence.urls!,
                ...lucua.evidence.urls!,
                'https://www.westjr.co.jp/press/article/items/240226_00_press_umekita.pdf'
            ],
            detail: 'The JR West release depicts the glazed covering of the connecting bridge. Roof width, height and the overlap at the retail roof are display fits.'
        }
    }, {
        id: 'canopy-grand-green-north-connection',
        level,
        points: north.points.slice(1, -1),
        width: north.width,
        clearHeight: 3.6,
        evidence: {
            ...north.evidence,
            urls: [...north.evidence.urls!, 'https://jambase-space.com/assets/images/access/conference-img02-2.jpg'],
            detail: 'JAM BASE shows a covered bridge with glazed sides and open thresholds. Canopy height is fitted.'
        }
    }];
}
