import {volume,insetPart,type GeographicBuilding} from '../building-data.ts';
const podium=volume('161450829','大丸裙楼',0,42);export const building:GeographicBuilding={id:'daimaru',name:'大丸梅田 / 南门大楼',volumes:[podium,insetPart(podium,'Hotel Granvia Osaka',42,110,.04,.96,.02,.55)]};
