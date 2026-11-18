import { messageText } from '../../i18n/index.ts';
import { volume, alignedPart, type GeographicBuilding } from '../building-data.ts';
import { plateauVolumes } from '../profile-data.ts';

const podium = volume('139168082', messageText('buildings.hankyuSanbangai.volumes.level139168082.name'), 0, 15);
podium.facade = 'bands';
podium.references = ['https://www.h-sanbangai.com/floor/'];
podium.note = 'Sanbangai shares the station complex, not a detached new shopping block. North/south retail wings and the terminal crown are a 2017 LOD2 exterior reference. Store interiors and any future redevelopment are excluded.';
const upper = plateauVolumes(podium, 'sanbangai');
for (const part of upper) {
    if (part.top - part.base > 15) {
        part.facade = 'grid';
    }
}
// Keep the station's western retail buildings distinct from the platform roof.
const wings = [[.16, .45], [.5, .85]].map(([from, to], i) => {
    const wing = alignedPart(podium, messageText('buildings.hankyuSanbangai.wing', { number: i + 1 }), 15, 34, -101.9 * Math.PI / 180, from!, to!, .025, .20);
    wing.facade = 'grid';
    wing.surface = 'tower';
    wing.references = ['https://www.h-sanbangai.com/floor/'];
    wing.note = 'Western station-attached retail wings fitted to the OSM host and user overhead reference. Roof breaks and heights are approximate; no new interior floors or routes.';
    return wing;
});
export const building: GeographicBuilding = {
    id: 'hankyu-sanbangai',
    name: messageText('buildings.hankyuSanbangai.entities.hankyuSanbangai.name'),
    volumes: [podium, ...upper, ...wings],
};
