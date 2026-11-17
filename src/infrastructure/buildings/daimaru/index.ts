import { osakaStationSign } from './signage.ts';
import { messageText } from '../../i18n/index.ts';
import { volume, alignedPart, alignedPoint, type GeographicBuilding } from '../building-data.ts';
import { pointInPolygon } from '../../../domain/map/geometry.ts';

const angle = -31.65 * Math.PI / 180;
const podium = volume('161450829', messageText('buildings.daimaru.volumes.level161450829.name'), 0, 42);
const hotel = alignedPart(podium, 'Hotel Granvia Osaka', 42, 110, angle, .025, .975, .025, .63);
// Two roof courts seen in the supplied aerial photo; dimensions remain estimates.
for (const u of [.29, .7]) {
    const ring = [[u - .075, .22], [u + .075, .22], [u + .075, .64], [u - .075, .64]].map(([x, z]) => alignedPoint(hotel.outline, angle, x!, z!));
    if (ring.every(p => pointInPolygon(p, hotel.outline))) {
        hotel.holes.push(ring);
    }
}
hotel.note += ' Two internal roof courts and northern hotel bar from user aerial reference; estimated dimensions.';
export const building: GeographicBuilding = {
    id: 'daimaru',
    name: messageText('buildings.daimaru.entities.daimaru.name'),
    volumes: [podium, hotel],
    signs: [{
        text: osakaStationSign.facade,
        center: alignedPoint(podium.outline, angle, .52, 1),
        y: 20,
        width: 55,
        height: 8,
        angle
    }],
    entrance: {
        center: alignedPoint(podium.outline, angle, .52, 1),
        angle,
        width: 44,
        depth: 16,
        height: 16,
        note: 'User South Gate entrance photo: tall recessed portal, overhanging header, central columns, glazed canopy, flanking escalators. Dimensions approximate.'
    }
};
