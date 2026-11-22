import clipping from 'polygon-clipping';
import { messageText } from '../../i18n/index.ts';
import type { BuildingOpening, StationMap, PlanRegion } from '../../../domain/map/model.ts';
import type { DeckBlock, DeckPortal } from '../../../domain/map/public-deck.ts';
import { joinedPassageOutlines } from '../../../domain/map/geometry.ts';
import { building as daimaru } from '../../buildings/daimaru/index.ts';
import { building as hanshinDept } from '../../buildings/hanshin-dept/index.ts';
import { hankyuUpperConcourseOpenings, hankyuUpperDeckPaths } from '../../buildings/hankyu-dept/upper-concourse.ts';
import { deckEvidence, sourceDeckPaths, deckPath, elevatedLevels } from '../elevated-source.ts';
import { cityLiftMap, southLiftDeckApproach } from '../../stations/hanshin-umeda/south-exit.ts';
import { midosujiSouthLift } from '../metro-interchange/street-exits.ts';
import { hankyuBridgeStairNotch } from './north-arm-stairs.ts';

/**
 * Build the recessed south forecourt and east pedestrian bridge in the entrance frame, avoiding existing interiors.
 */
export function southDecks(stations: StationMap[]): {
    blocks: DeckBlock[];
    portals: DeckPortal[];
    buildingOpenings: BuildingOpening[];
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
    const hanshin = stations.find(s => s.id === 'hanshin-umeda')!;
    const lift = hanshin.layout.connections.find(c => c.id === 'hanshin-umeda-south-lift-ground-deck')!;
    const hanshinPaths = sourceDeckPaths(['hanshin-approach', 'southeast-extension']);
    const paths = [...sourceDeckPaths([
        'south-skywalk',
        'bridge-north',
        'bridge-spine',
        'bridge-south'
    ]), ...hanshinPaths];
    const hankyuBridge = paths.find(path => path.id === 'bridge-north:336421843')!;
    const hankyuPaths = hankyuUpperDeckPaths(hankyuBridge.points.at(-1)!);
    paths.push(
        ...hankyuPaths,
        {
            ...deckPath('midosuji-south-lift-approach', messageText('facilities.locations.midosuji'), [
                midosujiSouthLift.deckJoin,
                midosujiSouthLift.center
            ], 4),
            evidence: midosujiSouthLift.evidence
        },
        {
            ...deckPath('hanshin-lift-21-approach', hanshin.name, southLiftDeckApproach, 4),
            evidence: {
                ...deckEvidence,
                urls: [cityLiftMap, 'https://www.openstreetmap.org/way/597941440'],
                detail: 'OSM spur to lift 21, confirmed by the city deck plan. Width is fitted.'
            }
        },
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
    const deckY = elevatedLevels.find(level => level.id === 'district-south-deck')!.y;
    const podium = hanshinDept.volumes[0]!;
    const host: clipping.Polygon = [podium.outline.map(p => [p.x, p.z])];
    const slots = hanshinPaths.flatMap(path => joinedPassageOutlines(path.points, path.width + 1.1)
        .map(outline => [outline.map(p => [p.x, p.z])] as clipping.Polygon));
    const buildingOpenings = clipping.union(slots[0]!, ...slots.slice(1))
        .filter(region => clipping.intersection(region, host).length)
        .map(([outline]) => ({
            buildingId: hanshinDept.id,
            outline: outline!.map(([x, z]) => ({ x, z })),
            base: deckY - .6,
            top: deckY + 4.5,
            suppressRailings: false,
            evidence: {
                ...deckEvidence,
                urls: [...new Set(hanshinPaths.flatMap(path => path.evidence.urls ?? [])), 'https://www.hanshin-dept.jp/hshonten/floor/floor2f.html'],
                detail: 'Display clearance along the registered Hanshin department store (阪神梅田本店) deck axes. The retail envelope above the passage remains continuous.'
            }
        }));
    return {
        buildingOpenings: [...buildingOpenings, ...hankyuUpperConcourseOpenings(hankyuPaths, deckY)],
        blocks: [{
            id: 'south-decks',
            name: messageText('publicAreas.southDecks.entities.southDecks.name'),
            level: 'district-south-deck',
            paths,
            regions: [],
            voids: [setback, hankyuBridgeStairNotch],
            evidence: deckEvidence
        }],
        portals: [
            portal('jp-tower-east-door', 'jp-tower', { x: 337.7, z: 811 }, -Math.PI / 6),
            portal('daimaru-forecourt', 'station:jr-osaka', p(0, -12), e.angle),
            portal('hankyu-dept-north-door', 'hankyu-dept', { x: 645.5, z: 564.6 }, -Math.PI / 4),
            portal('hankyu-dept-south-door', 'hankyu-dept', { x: 669.3, z: 632.4 }, -Math.PI / 4),
            portal('hanshin-dept-door', 'hanshin-dept', { x: 701.5, z: 750.3 }, Math.PI / 6),
            portal('hanshin-station-lift', 'station:hanshin-umeda', lift.to, lift.doorFacingRad!),
        ]
    };
}
