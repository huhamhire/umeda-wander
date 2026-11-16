import {stationDraft} from '../../station-draft.ts';
import {districtPlacements} from '../../district-placement.ts';

export function createStation(placement:{origin:{x:number;z:number};angle:number;planScale:number|{along:number;across:number}}, geographic=false){
const b=stationDraft('nishi-umeda','四桥线西梅田站 Y11','yotsubashi',placement.origin,placement.angle,1,placement.planScale);
const {draft,area,facility,node,edge,connection,platform}=b;
draft.levels=[
  {id:'y11-platform',station:draft.id,label:'B2',name:'Y11 · 1/2 番线',y:-16,stackIndex:-2,description:'北端尽头的岛式站台，1/2 番线往本町、难波、住之江公园。'},
  {id:'y11-hall',station:draft.id,label:'B1',name:'Y11 · 北 / 中 / 南改札',y:-8,stackIndex:-1,description:'北改札仅出站，中改札仅进站；南改札及公共地下通路分别表达。'},
  {id:'y11-ground',station:draft.id,label:'1F',name:'Y11 · 地面出入口',y:0,stackIndex:0,description:'只保留参考图明确的街面楼梯、电梯和小型落台。'},
];
const p=platform('island','y11-platform',[1,2],0,0,86,7,
  {width:7,name:'Y11 · 1/2 番线岛式站台',lineName:'四桥线',lineColor:0x328bb7,terminal:true,terminalEnd:'end',trackSides:[1,-1],screenDoors:'half-height'});
area('paid-hall','y11-hall','西梅田 · 闸内站厅','paid',-2,geographic?-4:0,90,geographic?14:12);
area('public-hall','y11-hall','西梅田 · B1 公共通路','public',0,geographic?13:16,116,20);
area('north-public','y11-hall','西梅田 · 阪神 / JR 方向公共通路','public',55,7,16,38);
area('south-public','y11-hall','西梅田 · 北新地 / 堂岛方向','public',-60,geographic?-4:12,26,geographic?42:28);
area('north-west-public','y11-hall','西梅田 · 北侧闸外转角','public',55,-20,16,40);
area('west-public','y11-hall','Hilton / Herbis · 外部地下通路','public',-2.5,-28,115,8);
area('south-west-public','y11-hall','西梅田 · 南侧闸外转角','public',-60,-14,12,28);
for(const [key,name,x]of [['north','北改札 · 仅出站',33],['middle','中改札 · 仅进站',6],['south','南改札',-32]] as const){
  facility(`${key}-gate`,'y11-hall',`Y11 · ${name}`,'gate',geographic&&key==='south'?-47:x,geographic?(key==='south'?-4:3):6,'参考图保留改札使用方向；模型通路和设备间距为示意。',geographic&&key==='south'?Math.PI/2:0);
  facility(`${key}-machines`,'y11-hall',`Y11 · ${key==='north'?'北侧':key==='middle'?'中部':'南侧'}售票机`,'ticket-machine',geographic&&key==='south'?-55:x+6,geographic?13:17,'闸外售票机组，数量和机柜间距为示意。',Math.PI);
}
area('office','y11-hall','Y11 · 站务室','service',-23,geographic?-21:21,10,6);
facility('office','y11-hall','Y11 · 站务咨询','information',-23,geographic?-21:21,'图示站长室／咨询区域。');
facility('ticket','y11-hall','Y11 · 售票处','ticket',geographic?-55:-42,geographic?-12:17,'南改札外售票处，位置按图示整理。');
area('opus','y11-hall','Metro Opus · 西梅田店','service',-10,geographic?-23:23,8,3);
for(const [key,x,high,z]of [['north',30,42,1.5],['middle',-6,8,0],['south',-32,-18,1.5]] as const)
  connection(`${key}-stairs`,'stairs',node(`${key}-stairs-low`,'y11-platform',x,z),node(`${key}-stairs-high`,'y11-hall',high,z),p.id);
connection('north-escalator','escalator',node('north-escalator-low','y11-platform',30,-1.5),node('north-escalator-high','y11-hall',42,-1.5),p.id);
connection('south-escalator','escalator',node('south-escalator-low','y11-platform',-32,-1.5),node('south-escalator-high','y11-hall',-18,-1.5),p.id);
connection('platform-lift','elevator',node('platform-lift-low','y11-platform',-40,0),node('platform-lift-high','y11-hall',-40,0),p.id);
const streetLiftZ=geographic?13:20;
area('street-lift-ground','y11-ground','西梅田 · 地面电梯落台','public',30,streetLiftZ,7,7);
connection('street-lift','elevator',node('street-lift-low','y11-hall',30,streetLiftZ),node('street-lift-high','y11-ground',30,streetLiftZ));
area('yoshimoto-raised','y11-hall','吉本大楼 · 短程升降平台落台','public',14,26,12,8);
draft.layout.areas.at(-1)!.elevationOffset=1.2;
const liftLow=node('hydraulic-low','y11-hall',10,24),liftHigh={...node('hydraulic-high','y11-hall',10,24),elevationOffset:1.2};
draft.nodes[draft.nodes.length-1]=liftHigh;
connection('hydraulic-lift','elevator',liftLow,liftHigh);
facility('hydraulic','y11-hall','Y11 · 短程升降平台','elevator',10,24,'参考图标出油压式升降平台，按 B1 局部高差表达；1.2 高差为示意。');
for(const [key,x,z]of [['2',55,19],['6',16,24],['9',-62,-7],['10',-53,-15]] as const){
  area(`exit-${key}-arm`,'y11-hall',`Y11 · ${key} 号口接入`,'public',x,z>0?16:z/2,6,z>0?20:Math.abs(z)+18);
  area(`exit-${key}-ground`,'y11-ground',`西梅田 · ${key} 号出入口`,'public',x+10,z,7,7);
  connection(`exit-${key}-stairs`,'stairs',node(`exit-${key}-low`,'y11-hall',x,z),node(`exit-${key}-high`,'y11-ground',x+10,z));
  facility(`exit-${key}`,'y11-hall',`Y11 · ${key} 号出入口`,'entrance',x,z,'参考图标出的街面楼梯与出入口。');
}
for(const [key,name,x,z]of [
  ['3','吉本大楼 / Hilton Plaza East',42,23],['4-A','Herbis ENT',25,-20],['4-B','Hilton Plaza West',0,-20],
  ['7-A','大阪站前第一大楼',-32,24],['7-B','JR 北新地站',-60,23],['8','堂岛地下街',-68,12],
] as const){
  if(z<0)area(`exit-${key}-public`,'y11-hall',`Y11 · ${name}地下接口`,'public',x,-22,6,12);
  facility(`exit-${key}`,'y11-hall',`Y11 · ${key} / ${name}`,'entrance',x,z,'仅表达构内图明确的地下连接，不推断商业内部路线。');
}
// Gate directions are retained in the local preview, without inter-station edges.
const common=node('paid-route','y11-hall',0,0);
for(const [key,x]of [['north',33],['middle',6],['south',-32]] as const){
  const south=geographic&&key==='south';
  const outside=node(`${key}-route-out`,'y11-hall',south?-50:x,geographic?(south?-4:6):10),inside=node(`${key}-route-in`,'y11-hall',south?-44:x,geographic?(south?-4:0):3);
  if(key==='north')draft.edges.push({from:inside.id,to:outside.id,kind:'gate',cost:7,directed:true});
  else if(key==='middle')draft.edges.push({from:outside.id,to:inside.id,kind:'gate',cost:7,directed:true});
  else edge(outside,inside,'gate');
  edge(inside,common);
}
const entry=node('route-entry','y11-hall',6,geographic?13:17),high=draft.nodes.find(n=>n.id==='nishi-umeda-middle-stairs-high')!,low=draft.nodes.find(n=>n.id==='nishi-umeda-middle-stairs-low')!;
const dest=node('destination','y11-platform',8,0);
edge(entry,draft.nodes.find(n=>n.id==='nishi-umeda-middle-route-out')!);edge(common,high);edge(high,low,'stairs');edge(low,dest);
for(const value of [...draft.facilities,...draft.layout.areas,...draft.layout.platforms,...draft.layout.connections]){
  value.evidence.urls=['https://subway.osakametro.co.jp/station_guide/station/Y11_%E8%A5%BF%E6%A2%85%E7%94%B0_%E6%A7%8B%E5%86%85%E5%9B%B3.pdf'];
  value.evidence.detail+='; user Y11 map p1, equipment spacing and vertical dimensions schematic';
}
return draft;
}
export const nishiStation=createStation(districtPlacements.nishi);
