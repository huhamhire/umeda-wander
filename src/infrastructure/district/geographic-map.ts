import buildingParts from '../../../data/geography/building-parts.json' with {type:'json'};
import {osmRunningLines} from '../geography/runtime-rails.ts';
import {assembleSharedUnderground,sharedUndergroundLevel} from '../../application/shared-underground.ts';
import type {MultiPolygon} from 'polygon-clipping';
import {composeStationMaps} from '../../application/compose-station-maps.ts';
import {createGeographicStations} from './geographic-stations.ts';
import {stationFrontages} from '../public-areas/station-frontages/index.ts';
import {stationPublicInterfaces} from '../../application/station-public-interfaces.ts';
import {bindPublicInterfaces} from '../../application/public-interface-bindings.ts';
import {completeFacilityDirectory} from '../facility-directory.ts';
import plan from '../../../data/geography/runtime-plan.json' with {type:'json'};
const stationMaps=createGeographicStations();
export const publicInterfaces=stationMaps.flatMap(stationPublicInterfaces);
export const publicFrontages=stationFrontages(stationMaps);
const shared=assembleSharedUnderground(stationMaps,plan.underground as MultiPolygon,publicFrontages);
const composed=composeStationMaps(shared.stations,{areas:shared.areas,platforms:[],connections:[]});
export const {stations,nodes,edges}=composed;
export const levels=[...composed.levels,sharedUndergroundLevel];
export const publicInterfaceBindings=bindPublicInterfaces(publicInterfaces.filter(p=>p.elevation===-8),composed.layout.areas,levels);
export const removedPublicAreas=shared.removed;
export const layout={...composed.layout,geographic:true};
export const facilities=completeFacilityDirectory(composed.sourceFacilities,layout.connections,layout.platforms,levels);
export const geographicPlan=plan;
export function geographicOsmData(){return {title:'UMEDA OSM 地面基底',attribution:'© OpenStreetMap contributors',
 licence:'https://opendatacommons.org/licenses/odbl/1-0/',frame:{origin:{lon:135.491,lat:34.708},units:'metres',x:'east',z:'south'},
 ground:plan.ground,widthEstimates:plan.widths,buildingParts,runningLines:osmRunningLines,reconstruction:'原始经纬度按固定原点等距近似投影；道路宽度估计按 scripts/geography/road-width.ts，静态地面几何由 build-runtime.ts 生成。地下 PDF 轮廓不属于此 OSM 下载。'};}


