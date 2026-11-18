import { messageText } from '../../i18n/index.ts';
import config from '../../../../data/geography/elevated/inogate.json' with { type: 'json' };
import type { DeckBlock, DeckPortal } from '../../../domain/map/public-deck.ts';
import type { Evidence } from '../../../domain/map/model.ts';
import { jrGroundPoint } from '../../stations/jr-osaka/geographic.ts';

export const inogateDeckEvidence: Evidence = {
    source: 'district',
    pages: [1, 4],
    urls: ['https://www.westjr.co.jp/press/article/2025/02/page_27332.html'],
    detail: config.sources.join('; ') + '; ' + config.note + ' Reference-derived geometry permission pending.',
};
/** Separate from the LUCUA / Green Place northern bridge; stable authored source fit. */
export function inogateDecks(): {
    blocks: DeckBlock[];
    portals: DeckPortal[];
} {
    const level = 'district-north-deck';
    const stationDoor = jrGroundPoint({ x: -60, z: -41 });
    const sourceDoor = config.portals.find(p => p.id === 'inogate-jr-public')!.point;
    return {
        blocks: [{
            id: 'inogate-decks',
            name: messageText('publicAreas.westDecks.entities.inogateDecks.name'),
            level,
            paths: [
                ...config.paths.map(path => ({ ...path, width: config.widthMetres, evidence: inogateDeckEvidence })),
                { id: 'inogate-calibrated-jr-frontage', name: messageText('publicAreas.westDecks.entities.inogateDecks.name'), points: [sourceDoor, stationDoor], width: config.widthMetres, evidence: inogateDeckEvidence }
            ],
            regions: [],
            evidence: inogateDeckEvidence,
        }],
        portals: config.portals.map(portal => ({
            ...portal,
            ...(portal.id === 'inogate-jr-public' ? { point: stationDoor } : {}),
            blockId: 'inogate-decks',
            level,
            width: config.widthMetres,
            evidence: inogateDeckEvidence,
        })),
    };
}
