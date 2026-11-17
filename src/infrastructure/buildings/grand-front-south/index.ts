import { messageText } from '../../i18n/index.ts';
import { volume, insetPart, type GeographicBuilding } from '../building-data.ts';

const podium = volume('178942581', messageText('buildings.grandFrontSouth.volumes.level178942581.name'), 0, 40, 'osm-height');
export const building: GeographicBuilding = {
    id: 'grand-front-south',
    name: messageText('buildings.grandFrontSouth.entities.grandFrontSouth.name'),
    volumes: [podium, volume('469076711', 'Tower A', 40, 166, 'osm-height')]
};
