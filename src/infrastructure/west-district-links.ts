import type {FloorArea,PassageEndpoint,PublicPassage} from '../domain/map/model.ts';
import {closestPolygonPoint} from '../domain/map/geometry.ts';
import {projectSouthReference} from './district-placement.ts';
import {higashiStation} from './higashi-umeda-map.ts';
import {commercialBuildings} from './commercial-district.ts';
import {kitashinchiStation} from './kitashinchi-map.ts';
import {nishiStation} from './nishi-umeda-map.ts';
import {hanshinStation} from './hanshin-umeda-map.ts';
import {metroStation} from './metro-umeda-map.ts';

const center=(points:{x:number;z:number}[])=>points.reduce((s,p)=>({x:s.x+p.x/points.length,z:s.z+p.z/points.length}),{x:0,z:0});
const nishi=center(nishiStation.layout.areas.find(a=>a.id==='nishi-umeda-south-public')!.outline);
const west=center(kitashinchiStation.layout.areas.find(a=>a.id==='kitashinchi-west-public')!.outline);
const north=center(kitashinchiStation.layout.areas.find(a=>a.id==='kitashinchi-diamor-public')!.outline);
const hanshin=center(hanshinStation.layout.areas.find(a=>a.id==='hanshin-umeda-department-public')!.outline);
const metro=center(metroStation.layout.areas.find(a=>a.id==='metro-umeda-south-public')!.outline);
const ref=(x:number,z:number):PassageEndpoint=>({...projectSouthReference(x,z),level:'kitashinchi-hall'});
const junction=ref(550,380);
const evidence={source:'district' as const,pages:[1],
  detail:'User references/梅田周边地区通道.pdf (2024-02), Kitashinchi and Y11 diagrams: public underground topology via DIAMOR, Nishi-Umeda and Hanshin. Widths, junction and slopes fitted to the enlarged station map; no commercial interiors or inter-operator RouteEdges.'};
export const westDistrictPassages:PublicPassage[]=[
  {id:'y11-kitashinchi-public',name:'西梅田—北新地 · 地下公共通路',kind:'underground',width:5,
    points:[{...nishi,level:'y11-hall',station:nishiStation.id},{...west,level:'kitashinchi-hall',station:kitashinchiStation.id}],evidence},
  {id:'diamor-hanshin-kitashinchi-public',name:'DIAMOR 大阪 · 阪神—北新地公共通路',kind:'underground',width:6,
    points:[{...hanshin,level:'hanshin-hall',station:hanshinStation.id},junction,
      {...north,level:'kitashinchi-hall',station:kitashinchiStation.id}],evidence},
  {id:'diamor-metro-public',name:'御堂筋线南口—DIAMOR 地下公共通路',kind:'underground',width:5,
    points:[{...metro,level:'metro-hall',station:metroStation.id},{x:42,z:138,level:'hanshin-hall'},
      {...hanshin,level:'hanshin-hall',station:hanshinStation.id}],evidence},
];

// Shared public junctions are geometry, not inter-operator navigation edges.
const cross=ref(550,625),diagonalCross=ref(760,625),eastCross=ref(1030,625),eastTurn=ref(964,363);
westDistrictPassages.find(p=>p.id==='diamor-hanshin-kitashinchi-public')!.points.splice(2,0,cross);
const t20=center(higashiStation.layout.areas.find(a=>a.id==='higashi-umeda-exit-8-arm')!.outline);
const whity=center(higashiStation.layout.areas.find(a=>a.id==='higashi-umeda-whity-public')!.outline);
const whityPoint:PassageEndpoint={...whity,level:'t20-hall',station:higashiStation.id};
const add=(id:string,name:string,points:PassageEndpoint[],width=5)=>westDistrictPassages.push({id,name,points,width,kind:'underground',evidence});
add('diamor-east-west-public','DIAMOR 大阪 · 东西公共通路',[ref(280,625),cross,diagonalCross,eastCross]);
add('diamor-diagonal-public','DIAMOR · 阪神—北新地东侧公共通路',[
  junction,ref(710,490),diagonalCross,ref(845,858),
  {...center(kitashinchiStation.layout.areas.find(a=>a.id==='kitashinchi-east-public')!.outline),level:'kitashinchi-hall',station:kitashinchiStation.id}],4.5);
add('diamor-t20-public','DIAMOR—东梅田 · 地下公共通路',[
  eastCross,ref(1020,365),eastTurn,{...t20,level:'t20-hall',station:higashiStation.id}]);
add('diamor-sonechika-public','DIAMOR—曾根地下道—北新地东口',[
  eastCross,ref(1100,858),{...center(kitashinchiStation.layout.areas.find(a=>a.id==='kitashinchi-east-public')!.outline),level:'kitashinchi-hall',station:kitashinchiStation.id}]);
const retailPortal=(id:'hankyu-dept'|'hankyu-grand',near:{x:number;z:number}):PassageEndpoint=>({
  ...closestPolygonPoint(near,commercialBuildings.find(b=>b.id===id)!.outline),level:'metro-hall',buildingId:id});
add('whity-hankyu-dept-public','Whity 梅田—阪急百货 B1',[
  whityPoint,{x:132,z:113,level:'metro-hall'},retailPortal('hankyu-dept',{x:124,z:100})]);
add('whity-hankyu-grand-public','Whity 梅田—阪急 Grand Building B1',[
  whityPoint,{x:151,z:113,level:'metro-hall'},retailPortal('hankyu-grand',{x:142,z:76})]);

// Only the connected basement regions are shown: no upper massing or shop plan.
// Polygon corners are simplified from the supplied district walking-map blocks,
// then fitted to the deliberately enlarged station layout (not surveyed footprints).
const blocks:[string,string,[number,number][]][]=[
  ['osaka-ekimae-1','大阪站前第 1 大楼',[[230,644],[505,650],[502,825],[218,806]]],
  ['osaka-ekimae-2','大阪站前第 2 大楼',[[557,650],[729,663],[800,838],[551,833]]],
  ['osaka-ekimae-3','大阪站前第 3 大楼',[[790,665],[1007,653],[1080,830],[871,845]]],
  ['osaka-ekimae-4','大阪站前第 4 大楼',[[680,425],[920,371],[972,543],[776,552],[731,464]]],
  ['umeda-dt','梅田 DT Tower',[[557,424],[627,466],[686,548],[557,560]]],
  ['osaka-maru','大阪 MARU 大厦',[[370,403],[476,355],[529,397],[524,562],[368,561]]],
  ['e-ma','E-ma',[[740,280],[905,238],[940,339],[780,379]]],
];
export const southDistrictAreas:FloorArea[]=blocks.map(([id,name,outline])=>({
  id:`district-${id}-b1`,name:`${name} · B1`,kind:'commercial',level:'kitashinchi-hall',height:0.45,label:true,labelStyle:'floor',
  outline:outline.map(([x,z])=>ref(x,z)),evidence:{...evidence,detail:evidence.detail+'; simplified basement building-region placeholder traced from the walking map; display-fitted outline, no surveyed footprint or interior routes'},
}));
const entries=[[390,625,390,644],[650,625,650,650],[920,625,920,653],
  [850,625,850,552],[550,625,600,560],[550,380,529,450],[964,363,860,380]];
for(const [index,a]of southDistrictAreas.entries()){
  const [x,z,dx,dz]=entries[index]!,anchor=ref(x!,z!),door=closestPolygonPoint(ref(dx!,dz!),a.outline);
  add(`${a.id}-entry`,`${a.name.replace(' · B1','')} · 地下接入口`,[anchor,{...door,level:a.level}],3);
}
