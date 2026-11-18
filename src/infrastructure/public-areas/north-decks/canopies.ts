import type { WalkwayCanopy } from '../../../domain/map/model.ts';
import { sourceDeckPaths } from '../elevated-source.ts';

/** Follow the covered bridge arms, keeping open plazas and frontage decks clear. */
export function northDeckCanopies(): WalkwayCanopy[] {
    const coveredWays = new Set([
        'grand-front-atrium:501012843',
        'yodobashi-west:850399264',
        'yodobashi-east:1313244355',
        'yodobashi-east:850398035'
    ]);
    return sourceDeckPaths(['grand-front-atrium', 'yodobashi-west', 'yodobashi-east'])
        .filter(path => coveredWays.has(path.id))
        .map(path => ({
            id: 'canopy-' + path.id,
            level: 'district-north-deck',
            points: path.points,
            width: path.width + .6,
            clearHeight: 3.2,
            glazed: true,
            evidence: {
                ...path.evidence,
                detail: path.evidence.detail + ' Roof coverage follows reference photographs of the Grand Front (グランフロント大阪) and Yodobashi (ヨドバシ梅田) bridge arms. Panel and support dimensions are fitted.'
            }
        }));
}
