import buildingParts from '../../../data/geography/building-parts.json' with {type:'json'};
import {osmRunningLines} from '../geography/runtime-rails.ts';
import {assembleSharedUnderground,sharedUndergroundLevel} from '../../application/shared-underground.ts';
import type {MultiPolygon} from 'polygon-clipping';
import {composeStationMaps} from '../../application/compose-station-maps.ts';
import {createGeographicStations} from './geographic-stations.ts';
import {stationFrontages} from '../public-areas/station-frontages/index.ts';
import {stationPublicInterfaces} from '../../application/station-public-interfaces.ts';
import {bindPublicInterfaces} from '../../application/public-interface-bindings.ts';
import {partitionPublicAreas} from '../../application/public-area-blocks.ts';
import {undergroundBlockDefinitions,undergroundPatches} from '../public-areas/underground-blocks.ts';
import {createNorthPublicAccess,publicGroundLevel} from '../public-areas/north-atrium/access.ts';
import {buildBasementOccupancies} from '../../application/basement-occupancy.ts';
import {basementOccupancies} from '../public-areas/basement-buildings.ts';
import {completeFacilityDirectory} from '../facility-directory.ts';
import plan from '../../../data/geography/runtime-plan.json' with {type:'json'};
const stationMaps=createGeographicStations();
export const publicInterfaces=stationMaps.flatMap(stationPublicInterfaces);
export const publicFrontages=stationFrontages(stationMaps);
export const publicAccess=createNorthPublicAccess(publicInterfaces);
const patchFloors=undergroundPatches.map(p=>({id:p.id,level:'district-underground' as const,name:p.name,kind:'public' as const,
 ...p.region,blockId:p.blockId,evidence:p.evidence,label:false}));
const shared=assembleSharedUnderground(stationMaps,plan.underground as MultiPolygon,[...publicFrontages,...patchFloors,...publicAccess.areas.filter(a=>a.level==='district-underground')]);
export const undergroundBlocks=partitionPublicAreas(shared.areas,undergroundBlockDefinitions);
export const undergroundPublicAreas=undergroundBlocks.flatMap(b=>b.areas);
export const basements=buildBasementOccupancies(basementOccupancies,undergroundPublicAreas,
 shared.stations.flatMap(s=>s.layout.areas.filter(a=>a.kind!=='public'&&s.levels.find(l=>l.id===a.level)?.y===-8)));
const composed=composeStationMaps(shared.stations,{areas:[...undergroundPublicAreas,...basements.areas,...publicAccess.areas.filter(a=>a.level!=='district-underground')],platforms:[],connections:publicAccess.connections});
export const {stations,edges}=composed;
export const nodes=[...composed.nodes,...publicAccess.connections.flatMap(c=>[c.from,c.to])];
export const levels=[...composed.levels,sharedUndergroundLevel,publicGroundLevel];
export const publicInterfaceBindings=bindPublicInterfaces(publicInterfaces.filter(p=>p.elevation===-8),composed.layout.areas,levels);
export const removedPublicAreas=shared.removed;
export const layout={...composed.layout,geographic:true};
export const facilities=completeFacilityDirectory(composed.sourceFacilities,layout.connections,layout.platforms,levels);
export const geographicPlan=plan;
export function geographicOsmData(){return {title:'UMEDA OSM 地面基底',attribution:'© OpenStreetMap contributors',
 licence:'https://opendatacommons.org/licenses/odbl/1-0/',frame:{origin:{lon:135.491,lat:34.708},units:'metres',x:'east',z:'south'},
 ground:plan.ground,widthEstimates:plan.widths,buildingParts,runningLines:osmRunningLines,reconstruction:'原始经纬度按固定原点等距近似投影；道路宽度估计按 scripts/geography/road-width.ts，静态地面几何由 build-runtime.ts 生成。地下建筑占位使用同一 ground 建筑轮廓；与 PDF 通道相减后的混合几何不属于此 OSM 下载。'};}


