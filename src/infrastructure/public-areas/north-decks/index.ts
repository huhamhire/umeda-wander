import { messageText } from '../../i18n/index.ts';
import type { StationMap } from '../../../domain/map/model.ts';
import type { DeckBlock, DeckPortal } from '../../../domain/map/public-deck.ts';
import { building as yodobashi } from '../../buildings/yodobashi/index.ts';
import { deckEvidence, sourceDeckPaths, deckPath } from '../elevated-source.ts';
import { closestPolygonPoint } from '../../../domain/map/geometry.ts';
import { building as grandFrontNorth } from '../../buildings/grand-front-north/index.ts';
import { building as grandFrontSouth } from '../../buildings/grand-front-south/index.ts';

/**
 * Connect the north atrium, commercial galleries and Hankyu (阪急) public interface while preserving block ownership.
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
    const grandFrontApproach = paths.find(p => p.id === 'grand-front-atrium:501012843')!;
    const southEntranceBranch = paths.find(p => p.id === 'grand-front-atrium:553431479')!;
    const interBuildingBridge = paths.find(p => p.id === 'grand-front-bridge:220190709')!;
    // The OSM nodes identify the entrances. Fit them to their declared podium faces only.
    const southOutline = grandFrontSouth.volumes[0]!.outline;
    const northOutline = grandFrontNorth.volumes[0]!.outline;
    const southEntrance = closestPolygonPoint(grandFrontApproach.points.at(-1)!, southOutline);
    const southSideEntrance = closestPolygonPoint(southEntranceBranch.points.at(-1)!, southOutline);
    const southBridgeEntrance = closestPolygonPoint(interBuildingBridge.points[0]!, southOutline);
    const northBridgeEntrance = closestPolygonPoint(interBuildingBridge.points.at(-1)!, northOutline);
    const atriumDoor = grandFrontApproach.points[0]!;
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
            portal('grand-front-north-door', 'grand-front-north', northBridgeEntrance, Math.PI / 2),
            portal('grand-front-south-bridge-door', 'grand-front-south', southBridgeEntrance, Math.PI / 2),
            portal('grand-front-atrium-door', 'grand-front-south', southEntrance, Math.PI / 3),
            portal('grand-front-atrium-side-door', 'grand-front-south', southSideEntrance, Math.PI / 2),
            portal('hankyu-jr-interface', 'station:hankyu-umeda', stationDoor, -Math.PI / 2),
            portal('jr-north-atrium', 'station:jr-osaka', atriumDoor, Math.PI / 3),
            portal('yodobashi-west-gallery', 'yodobashi', { x: 438.3, z: 473.1 }, -Math.PI / 4),
            portal('yodobashi-east-gallery', 'yodobashi', { x: 510.7, z: 447.9 }, Math.PI / 3),
        ]
    };
}
