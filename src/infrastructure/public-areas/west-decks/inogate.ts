import { messageText } from '../../i18n/index.ts';
import config from '../../../../data/geography/elevated/inogate.json' with { type: 'json' };
import type { DeckBlock, DeckPortal } from '../../../domain/map/public-deck.ts';
import type { BuildingOpening, Evidence, WalkwayCanopy } from '../../../domain/map/model.ts';
import { closestPolygonPoint, passageOutline } from '../../../domain/map/geometry.ts';
import { jrGroundPoint } from '../../stations/jr-osaka/geographic.ts';
import { footprint } from '../../buildings/building-data.ts';
import { elevatedLevels } from '../elevated-source.ts';

/** Use the two building footprints to align the mapped thresholds with rendered facade edges. */
export const inogateHosts = config.hosts.map(host => ({ ...host, region: footprint(host.way) }));

export const inogateDeckEvidence: Evidence = {
    source: 'district',
    pages: [1, 4],
    urls: [
        'https://www.westjr.co.jp/press/article/2025/02/page_27332.html',
        'https://www.pref.osaka.lg.jp/documents/120455/inogate.pdf#page=10'
    ],
    detail: config.sources.join('; ') + '; ' + config.note + ' Reference-derived geometry permission pending.',
};
/** Build the 2F Irodori Path (彩の路), outdoor west landing and separate road crossing. */
export function inogateDecks(): {
    blocks: DeckBlock[];
    portals: DeckPortal[];
    buildingOpenings: BuildingOpening[];
    canopy: WalkwayCanopy;
} {
    const level = 'district-north-deck';
    const name = messageText('publicAreas.westDecks.entities.inogateDecks.name');
    const stationDoor = jrGroundPoint({ x: -60, z: -41 });
    const sourceDoor = config.portals.find(p => p.id === 'inogate-jr-public')!.point;
    const portals: DeckPortal[] = config.portals.map(portal => ({
        ...portal,
        point: portal.id === 'inogate-jr-public' ? stationDoor : closestPolygonPoint(
            portal.point, inogateHosts.find(host => host.id === portal.target)!.region.outline
        ),
        blockId: 'inogate-decks',
        level,
        width: config.widthMetres,
        openingHalfDepth: 2.8,
        evidence: inogateDeckEvidence
    }));
    const east = portals.find(portal => portal.id === 'inogate-east-entrance')!;
    const west = portals.find(portal => portal.id === 'inogate-west-bridge')!;
    const south = portals.find(portal => portal.id === 'grand-green-south-bridge')!;
    const frontage = config.paths.find(path => path.id === 'inogate-2f-frontage')!;
    const crossing = config.paths.find(path => path.id === 'inogate-grand-green-bridge')!;
    // The public Irodori Path (彩の路) passes through the Inogate (イノゲート大阪) podium only between its two doors.
    const interior = [east.point, ...frontage.points.slice(2, -2), west.point];
    const landing = crossing.points[0]!;
    const bridgeWidth = crossing.width!;
    const bridgePoints = [landing, south.point];
    const elevation = elevatedLevels.find(item => item.id === level)!.y;
    return {
        blocks: [{
            id: 'inogate-decks',
            name,
            level,
            paths: [
                { ...frontage, points: [sourceDoor, ...interior, landing], width: config.widthMetres, evidence: inogateDeckEvidence },
                { ...crossing, points: bridgePoints, width: bridgeWidth, evidence: inogateDeckEvidence },
                { id: 'inogate-calibrated-jr-frontage', name, points: [sourceDoor, stationDoor], width: config.widthMetres, evidence: inogateDeckEvidence }
            ],
            regions: [],
            evidence: inogateDeckEvidence,
        }],
        portals,
        buildingOpenings: interior.slice(1).map((end, i) => {
            const start = interior[i]!;
            const run = Math.hypot(end.x - start.x, end.z - start.z);
            const x = (end.x - start.x) / run;
            const z = (end.z - start.z) / run;
            return {
                buildingId: 'inogate',
                base: elevation - .1,
                top: elevation + 4.5,
                outline: passageOutline({ x: start.x - x, z: start.z - z }, { x: end.x + x, z: end.z + z }, config.widthMetres + 1),
                evidence: inogateDeckEvidence
            };
        }),
        canopy: {
            id: 'canopy-inogate-grand-green',
            level,
            points: bridgePoints,
            width: bridgeWidth,
            clearHeight: 3.6,
            evidence: inogateDeckEvidence,
        }
    };
}
