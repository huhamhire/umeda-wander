import { messageText } from '../../i18n/index.ts';
import { volume, type GeographicBuilding } from '../building-data.ts';
import { plateauVolumes } from '../profile-data.ts';

const podium = volume('588689735', messageText('buildings.hankyuDept.volumes.level588689735.name'), 0, 60);
podium.facade = 'bands';
export const building: GeographicBuilding = {
    id: 'hankyu-dept',
    name: messageText('buildings.hankyuDept.entities.hankyuDept.name'),
    volumes: [podium, ...plateauVolumes(podium, 'hankyu')],
};
