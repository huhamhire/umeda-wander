import {volume,insetPart,type GeographicBuilding} from '../building-data.ts';
const podium=volume('1146510724','KITTE 裙楼',0,32);export const building:GeographicBuilding={id:'jp-tower',name:'JP Tower Osaka / KITTE',volumes:[podium,insetPart(podium,'办公及酒店塔楼',32,188,.3,.96,.1,.92)]};
