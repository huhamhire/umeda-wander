import {stationDraft} from './station-draft.ts';
import {surfaceBearingDeg} from './station-orientation.ts';

const b=stationDraft('metro-umeda','御堂筋线梅田站 M16','metro',{x:91,z:0},-surfaceBearingDeg*Math.PI/180);
const {draft,area,facility,node,edge,connection,platform}=b;
draft.levels=[
  {id:'metro-platform',station:draft.id,label:'站台',name:'M16 · 1/2 番线',y:-16,stackIndex:-2,description:'御堂筋线 1 番线往难波、天王寺、中百舌鸟；2 番线往新大阪、箕面萱野。相对高度为示意。'},
  {id:'metro-intermediate',station:draft.id,label:'中间层',name:'直梯换乘与站内通路',y:-12,stackIndex:-1.5,description:'参考图所示“中階”与站内通路，独立于 JR 的 M2F。标高尚未测绘，不能直接当作 JR B1F/B2F。'},
  {id:'metro-hall',station:draft.id,label:'站厅',name:'北、中北东西、南改札',y:-8,stackIndex:-1,description:'四组改札与闸外公共通路；地下商场、JR 与阪急去向保留接口，尚无跨站完整路线。'},
];
const p=platform('island','metro-platform',[1,2],0,0,122,12,{name:'御堂筋线 · 1/2 番线连接站台',lineName:'御堂筋线 M16',lineColor:0xc6504f,trackSides:[1,-1],screenDoors:'half-height'});
// Shared physical platform, with the E-area connection retained instead of isolated islands.
area('middle','metro-intermediate','M16 · 中间层站内通路','paid',0,0,110,10);
area('north-paid','metro-hall','北改札 · 闸内','paid',51,0,18,27);
area('north-public','metro-hall','北改札 · 闸外 / 阪急三番街方向','public',67,0,14,44);
area('east-paid','metro-hall','中北东改札 · 闸内','paid',7,10,18,12);
area('east-public','metro-hall','中北东 · 阪急 / 地下街方向','public',7,23,24,14);
area('west-paid','metro-hall','中北西改札 · 闸内','paid',7,-10,18,12);
area('west-public','metro-hall','中北西 · JR 方向','public',7,-23,24,14);
area('jr-interface','metro-hall','往 JR 御堂筋口 · 公共通路接口','public',7,-35,12,10);
area('south-paid','metro-hall','南改札 · 闸内','paid',-47,0,18,27);
area('south-public','metro-hall','南改札 · 闸外 / 阪神方向','public',-64,0,16,44);
facility('north-gate','metro-hall','M16 · 北改札','gate',60,0,'北改札闸内外分开。外侧指向阪急三番街、Yodobashi 等区域，接口尚未完成地理校准。',Math.PI/2);
facility('east-gate','metro-hall','M16 · 中北东改札','gate',7,16,'中北东侧改札，与中北西改札分别表达。');
facility('west-gate','metro-hall','M16 · 中北西改札','gate',7,-16,'图中通往 JR 一侧的公共接口；不把 JR 改札内与 Metro 改札内直接相接。');
facility('south-gate','metro-hall','M16 · 南改札','gate',-56,0,'南侧改札及阪神、地下街去向。',Math.PI/2);
facility('north-machines','metro-hall','M16 · 北侧售票机','ticket-machine',71,10,'北侧闸外售票机，机柜数量为示意。',Math.PI/2);
facility('south-machines','metro-hall','M16 · 南侧售票机','ticket-machine',-69,10,'南侧闸外售票机，机柜数量为示意。',-Math.PI/2);
facility('platform-1','metro-platform','M16 · 1 番线 / 难波方向','entrance',-26,3,'1 番线往难波、天王寺、中百舌鸟方向；具体乘车信息以站内显示为准。');
facility('platform-2','metro-platform','M16 · 2 番线 / 新大阪方向','entrance',25,-3,'2 番线往新大阪、箕面萱野方向。资料注明 E 楼梯前与 1 番线站台连接。');
for(const [key,x,z,hallX] of [['A',35,3,50],['C',-8,3,7],['E',-24,3,-39],['F',35,-3,50],['H',-8,-3,7],['J',-24,-3,-39]] as const){
  const sign=Math.sign(hallX-x);
  const low=node(`${key}-platform`,'metro-platform',x,z),middle=node(`${key}-middle`,'metro-intermediate',x+sign*6,z);
  connection(`bank-${key}`,'stairs',low,middle,p.id);
  // North/south flights turn into their hall; centre banks use a transverse landing.
  const high=node(`${key}-hall`,'metro-hall',hallX,z);
  if(key==='C'||key==='H'){
    area(`centre-landing-${key}`,'metro-hall','中北改札 · 闸内落台','paid',7,z,8,8);
  }
  const transfer=node(`${key}-transfer`,'metro-intermediate',x+sign*9,z);
  edge(middle,transfer);
  connection(`rise-${key}`,'escalator',transfer,high);
}
// Platform lifts first reach the intermediate layer, then continue to the halls.
for(const [key,x,z]of [['north',25,0],['south',-18,0]] as const){
  const low=node(`${key}-lift-platform`,'metro-platform',x,z),mid=node(`${key}-lift-middle`,'metro-intermediate',x,z);
  connection(`lift-${key}`,'elevator',low,mid,p.id);
}
area('north-middle-arm','metro-intermediate','北侧直梯换乘通路','paid',39,0,28,7);
const ml=node('hall-lift-middle','metro-intermediate',52,0),mh=node('hall-lift-hall','metro-hall',52,0);
connection('hall-lift','elevator',ml,mh);
facility('lift','metro-intermediate','M16 · 中间层直梯换乘','elevator',52,0,'先到站内中间层，再经通路及相应直梯到改札层；此首版未提供完整无障碍寻路。');
const start=node('route-entry','metro-hall',71,0),out=node('route-gate-out','metro-hall',63,0),inside=node('route-gate-in','metro-hall',57,0);
const hall=draft.nodes.find(n=>n.id==='metro-umeda-A-hall')!,transfer=draft.nodes.find(n=>n.id==='metro-umeda-A-transfer')!,middle=draft.nodes.find(n=>n.id==='metro-umeda-A-middle')!,low=draft.nodes.find(n=>n.id==='metro-umeda-A-platform')!;
const dest=node('destination','metro-platform',16,3);
edge(start,out);edge(out,inside,'gate');edge(inside,hall);edge(hall,transfer,'escalator');edge(middle,low,'stairs');edge(low,dest);
facility('stairs','metro-platform','M16 · A 楼梯至中间层','stairs',35,3,'站台先经短楼梯到中间层，再沿落台与扶梯到站厅；各层不混用 JR 楼层编号。');
facility('escalator','metro-intermediate','M16 · 北侧站厅扶梯','escalator',44,3,'从中间层到北改札站厅的首版连接示意。');
export const metroStation=draft;
