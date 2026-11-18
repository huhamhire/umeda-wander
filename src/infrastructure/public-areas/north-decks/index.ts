import { messageText } from '../../i18n/index.ts';
import type { StationMap } from '../../../domain/map/model.ts';
import type { DeckBlock, DeckPortal } from '../../../domain/map/public-deck.ts';
import { building as yodobashi } from '../../buildings/yodobashi/index.ts';
import { deckEvidence, sourceDeckPaths, deckPath } from '../elevated-source.ts';
import { jrAtriumPoint } from '../../stations/jr-osaka/geographic.ts';

/**
 * Connect the north atrium, commercial galleries and Hankyu public interface while preserving block ownership.
 */
export function northDecks(stations: StationMap[]): {
    blocks: DeckBlock[];
    portals: DeckPortal[];
} {
    const gallery = yodobashi.galleries![0]!;
    const hankyu = stations.find(s => s.id === 'hankyu-umeda')!.layout.areas.find(a => a.id === 'hankyu-umeda-jr-interface')!;
    const stationDoor = hankyu.outline.reduce((p, q) => ({ x: p.x + q.x / 4, z: p.z + q.z / 4 }), { x: 0, z: 0 });
    const paths = sourceDeckPaths([
        'grand-front-bridge',
        'grand-front-atrium',
        'yodobashi-west',
        'yodobashi-east',
        'hankyu-link',
        'atrium-public'
    ]);
    // The calibrated station moved north of the raw OSM arcade end. Continue along
    // the west public frontage to its declared JR interface, outside the paid hall.
    paths.push(deckPath(
        'hankyu-public-frontage',
        messageText('publicAreas.northDecks.deckPaths.hankyuPublicFrontage.name'),
        [{ x: 659.8, z: 446.5 }, { x: 644, z: 390 }, stationDoor]
    ));
    const atriumDoor = jrAtriumPoint({ x: -1, z: -68 });
    paths.push(deckPath(
        'atrium-compact-landing',
        messageText('publicAreas.northDecks.entities.northDecks.name'),
        [{ x: 393.7, z: 521.8 }, atriumDoor]
    ));
    const portal = (id: string, target: string, point: {
        x: number;
        z: number;
    }, angle: number): DeckPortal => ({
        id,
        blockId: 'north-decks',
        target,
        point,
        angle,
        width: 6,
        level: 'district-north-deck',
        evidence: deckEvidence
    });
    return {
        blocks: [{
            id: 'north-decks',
            name: messageText('publicAreas.northDecks.entities.northDecks.name'),
            level: 'district-north-deck',
            paths,
            regions: [{ outline: gallery.outline, holes: [gallery.innerOutline] }],
            evidence: deckEvidence
        }],
        portals: [
            portal('grand-front-north-door', 'grand-front-north', { x: 339.7, z: 326.5 }, Math.PI / 2),
            portal('grand-front-south-bridge-door', 'grand-front-south', { x: 347.2, z: 373.5 }, Math.PI / 2),
            portal('grand-front-atrium-door', 'grand-front-south', { x: 369.3, z: 481.6 }, Math.PI / 3),
            portal('hankyu-jr-interface', 'station:hankyu-umeda', stationDoor, -Math.PI / 2),
            portal('jr-north-atrium', 'station:jr-osaka', atriumDoor, Math.PI / 3),
            portal('yodobashi-west-gallery', 'yodobashi', { x: 438.3, z: 473.1 }, -Math.PI / 4),
            portal('yodobashi-east-gallery', 'yodobashi', { x: 510.7, z: 447.9 }, Math.PI / 3),
        ]
    };
}
