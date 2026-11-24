import type { DeckPath, DeckPortal } from '../../../domain/map/public-deck.ts';
import { sourceDeckPaths } from '../elevated-source.ts';

/** Bind the mapped North Connection Bridge (北接続ブリッジ) to the two north wing entrances. */
export function northConnectionBridge(): { path: DeckPath; portals: DeckPortal[] } {
    const source = sourceDeckPaths(['grand-green-north-connection'])[0]!;
    const [west, east] = source.points;
    const angle = Math.atan2(east!.z - west!.z, east!.x - west!.x);
    const dx = Math.cos(angle) * 1.1;
    const dz = Math.sin(angle) * 1.1;
    return {
        path: {
            ...source,
            points: [
                { x: west!.x - dx, z: west!.z - dz }, west!, east!,
                { x: east!.x + dx, z: east!.z + dz }
            ]
        },
        portals: [
            { id: 'grand-green-north-connection-door', target: 'grand-green-north', point: west! },
            { id: 'grand-front-north-connection-door', target: 'grand-front-north', point: east! }
        ].map(portal => ({
            ...portal,
            blockId: 'west-decks',
            level: 'district-north-deck',
            width: source.width,
            angle,
            openingHalfDepth: 2.7,
            evidence: source.evidence
        }))
    };
}
