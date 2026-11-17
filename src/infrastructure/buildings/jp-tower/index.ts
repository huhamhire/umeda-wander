import {volume, type GeographicBuilding} from '../building-data.ts';
import {inscribedSlab} from '../profile-data.ts';

const podium = volume('1146510724', 'KITTE 商业及剧场裙楼', 0, 32);
const angle = -31.65 * Math.PI / 180;
const office = inscribedSlab(podium, '连续办公及酒店主体', 32, 188, angle, [.27, .94, .15, .88]);
const hotel = inscribedSlab(podium, '上部酒店冠部', 171, 188, angle, [.25, .95, .12, .85]);
const shoulder = inscribedSlab(podium, '相接的中层侧翼', 32, 121, angle, [.12, .62, .18, .86]);
for (const part of [office, hotel, shoulder]) {
  part.facade = 'vertical';
  part.references = ['https://www.jp-re.japanpost.jp/properties/jptower-osaka.html'];
  part.note = 'Post-2024 owner exterior reference: continuous full-height core with an attached middle wing and a shallow overlapping hotel crown, about 188 m overall. Parts are estimated inside the OSM host; no detached blocks or old PLATEAU post-office geometry.';
}
export const building: GeographicBuilding = {
  id: 'jp-tower',
  name: 'JP Tower Osaka / KITTE',
  volumes: [podium, office, hotel, shoulder],
};
