import { messageText } from '../../i18n/index.ts';
import { volume, type GeographicBuilding } from '../building-data.ts';

export const building: GeographicBuilding = {
    id: 'lucua',
    name: messageText('buildings.lucua.entities.lucua.name'),
    volumes: [volume('1313244351', messageText('buildings.lucua.volumes.level1313244351.name'), 0, 48)]
};
