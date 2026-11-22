import { messageText } from '../../i18n/index.ts';
import { volume, type GeographicBuilding } from '../building-data.ts';

const floorGuide = 'https://umekita-greenplace.com/#floor';
const openingRelease = 'https://www.westjr.co.jp/press/article/items/250219_00_press_umekitagreenplace.pdf';
const north = volume('1314389104', messageText('buildings.umekitaGreenPlace.north'), 0, 13.5);
const south = volume('1371178367', messageText('buildings.umekitaGreenPlace.south'), 0, 13.5);
// The middle section starts at the modeled 2F deck above the public ground exit.
const middle = volume('1371178366', messageText('buildings.umekitaGreenPlace.middle'), 8, 13.5);
middle.support = 'over-atrium';

for (const part of [north, south, middle]) {
    part.references = [floorGuide, openingRelease];
    part.surface = 'podium';
    part.facade = 'grid';
    part.note = 'Separate OSM building-part outlines for Umekita Green Place (うめきたグリーンプレイス). Heights and the ground-exit clearance are display fits based on the three-storey facility and existing public levels.';
}

// The full OSM envelope spans the deck slot while the wing footprints leave it open below.
const roof = volume('1371178368', messageText('buildings.umekitaGreenPlace.roof'), 13.5, 14.5);
roof.support = 'over-atrium';
roof.surface = 'podium';
roof.facade = 'plain';
roof.references = [floorGuide, openingRelease];
roof.note = 'Continuous schematic cap over the roofed 2F crossing. Roof profile and thickness are fitted for display.';

export const building: GeographicBuilding = {
    id: 'umekita-green-place',
    name: messageText('buildings.umekitaGreenPlace.name'),
    volumes: [north, south, middle, roof]
};
