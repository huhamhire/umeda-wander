import { messageText } from '../../i18n/index.ts';
import { volume, type GeographicBuilding } from '../building-data.ts';
import { jrAxisPoint } from '../../stations/jr-osaka/ground-frame.ts';
import { eastWing } from './north-gate-massing.ts';

const podium = volume('1313244351', messageText('buildings.lucua.volumes.level1313244351.name'), 0, 48);

export const building: GeographicBuilding = {
    id: 'lucua',
    name: messageText('buildings.lucua.entities.lucua.name'),
    volumes: [
        ...eastWing(podium),
        {
            ...podium,
            name: messageText('buildings.lucua.volumes.tracksidePodium.name'),
            outline: [jrAxisPoint(22, -41), jrAxisPoint(121, -40), jrAxisPoint(121, -34.8), jrAxisPoint(22, -34.8)],
            holes: [],
            top: 15.65,
            facade: 'plain',
            note: 'The platform-facing podium (ルクア) ends below the 3F public gallery. The extent is fitted from the reference photo.'
        }
    ]
};
