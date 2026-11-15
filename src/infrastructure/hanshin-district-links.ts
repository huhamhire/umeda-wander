import type {PublicPassage} from '../domain/map/model.ts';
import {hanshinStation} from './hanshin-umeda-map.ts';
import {metroStation} from './metro-umeda-map.ts';
import {commercialPassages} from './commercial-district.ts';
import {areas as jrAreas} from './jr-osaka-map.ts';

const center=(area:{outline:{x:number;z:number}[]})=>area.outline.reduce((s,p)=>({x:s.x+p.x/area.outline.length,z:s.z+p.z/area.outline.length}),{x:0,z:0});
const west=center(hanshinStation.layout.areas.find(a=>a.id==='hanshin-umeda-west-public')!);
const jr=center(jrAreas.find(a=>a.id==='crost-public')!);
const metro=center(metroStation.layout.areas.find(a=>a.id==='metro-umeda-south-public')!);
const north=center(hanshinStation.layout.areas.find(a=>a.id==='hanshin-umeda-north-public')!);
const metroSide=center(hanshinStation.layout.areas.find(a=>a.id==='hanshin-umeda-central-public')!);
const deck=center(hanshinStation.layout.areas.find(a=>a.id==='hanshin-umeda-south-deck')!);
const previousDeck=commercialPassages.find(p=>p.id==='hanshin-dept-deck-reserve')!.points.at(-1)!;
const proof={source:'hanshin' as const,pages:[1],urls:['https://www.hanshin.co.jp/uploads/guidemap/umeda.pdf'],
  detail:'User 2025-12-24 plan confirms public JR/Metro approaches and South Exit lift to connecting deck; exact corridor edges are schematic. No inter-operator RouteEdges.'};
export const hanshinDistrictPassages:PublicPassage[]=[
  {id:'hanshin-east-whity-public',name:'阪神东口主阶梯—Whity／御堂筋线闸外',kind:'underground',width:6,
    points:[{...center(hanshinStation.layout.areas.find(a=>a.id==='hanshin-umeda-east-upper-public')!),level:'hanshin-hall',station:hanshinStation.id},
      {...metro,level:'metro-hall',station:metroStation.id}],evidence:{...proof,detail:proof.detail+'; district walking diagram confirms East Gate main stairs open east toward Whity and Midosuji public approaches'}},
  {id:'jr-hanshin-b1-public',name:'JR 南侧地下公区—阪神西口外',kind:'underground',width:5,
    points:[{...jr,level:'underground-hall',station:'jr-osaka'},{x:west.x,z:north.z,level:'hanshin-hall'},
      {...west,level:'hanshin-hall',station:hanshinStation.id}],evidence:proof},
  {id:'metro-hanshin-b1-public',name:'御堂筋线南改札外—阪神 B1 公共通路',kind:'underground',width:5,
    points:[{...metro,level:'metro-hall',station:metroStation.id},{...metroSide,level:'hanshin-hall',station:hanshinStation.id}],evidence:proof},
  {id:'hanshin-south-connecting-deck',name:'阪急阪神连桥—阪神南出口直梯',kind:'deck',width:5,
    points:[{...previousDeck,boundaryName:undefined},{...deck,level:'hanshin-deck',station:hanshinStation.id,boundaryName:'阪神南出口 · 连桥直梯'}],evidence:proof},
];
