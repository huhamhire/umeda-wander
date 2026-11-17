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
import {createElevatedBlocks} from '../public-areas/elevated-blocks.ts';
import {createDeckAccess} from '../public-areas/deck-access.ts';
import {elevatedLevels,elevatedWidthEstimates} from '../public-areas/elevated-source.ts';
import {assemblePublicDecks} from '../../application/public-deck-assembly.ts';
import {deckBuildingOpenings,equipmentBuildingOpenings} from '../../application/deck-interface-bindings.ts';
import elevatedWays from '../../../data/geography/elevated/ways.json' with {type:'json'};
import {deckExtensionLabels} from '../../application/deck-extension-labels.ts';
import {buildBuildingOccupancies} from '../../application/building-occupancy.ts';
import {deckBuildingOccupancies} from '../public-areas/deck-buildings.ts';
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
export const elevated=createElevatedBlocks(shared.stations);
export const deckAccess=createDeckAccess();
const assemblyLevels=[...shared.stations.flatMap(s=>s.levels),...elevatedLevels,publicGroundLevel];
// Equipment pads join their block before union; a floor is never drawn twice at a junction.
for(const b of elevated.blocks)b.regions.push(...deckAccess.areas.filter(a=>a.level===b.level&&a.blockId===b.id));
export const elevatedAreas=assemblePublicDecks(elevated.blocks,shared.stations,assemblyLevels);
export const exteriorOpenings=[...deckBuildingOpenings(elevated.portals,assemblyLevels),...equipmentBuildingOpenings(deckAccess.connections,deckAccess.buildingEquipment,assemblyLevels)];
export const deckBuildingAreas=deckBuildingOccupancies.flatMap(group=>{
  const y=assemblyLevels.find(l=>l.id===group.level)!.y;
  const stationAreas=shared.stations.flatMap(s=>s.layout.areas.filter(a=>Math.abs(s.levels.find(l=>l.id===a.level)!.y+(a.elevationOffset??0)-y)<.01));
  return buildBuildingOccupancies(group.definitions,elevatedAreas.filter(a=>a.level===group.level),stationAreas,{level:group.level,prefix:'deck-context'}).areas;
});
const externalConnections=[...publicAccess.connections,...deckAccess.connections];
const composed=composeStationMaps(shared.stations,{areas:[...undergroundPublicAreas,...basements.areas,...publicAccess.areas.filter(a=>a.level!=='district-underground'),
 ...elevatedAreas,...deckBuildingAreas,...deckAccess.areas.filter(a=>a.level==='district-ground')],platforms:[],connections:externalConnections,exteriorOpenings,
 passages:deckExtensionLabels(elevated.blocks,elevatedAreas)});
export const {stations,edges}=composed;
export const nodes=[...composed.nodes,...externalConnections.flatMap(c=>[c.from,c.to])];
export const levels=[...composed.levels,sharedUndergroundLevel,publicGroundLevel,...elevatedLevels];
export const publicInterfaceBindings=bindPublicInterfaces(publicInterfaces.filter(p=>p.elevation===-8),composed.layout.areas,levels);
export const removedPublicAreas=shared.removed;
export const layout={...composed.layout,geographic:true};
export const facilities=completeFacilityDirectory(composed.sourceFacilities,layout.connections,layout.platforms,levels);
export const geographicPlan=plan;
export function geographicOsmData(){return {title:'UMEDA OSM 地面基底',attribution:'© OpenStreetMap contributors',
 licence:'https://opendatacommons.org/licenses/odbl/1-0/',frame:{origin:{lon:135.491,lat:34.708},units:'metres',x:'east',z:'south'},
 ground:plan.ground,widthEstimates:plan.widths,buildingParts,runningLines:osmRunningLines,elevatedAxes:elevatedWays,elevatedWidthEstimates,reconstruction:'原始经纬度按固定原点等距近似投影；道路宽度估计按 scripts/geography/road-width.ts，静态地面几何由 build-runtime.ts 生成。地下建筑占位使用同一 ground 建筑轮廓；与 PDF 通道相减后的混合几何不属于此 OSM 下载。'};}


