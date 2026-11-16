import {volume,insetPart,type GeographicBuilding} from '../building-data.ts';
const podium=volume('588689735','阪急百货裙楼',0,60);export const building:GeographicBuilding={id:'hankyu-dept',name:'阪急百货 / Twin Towers North',volumes:[podium,insetPart(podium,'南侧完整主塔楼',60,187,.03,.97,.45,.98)]};
