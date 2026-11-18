import { messageText } from '../../i18n/index.ts';
import { volume, alignedPart, type GeographicBuilding } from '../building-data.ts';
import { softenPodium } from '../profile-data.ts';

const podium = volume('174789734', messageText('buildings.hepNavio.name'), 0, 39);
podium.outline = softenPodium(podium.outline, 5);
podium.facade = 'bands';
podium.surface = 'podium';
const cinema = alignedPart(podium, messageText('buildings.hepNavio.cinema'), 39, 47, -.55, .15, .8, .1, .6);
cinema.facade = 'plain';
export const building: GeographicBuilding = {
    id: 'hep-navio',
    name: messageText('buildings.hepNavio.name'),
    volumes: [podium, cinema]
};
