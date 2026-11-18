import { messageText } from '../../i18n/index.ts';
import type { StationMap, PlanRegion } from '../../../domain/map/model.ts';
import type { DeckBlock, DeckPortal } from '../../../domain/map/public-deck.ts';
import { building as daimaru } from '../../buildings/daimaru/index.ts';
import { deckEvidence, sourceDeckPaths, deckPath } from '../elevated-source.ts';

/**
 * Build the recessed south forecourt and east pedestrian bridge in the entrance frame, avoiding existing interiors.
 */
export function southDecks(stations: StationMap[]): {
    blocks: DeckBlock[];
    portals: DeckPortal[];
} {
    const e = daimaru.entrance!;
    const co = Math.cos(e.angle);
    const si = Math.sin(e.angle);
    const p = (u: number, v: number) => ({ x: e.center.x + co * u - si * v, z: e.center.z + si * u + co * v });
    const setback: PlanRegion = {
        outline: [
            ...Array.from(
                { length: 17 },
                (_, i) => {
                    const u = -10 + i * 20 / 16;
                    return p(u, -7 + 5 * (u / 10) ** 2);
                }
            ),
            p(10, 25),
            p(-10, 25)
        ]
    };
    const hanshin = stations.find(s => s.id === 'hanshin-umeda')!.layout.areas.find(a => a.id === 'hanshin-umeda-south-deck')!;
    const hs = hanshin.outline.reduce((v, q) => ({ x: v.x + q.x / 4, z: v.z + q.z / 4 }), { x: 0, z: 0 });
    const paths = sourceDeckPaths([
        'south-skywalk',
        'bridge-north',
        'bridge-spine',
        'bridge-south',
        'hanshin-approach',
        'southeast-extension'
    ]);
    paths.push(
        deckPath(
            'south-frontage-west',
            messageText('publicAreas.southDecks.deckPaths.southFrontageWest.name'),
            [{ x: 454.8, z: 753.5 }, p(-24, -8)],
            8
        ),
        deckPath(
            'south-frontage-east',
            messageText('publicAreas.southDecks.deckPaths.southFrontageEast.name'),
            [p(24, -8), { x: 558.9, z: 692.9 }],
            8
        )
    );
    const portal = (id: string, target: string, point: {
        x: number;
        z: number;
    }, angle: number): DeckPortal => ({
        id,
        blockId: 'south-decks',
        target,
        point,
        angle,
        width: 6,
        level: 'district-south-deck',
        evidence: deckEvidence
    });
    return {
        blocks: [{
            id: 'south-decks',
            name: messageText('publicAreas.southDecks.entities.southDecks.name'),
            level: 'district-south-deck',
            paths,
            regions: [],
            voids: [setback],
            evidence: deckEvidence
        }],
        portals: [
            portal('jp-tower-east-door', 'jp-tower', { x: 337.7, z: 811 }, -Math.PI / 6),
            portal('daimaru-forecourt', 'station:jr-osaka', p(0, -12), e.angle),
            portal('hankyu-dept-north-door', 'hankyu-dept', { x: 645.5, z: 564.6 }, -Math.PI / 4),
            portal('hankyu-dept-south-door', 'hankyu-dept', { x: 669.3, z: 632.4 }, -Math.PI / 4),
            portal('hanshin-dept-door', 'hanshin-dept', { x: 701.5, z: 750.3 }, Math.PI / 6),
            portal('hanshin-station-lift', 'station:hanshin-umeda', hs, -Math.PI / 6),
        ]
    };
}
