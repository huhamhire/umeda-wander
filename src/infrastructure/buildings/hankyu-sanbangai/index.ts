import {volume, type GeographicBuilding} from '../building-data.ts';
import {plateauVolumes} from '../profile-data.ts';

const podium = volume('139168082', '阪急三番街南北馆／车站附属基座', 0, 15);
podium.facade = 'bands';
podium.references = ['https://www.h-sanbangai.com/floor/'];
podium.note = 'Sanbangai shares the station complex, not a detached new shopping block. North/south retail wings and the terminal crown are a 2017 LOD2 exterior reference. Store interiors and any future redevelopment are excluded.';
export const building: GeographicBuilding = {
  id: 'hankyu-sanbangai',
  name: '阪急三番街 / 车站附属建筑',
  volumes: [podium, ...plateauVolumes(podium, 'sanbangai')],
};
