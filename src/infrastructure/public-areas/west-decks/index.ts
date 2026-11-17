import { messageText } from '../../i18n/index.ts';
import type { DeckBlock, DeckPortal } from '../../../domain/map/public-deck.ts';
import { deckEvidence, sourceDeckPaths } from '../elevated-source.ts';

/**
 * Register the public deck west of LUCUA without connecting it to the underground paid platforms.
 */
export function westDecks(): {
    blocks: DeckBlock[];
    portals: DeckPortal[];
} {
    return {
        blocks: [{
            id: 'west-decks',
            name: messageText('publicAreas.westDecks.entities.westDecks.name'),
            level: 'district-north-deck',
            paths: sourceDeckPaths(['lucua-umekita', 'umekita-public']),
            regions: [],
            evidence: deckEvidence
        }],
        portals: [{
            id: 'lucua-west-concourse',
            blockId: 'west-decks',
            target: 'station:jr-osaka',
            point: { x: 293.9, z: 616 },
            width: 7,
            angle: Math.PI / 3,
            level: 'district-north-deck',
            evidence: deckEvidence
        }],
    };
}
