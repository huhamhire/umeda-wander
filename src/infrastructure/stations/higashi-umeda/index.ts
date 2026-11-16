import {stationDraft} from '../../station-draft.ts';
import {districtPlacements,projectWalkwayReference} from '../../district-placement.ts';

const placement=districtPlacements.higashi;
const b=stationDraft('higashi-umeda','谷町线东梅田站 T20','tanimachi',placement.origin,placement.angle,1,placement.planScale);
const {draft,area,facility,node,edge,connection,platform}=b;
const sourceUrl='https://subway.osakametro.co.jp/station_guide/station/T20_%E6%9D%B1%E6%A2%85%E7%94%B0_%E6%A7%8B%E5%86%85%E5%9B%B3.pdf';
draft.levels=[
  {id:'t20-platform',station:draft.id,label:'B2',name:'T20 · 两侧站台',y:-16,stackIndex:-2,description:'1 番线往天满桥、天王寺、八尾南；2 番线往都岛、大日。两座侧式站台分开建模。'},
  {id:'t20-hall',station:draft.id,label:'B1',name:'T20 · 改札与地下公共通路',y:-8,stackIndex:-1,description:'北东、北西、中西、南四组改札；站厅闸外公共通路接 Whity 梅田方向。'},
  {id:'t20-ground',station:draft.id,label:'1F',name:'T20 · 地面出入口',y:0,stackIndex:0,description:'只表达构内图的地面出入口落台，不展开周边大楼内部。'},
];
// +X is geographically north; the tracks lie between two side platforms.
const p1=platform('platform-1','t20-platform',[1],0,6.75,86,6.4,
  {name:'T20 · 1 番线',lineName:'谷町线',lineColor:0x7d499b,trackSides:[-1],screenDoors:'half-height'});
const p2=platform('platform-2','t20-platform',[2],0,-6.75,86,6.4,
  {name:'T20 · 2 番线',lineName:'谷町线',lineColor:0x7d499b,trackSides:[1],screenDoors:'half-height'});
area('public-spine','t20-hall','东梅田 · B1 公共通路','public',0,0,108,7);
area('whity-public','t20-hall','Whity 梅田 · 东梅田接入口','public',55,-10,6,32);
draft.layout.areas.at(-1)!.outline=[[700,265],[744,280],[760,350],[742,357],[724,305],[700,280]].map(([x,z])=>projectWalkwayReference(x!,z!));
for(const [key,name,x,z,width]of [
  ['north-east','北东',35,10,24],['north-west','北西',35,-10,24],
  ['middle-west','中西',2,-10,30],['south','南',-34,10,28],
] as const){
  area(`${key}-paid`,'t20-hall',`T20 · ${name}改札内`,'paid',x,z,width,13);
  facility(`${key}-gate`,'t20-hall',`T20 · ${name}改札`,'gate',x,Math.sign(z)*3.5,`${name}改札边界；闸外接 B1 公共通路。`);
  facility(`${key}-machines`,'t20-hall',`T20 · ${name}售票机`,'ticket-machine',x+5,Math.sign(z)*2,'据参考图售票区域整理，机柜数量和具体间距示意。',z>0?Math.PI:0);
}
area('office','t20-hall','T20 · 站务室','service',-10,14,10,5);
facility('office','t20-hall','T20 · 站务咨询','information',-10,14,'参考图站长室／咨询位置示意。');
for(const [key,p,x,highX,z]of [
  ['north-east',p1,30,42,6.75],['north-west',p2,30,42,-6.75],
  ['middle-west',p2,-14,0,-8.15],['south',p1,-18,-32,5.35],
] as const)connection(`${key}-stairs`,'stairs',node(`${key}-stairs-low`,'t20-platform',x,z),node(`${key}-stairs-high`,'t20-hall',highX,z),p.id);
for(const [key,p,x,highX,z]of [['middle-west',p2,-14,0,-5.35],['south',p1,-18,-32,8.15]] as const)
  connection(`${key}-escalator`,'escalator',node(`${key}-escalator-low`,'t20-platform',x,z),node(`${key}-escalator-high`,'t20-hall',highX,z),p.id);
for(const [key,p,x,z]of [['south',p1,-40,6.75],['middle-west',p2,9,-6.75]] as const)
  connection(`${key}-lift`,'elevator',node(`${key}-lift-low`,'t20-platform',x,z),node(`${key}-lift-high`,'t20-hall',x,z),p.id);

// Exit numbers follow the supplied map (there is no displayed exit 5). Temporary
// construction closures are intentionally outside this static schematic's scope.
for(const [number,x,side]of [[1,55,-1],[2,49,1],[3,20,-1],[4,19,1],[6,8,1],[7,-6,1],[8,-28,-1],[9,-46,-1]] as const){
  area(`exit-${number}-arm`,'t20-hall',`T20 · ${number} 号口地下接入`,'public',x,side*12,4,18);
  area(`exit-${number}-ground`,'t20-ground',`东梅田 · ${number} 号出入口`,'public',x+10,side*20,7,8);
  facility(`exit-${number}`,'t20-hall',`T20 · ${number} 号出入口`,'entrance',x,side*18,'出口位置依据构内图；楼外走线与标高为示意，暂不应用临时施工关闭。');
  connection(`exit-${number}-stairs`,'stairs',node(`exit-${number}-low`,'t20-hall',x,side*20),node(`exit-${number}-high`,'t20-ground',x+10,side*20));
}
area('street-lift-pad','t20-hall','T20 · 外部电梯接入','public',13,23,14,14);
area('street-lift-ground','t20-ground','东梅田 · 地面电梯落台','public',14,26,7,7);
connection('street-lift','elevator',node('street-lift-low','t20-hall',14,26),node('street-lift-high','t20-ground',14,26));
facility('ticket','t20-hall','T20 · 售票处','ticket',-20,2,'参考图售票处位置，外部商业细节不展开。');
for(const [key,x,z]of [['north',43,-2],['middle',20,-2],['east',19,17]] as const)
  area(`shop-${key}`,'t20-hall','T20 · 通路侧店铺','service',x,z,4,2.5);

// One local preview: enter the south gate and descend to platform 1. There is no
// paid cross-platform shortcut or inter-operator route edge.
const entry=node('route-entry','t20-hall',-34,0),out=node('route-gate-out','t20-hall',-34,2),inside=node('route-gate-in','t20-hall',-34,7);
const high=draft.nodes.find(n=>n.id==='higashi-umeda-south-escalator-high')!,low=draft.nodes.find(n=>n.id==='higashi-umeda-south-escalator-low')!;
const destination=node('destination','t20-platform',-10,6.75);
edge(entry,out);edge(out,inside,'gate');edge(inside,high);edge(high,low,'escalator');edge(low,destination);
for(const value of [...draft.facilities,...draft.layout.areas,...draft.layout.platforms,...draft.layout.connections]){
  value.evidence.urls=[sourceUrl];
  value.evidence.detail+='; user T20 PDF p1, schematic dimensions and equipment positions; construction closures ignored';
}
export const higashiStation=draft;
