import {stationDraft} from '../../station-draft.ts';
import {districtPlacements} from '../../district-placement.ts';

export function createStation(placement:{origin:{x:number;z:number};angle:number;planScale:number|{along:number;across:number}}, geographic=false){
const b=stationDraft('kitashinchi','JR 北新地站','kitashinchi',placement.origin,placement.angle,1,placement.planScale);
const {draft,area,facility,node,edge,connection,platform}=b;
draft.levels=[
  {id:'kitashinchi-platform',station:draft.id,label:'B2',name:'北新地 · 1/2 番线',y:-24,stackIndex:-2,description:'JR 东西线岛式站台；图示轨道低于四桥线，仍归 B2 探索组，高差为示意。'},
  {id:'kitashinchi-hall',station:draft.id,label:'B1',name:'北新地 · 东 / 西改札',y:-8,stackIndex:-1,description:'东西改札与站外公共通路；北侧接 DIAMOR，西侧接西梅田及堂岛地下街。'},
  {id:'kitashinchi-ground',station:draft.id,label:'1F',name:'北新地 · 地面出入口',y:0,stackIndex:0,description:'仅表达参考图街面楼梯、电梯与小型落台。'},
];
const p=platform('island','kitashinchi-platform',[1,2],0,0,100,7,
  {width:7,name:'北新地 · 1/2 番线岛式站台',lineName:'JR 东西线',lineColor:0xd28faf,trackSides:[1,-1],screenDoors:'half-height'});
area('paid-hall','kitashinchi-hall','北新地 · 闸内站厅','paid',0,0,90,12);
area('west-public','kitashinchi-hall','北新地 · 西梅田方面联络口','public',-57,0,24,52);
area('east-public','kitashinchi-hall','北新地 · 御堂筋方面联络口','public',57,0,24,52);
area('north-public','kitashinchi-hall','北新地 · 北侧公共通路','public',0,-11,114,10);
area('south-public','kitashinchi-hall','北新地 · 地面出入口通路','public',0,20,114,10);
area('diamor-public','kitashinchi-hall','DIAMOR 大阪 · 北新地接入口','public',0,-18,12,24);
area('office','kitashinchi-hall','北新地 · 站务室','service',0,11,14,4);
for(const [key,name,x]of [['west','西',-45],['east','东',45]] as const){
  facility(`${key}-gate`,'kitashinchi-hall',`北新地 · ${name}改札`,'gate',x,0,'参考图 B1 改札；闸内外保持独立。',Math.PI/2);
  facility(`${key}-machines`,'kitashinchi-hall',`北新地 · ${name}口售票机`,'ticket-machine',key==='west'?-58:58,-10,'指定券售票机位置按参考图示意。',key==='west'?Math.PI/2:-Math.PI/2);
}
facility('ticket','kitashinchi-hall','北新地 · 绿色窗口','ticket',-55,12,'参考图“みどりの窓口”及相关受取柜台，具体柜台数量示意。');
facility('office','kitashinchi-hall','北新地 · 站务咨询','information',0,11,'参考图站务室位置。');
for(const [key,low,high]of [['west',-32,-44],['west-inner',0,-12],['east',32,44]] as const){
  const c=connection(`${key}-escalators`,'escalator',node(`${key}-escalators-low`,'kitashinchi-platform',low,0),node(`${key}-escalators-high`,'kitashinchi-hall',high,0),p.id);
  if(key!=='west-inner')c.lanes=2;
}
connection('platform-lift','elevator',node('platform-lift-low','kitashinchi-platform',-15,0),node('platform-lift-high','kitashinchi-hall',-15,0),p.id);
area('street-lift-ground','kitashinchi-ground','北新地 · 地面直梯落台','public',3,-28,7,7);
connection('street-lift','elevator',node('street-lift-low','kitashinchi-hall',3,-28),node('street-lift-high','kitashinchi-ground',3,-28));
for(const [number,x,z,highX,highZ]of [
  ['11-4',-62,15,-62,29],['11-5',-55,15,-55,29],['11-21',15,20,15,34],
  ['11-23',30,20,30,34],['11-41',65,0,79,0],
] as const){
  area(`exit-${number}-ground`,'kitashinchi-ground',`北新地 · ${number} 出入口`,'public',highX,highZ,7,7);
  facility(`exit-${number}`,'kitashinchi-hall',`北新地 · ${number} 出入口`,'entrance',x,z,'参考图的出口去向，坡道及局部路面高差归并到相应公共层。');
  connection(`exit-${number}-stairs`,'stairs',node(`exit-${number}-low`,'kitashinchi-hall',x,z),node(`exit-${number}-high`,'kitashinchi-ground',highX,highZ));
}
const entry=node('route-entry','kitashinchi-hall',-60,0),outside=node('route-west-out','kitashinchi-hall',-48,0),inside=node('route-west-in','kitashinchi-hall',-42,0);
const high=draft.nodes.find(n=>n.id==='kitashinchi-west-escalators-high')!,low=draft.nodes.find(n=>n.id==='kitashinchi-west-escalators-low')!;
const dest=node('destination','kitashinchi-platform',-4,0);
edge(entry,outside);edge(outside,inside,'gate');edge(inside,high);edge(high,low,'escalator');edge(low,dest);
for(const value of [...draft.facilities,...draft.layout.areas,...draft.layout.platforms,...draft.layout.connections]){
  value.evidence.urls=['https://eki.jr-odekake.net/premises?id=0612303'];
  value.evidence.detail+='; user Kitashinchi PDF p1 dated 2026-10-02, approximate dimensions; temporary equipment closure ignored';
}
return draft;
}
export const kitashinchiStation=createStation(districtPlacements.kitashinchi);
