import { messageText } from '../../i18n/index.ts';
import type { DeckBlock, DeckPortal } from '../../../domain/map/public-deck.ts';
import { deckEvidence, sourceDeckPaths, deckPath } from '../elevated-source.ts';
import { jrGroundPoint } from '../../stations/jr-osaka/geographic.ts';
import { gateLanternDeck, gateLanternSouthBuilding } from './gate-lantern.ts';
import { groveNorthLanding } from './umekita-grove.ts';
import { southParkDeckLanding } from './park-access.ts';
import { northConnectionBridge } from './north-connection.ts';

/**
 * Register the public deck west of LUCUA without connecting it to the underground paid platforms.
 */
export function westDecks(): {
    blocks: DeckBlock[];
    portals: DeckPortal[];
} {
    const stationDoor = jrGroundPoint({ x: -53, z: -47 });
    const parkPaths = sourceDeckPaths(['umekita-public']);
    const parkSouth = parkPaths[0]!.points[0]!;
    const grovePaths = sourceDeckPaths(['umekita-grove-deck']);
    const groveEnd = grovePaths.at(-1)!.points.at(-1)!;
    const southBuilding = gateLanternSouthBuilding();
    const northConnection = northConnectionBridge();
    return {
        blocks: [{
            id: 'west-decks',
            name: messageText('publicAreas.westDecks.entities.westDecks.name'),
            level: 'district-north-deck',
            paths: [
                ...sourceDeckPaths(['lucua-umekita']),
                ...parkPaths,
                ...grovePaths,
                groveNorthLanding(groveEnd),
                southParkDeckLanding(parkPaths[0]!.points.at(-1)!),
                gateLanternDeck(parkSouth),
                southBuilding.path,
                northConnection.path,
                deckPath('lucua-west-calibrated-concourse', messageText('publicAreas.westDecks.entities.westDecks.name'), [{ x: 293.9, z: 616 }, stationDoor], 7)
            ],
            regions: [],
            evidence: deckEvidence
        }],
        portals: [{
            id: 'lucua-west-concourse',
            blockId: 'west-decks',
            target: 'station:jr-osaka',
            point: stationDoor,
            width: 7,
            angle: Math.PI / 3,
            level: 'district-north-deck',
            evidence: deckEvidence
        }, southBuilding.portal, ...northConnection.portals],
    };
}
