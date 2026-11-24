import type { Evidence, Point2, WalkwayCanopy } from '../../../domain/map/model.ts';
import type { DeckPath, DeckPortal } from '../../../domain/map/public-deck.ts';
import { closestPolygonPoint } from '../../../domain/map/geometry.ts';
import { grandGreenSouthBuildings } from '../../buildings/grand-green-south/index.ts';
import { messageText } from '../../i18n/index.ts';

const evidence: Evidence = {
    source: 'district',
    pages: [],
    urls: [
        'https://umekita.com/floor/south/?floor=2F',
        'https://umekita.com/assets/S-3F_1.png',
        'https://umekita.com/assets/GGO_ooyane_eventspace.pdf#page=32',
        'https://www.geospatial.jp/ckan/dataset/plateau-27100-osaka-shi-2025'
    ],
    detail: 'South Building Valley (南館バレー) bridges confirmed on the operator plans. Positions follow the separate LOD2 roof objects ' +
        'bldg_48c93b52-5a94-47c0-9b92-76ff79735d4b and bldg_a18409c2-096f-4865-b9c7-24f149057635. ' +
        'The operator guide shows both glazed spans in its rendering and photographs the facade from the plaza. ' +
        'Walking levels, thresholds and glazing details are display fits.'
};

export const southValleyName = messageText('publicAreas.westDecks.entities.southValley.name');

/** Fit the two ends of a source span to the already registered Park and Gate Tower podium faces. */
function span(
    floor: '2f' | '3f', parkEnd: Point2, gateEnd: Point2, width: number, clearHeight: number
): { path: DeckPath; portals: DeckPortal[]; canopy: WalkwayCanopy } {
    const id = 'grand-green-south-valley-' + floor;
    const level = floor === '2f' ? 'district-north-deck' : 'district-south-valley-3f';
    const blockId = floor === '2f' ? 'west-decks' : 'south-valley-3f';
    const targets = ['grand-green-south-park', 'grand-green-south-gate'];
    const [a, b] = [parkEnd, gateEnd].map((point, index) => closestPolygonPoint(
        point,
        grandGreenSouthBuildings.find(building => building.id === targets[index])!.volumes[0]!.outline
    ));
    const angle = Math.atan2(b!.z - a!.z, b!.x - a!.x);
    const dx = Math.cos(angle) * 1.5;
    const dz = Math.sin(angle) * 1.5;
    return {
        path: {
            id,
            name: southValleyName,
            points: [{ x: a!.x - dx, z: a!.z - dz }, a!, b!, { x: b!.x + dx, z: b!.z + dz }],
            width,
            evidence
        },
        portals: [a!, b!].map((point, index) => ({
            id: id + (index ? '-gate' : '-park'),
            blockId, target: targets[index]!, level, point, width, angle, openingHalfDepth: 2.8, evidence
        })),
        canopy: { id: id + '-roof', level, points: [a!, b!], width, clearHeight, sideGlazing: true, evidence }
    };
}

/** Roof edge midpoints in district metres, taken from the two distinct source bridge footprints. */
export const southValleySpans = {
    lower: span('2f', { x: 73.05, z: 606.75 }, { x: 98.55, z: 610.1 }, 5.5, 3.15),
    upper: span('3f', { x: 71.65, z: 612.55 }, { x: 84.1, z: 628.15 }, 4.25, 3.1)
};
