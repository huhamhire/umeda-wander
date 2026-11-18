import { messageText } from '../../i18n/index.ts';
import { volume, type GeographicBuilding } from '../building-data.ts';

export const building: GeographicBuilding = {
    id: 'lucua-1100',
    name: messageText('buildings.lucua1100.entities.lucua1100.name'),
    volumes: [
        volume('1313244350', messageText('buildings.lucua1100.volumes.level1313244350.name'), 0, 48),
        volume('494976863', messageText('buildings.lucua1100.volumes.level494976863.name'), 48, 150, 'osm-height')
    ]
};
