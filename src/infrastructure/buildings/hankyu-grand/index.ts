import {volume,insetPart,type GeographicBuilding} from '../building-data.ts';
const podium=volume('162157689','裙楼',0,28);export const building:GeographicBuilding={id:'hankyu-grand',name:'阪急 Grand Building',volumes:[podium,insetPart(podium,'独立塔楼',28,125,.05,.95,.05,.95)]};
