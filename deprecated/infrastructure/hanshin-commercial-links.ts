import type {PassageEndpoint,PublicPassage} from '../../src/domain/map/model.ts';
import {closestPolygonPoint} from '../../src/domain/map/geometry.ts';
import {hanshinStation} from '../../src/infrastructure/stations/hanshin-umeda/index.ts';
import {hanshinCommercialBuilding as building} from './hanshin-commercial-building.ts';

export const hanshinCommercialPassages:PublicPassage[]=(['B1','1F'] as const).map(name=>{
  const floor=building.floors.find(f=>f.name===name)!;
  const area=hanshinStation.layout.areas.find(a=>a.id===`hanshin-umeda-${name==='B1'?'department-public':'south-ground'}`)!;
  const center=area.outline.reduce((s,p)=>({x:s.x+p.x/area.outline.length,z:s.z+p.z/area.outline.length}),{x:0,z:0});
  const entry:PassageEndpoint={...center,level:area.level,station:hanshinStation.id};
  return {id:`hanshin-department-${name.toLowerCase()}-entry`,name:`阪神站—阪神百货 · ${name}`,kind:name==='B1'?'underground':'entrance',width:5,
    points:[entry,{...closestPolygonPoint(center,building.outline),level:floor.level,buildingId:building.id}],
    evidence:{...building.evidence,detail:building.evidence.detail+'; public approach from the existing station landing to the department-store boundary; no interior route edge'}};
});
