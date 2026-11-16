import {volume,insetPart,type GeographicBuilding} from '../building-data.ts';
const podium=volume('502411898','阪神百货裙楼',0,52);export const building:GeographicBuilding={id:'hanshin-dept',name:'阪神百货 / Twin Towers South',volumes:[podium,insetPart(podium,'东侧办公塔楼',52,188.9,.57,.98,.12,.93)]};
