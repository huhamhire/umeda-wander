import type {FloorArea,PassageEndpoint,PublicPassage,VerticalConnection} from '../../src/domain/map/model.ts';
import {closestPolygonPoint} from '../../src/domain/map/geometry.ts';
import {jpTowerBuilding as building,jpTowerEvidence as evidence} from './jp-tower-building.ts';
import {commercialBuildings} from './commercial-district.ts';
import {nishiStation} from '../../src/infrastructure/stations/nishi-umeda/index.ts';
import {areas as jrAreas} from '../../src/infrastructure/stations/jr-osaka/layout.ts';

const garden=(level:PassageEndpoint['level'],x=-55,z=81):PassageEndpoint=>({level,x,z});
const door=(name:string,near:{x:number;z:number}):PassageEndpoint=>({
  ...closestPolygonPoint(near,building.outline),level:building.floors.find(f=>f.name===name)!.level,buildingId:building.id});
const center=(a:FloorArea)=>a.outline.reduce((s,p)=>({x:s.x+p.x/a.outline.length,z:s.z+p.z/a.outline.length}),{x:0,z:0});
const southGate=commercialBuildings.find(b=>b.id==='daimaru')!;
const west=center(jrAreas.find(a=>a.id==='west-south-link')!);
const y11=center(nishiStation.layout.areas.find(a=>a.id==='nishi-umeda-north-west-public')!);
export const jpTowerAreas:FloorArea[]=(['underground-hall','concourse','south-deck'] as const).map(level=>({
  id:`jp-sunken-garden-${level}`,name:'JP Tower · 下沉广场公共落台',level,kind:'public',
  outline:[{x:-63,z:72},{x:-49,z:72},{x:-49,z:89},{x:-63,z:89}],evidence,
}));
export const jpTowerPassages:PublicPassage[]=[
  {id:'jp-south-gate-deck',name:'南门大楼—JP Tower · 2F 连廊',kind:'deck',width:5,
    points:[{...closestPolygonPoint({x:-27,z:71},southGate.outline),level:'south-deck',buildingId:southGate.id},garden('south-deck'),door('2F',{x:-57,z:80})],evidence},
  {id:'jp-west-gate-ground',name:'大阪站西口—JP Tower · 1F 公共通道',kind:'entrance',width:5,
    points:[{...west,level:'concourse',station:'jr-osaka'},door('1F',{x:-80,z:51})],evidence},
  {id:'jp-garden-ground-entry',name:'JP Tower · 下沉广场地面入口',kind:'entrance',width:4,
    points:[garden('concourse'),door('1F',{x:-57,z:80})],evidence},
  {id:'jp-garden-basement-entry',name:'JP Tower · B1 公共入口',kind:'underground',width:5,
    points:[garden('underground-hall'),door('B1',{x:-57,z:80})],evidence},
  {id:'jp-garden-avenue-public',name:'Garden Avenue · JP Tower—西梅田地下公共通路',kind:'underground',width:5,
    points:[garden('underground-hall',-59,81),garden('underground-hall',-59,93),garden('underground-hall',-118,93),{...y11,level:'y11-hall',station:nishiStation.id}],evidence},
];
export const jpTowerConnections:VerticalConnection[]=[
  {id:'jp-garden-b1-ground-stairs',kind:'stairs',width:3.2,stairLandingLength:1.5,
    from:{id:'jp-stairs-b1',...garden('underground-hall',-53,87)},to:{id:'jp-stairs-ground',...garden('concourse',-53,74)},evidence},
  {id:'jp-garden-ground-deck-stairs',kind:'stairs',width:3.2,
    from:{id:'jp-stairs-ground-2',...garden('concourse',-59,86)},to:{id:'jp-stairs-deck',...garden('south-deck',-59,76)},evidence},
  ...(['underground-hall','concourse'] as const).map((level,i):VerticalConnection=>({
    id:`jp-garden-lift-${i}`,kind:'elevator',doorFacingRad:0,
    from:{id:`jp-lift-${i}-from`,...garden(level,-51,80)},to:{id:`jp-lift-${i}-to`,...garden(i===0?'concourse':'south-deck',-51,80)},evidence,
  })),
];
