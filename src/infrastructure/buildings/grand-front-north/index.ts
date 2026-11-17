import { messageText } from '../../i18n/index.ts';
import { volume, insetPart, type GeographicBuilding } from '../building-data.ts';

export const building: GeographicBuilding = {
    id: 'grand-front-north',
    name: messageText('buildings.grandFrontNorth.entities.grandFrontNorth.name'),
    volumes: [
        volume('178942508', messageText('buildings.grandFrontNorth.volumes.level178942508.name'), 0, 40),
        volume('469076709', 'Tower B', 40, 174, 'osm-height'),
        volume('469076710', 'Tower C', 40, 154, 'osm-height')
    ]
};
