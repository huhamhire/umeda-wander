import { messageText } from '../../i18n/index.ts';
import { volume, insetPart, type GeographicBuilding } from '../building-data.ts';

const podium = volume('162157689', messageText('buildings.hankyuGrand.volumes.level162157689.name'), 0, 28);
export const building: GeographicBuilding = {
    id: 'hankyu-grand',
    name: messageText('buildings.hankyuGrand.entities.hankyuGrand.name'),
    volumes: [
        podium,
        insetPart(
            podium,
            messageText('buildings.hankyuGrand.entities.hankyuGrand.volumes'),
            28,
            125,
            .05,
            .95,
            .05,
            .95
        )
    ]
};
