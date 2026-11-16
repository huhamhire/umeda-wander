import {composeStationMaps} from '../../application/compose-station-maps.ts';
import {createGeographicStations} from './geographic-stations.ts';
import {completeFacilityDirectory} from '../facility-directory.ts';
import plan from '../../../data/geography/runtime-plan.json' with {type:'json'};
const composed=composeStationMaps(createGeographicStations(),{areas:[],platforms:[],connections:[]});
export const {stations,levels,nodes,edges}=composed;
export const layout={...composed.layout,geographic:true};
export const facilities=completeFacilityDirectory(composed.sourceFacilities,layout.connections,layout.platforms,levels);
export const geographicPlan=plan;
export function geographicOsmData(){return {title:'UMEDA OSM 地面基底',attribution:'© OpenStreetMap contributors',
 licence:'https://opendatacommons.org/licenses/odbl/1-0/',frame:{origin:{lon:135.491,lat:34.708},units:'metres',x:'east',z:'south'},
 ground:plan.ground,widthEstimates:plan.widths,reconstruction:'原始经纬度按固定原点等距近似投影；道路宽度估计按 scripts/geography/road-width.ts，静态地面几何由 build-runtime.ts 生成。地下 PDF 轮廓不属于此 OSM 下载。'};}


