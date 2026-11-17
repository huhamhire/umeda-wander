import {volume, type GeographicBuilding} from '../building-data.ts';
import {plateauVolumes} from '../profile-data.ts';

const podium = volume('588689735', '阪急百货裙楼', 0, 60);
podium.facade = 'bands';
export const building: GeographicBuilding = {
  id: 'hankyu-dept',
  name: '阪急百货 / Twin Towers North',
  volumes: [podium, ...plateauVolumes(podium, 'hankyu')],
};
