import type {PublicPassage} from '../domain/map/model.ts';
import {hanshinStation} from './hanshin-umeda-map.ts';
import {metroStation} from './metro-umeda-map.ts';
import {commercialPassages} from './commercial-district.ts';
import {areas as jrAreas} from './jr-osaka-map.ts';

const center=(area:{outline:{x:number;z:number}[]})=>area.outline.reduce((s,p)=>({x:s.x+p.x/area.outline.length,z:s.z+p.z/area.outline.length}),{x:0,z:0});
const west=center(hanshinStation.layout.areas.find(a=>a.id==='hanshin-umeda-west-public')!);
const jr=center(jrAreas.find(a=>a.id==='crost-public')!);
const metro=center(metroStation.layout.areas.find(a=>a.id==='metro-umeda-south-public')!);
const northPublic=hanshinStation.layout.areas.find(a=>a.id==='hanshin-umeda-west-public')!.outline;
const metroSide={x:(northPublic[0]!.x+northPublic[3]!.x)/2,z:(northPublic[0]!.z+northPublic[3]!.z)/2};
const deck=center(hanshinStation.layout.areas.find(a=>a.id==='hanshin-umeda-south-deck')!);
const previousDeck=commercialPassages.find(p=>p.id==='hanshin-dept-deck-reserve')!.points.at(-1)!;
const proof={source:'hanshin' as const,pages:[1],urls:['https://www.hanshin.co.jp/uploads/guidemap/umeda.pdf'],
  detail:'User 2025-12-24 plan confirms public JR/Metro approaches and South Exit lift to connecting deck; exact corridor edges are schematic. No inter-operator RouteEdges.'};
export const hanshinDistrictPassages:PublicPassage[]=[
  {id:'jr-hanshin-b1-public',name:'JR 南侧地下公区—阪神西口外',kind:'underground',width:5,
    points:[{...jr,level:'underground-hall',station:'jr-osaka'},{...west,level:'hanshin-hall',station:hanshinStation.id}],evidence:proof},
  {id:'metro-hanshin-b1-public',name:'御堂筋线南改札外—阪神 B1 公共通路',kind:'underground',width:5,
    points:[{...metro,level:'metro-hall',station:metroStation.id},{...metroSide,level:'hanshin-hall',station:hanshinStation.id}],evidence:proof},
  {id:'hanshin-south-connecting-deck',name:'阪急阪神连桥—阪神南出口直梯',kind:'deck',width:5,
    points:[{...previousDeck,boundaryName:undefined},{...deck,level:'hanshin-deck',station:hanshinStation.id,boundaryName:'阪神南出口 · 连桥直梯'}],evidence:proof},
];
