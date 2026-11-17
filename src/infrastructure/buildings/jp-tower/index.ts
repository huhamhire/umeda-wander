import { messageText } from '../../i18n/index.ts';
import { volume, type GeographicBuilding } from '../building-data.ts';
import { inscribedSlab } from '../profile-data.ts';

const podium = volume('1146510724', messageText('buildings.jpTower.volumes.level1146510724.name'), 0, 32);
const angle = -31.65 * Math.PI / 180;
const office = inscribedSlab(podium, messageText('buildings.jpTower.office.name'), 32, 188, angle, [.27, .94, .15, .88]);
const hotel = inscribedSlab(podium, messageText('buildings.jpTower.hotel.name'), 171, 188, angle, [.25, .95, .12, .85]);
const shoulder = inscribedSlab(podium, messageText('buildings.jpTower.shoulder.name'), 32, 121, angle, [.12, .62, .18, .86]);
for (const part of [office, hotel, shoulder]) {
    part.facade = 'vertical';
    part.references = ['https://www.jp-re.japanpost.jp/properties/jptower-osaka.html'];
    part.note = 'Post-2024 owner exterior reference: continuous full-height core with an attached middle wing and a shallow overlapping hotel crown, about 188 m overall. Parts are estimated inside the OSM host; no detached blocks or old PLATEAU post-office geometry.';
}

export const building: GeographicBuilding = {
    id: 'jp-tower',
    name: messageText('buildings.jpTower.entities.jpTower.name'),
    volumes: [podium, office, hotel, shoulder],
};
