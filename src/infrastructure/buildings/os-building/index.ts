import { messageText } from '../../i18n/index.ts';
import { volume, type GeographicBuilding } from '../building-data.ts';

const name = messageText('buildings.osBuilding.name');
const shell = volume('162157817', name, 0, 65);
shell.facade = 'plain';
shell.references = ['https://www.hhp.co.jp/services/lease/office/'];
shell.note = 'OS Building (ＯＳビル) footprint with a fitted display height. The public exits are defined separately.';

export const building: GeographicBuilding = {
    id: 'os-building',
    name,
    volumes: [shell]
};
