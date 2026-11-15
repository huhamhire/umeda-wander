import {stationDraft} from './station-draft.ts';
import {districtPlacements} from './district-placement.ts';

// Local +X heads north; placement is a district sketch, not a surveyed footprint.
const b=stationDraft('hankyu-umeda','阪急大阪梅田站','hankyu',districtPlacements.hankyu.origin,districtPlacements.hankyu.angle,-1,districtPlacements.hankyu.planScale);
const {draft,area,facility,node,edge,connection,platform}=b;
draft.levels=[
  {id:'hankyu-ground',station:draft.id,label:'1F',name:'地面入口与公共通道',y:0,stackIndex:0,description:'阪急地面入口、BIGMAN 方向及公共通路；周边商场仅保留接口。'},
  {id:'hankyu-hall',station:draft.id,label:'2F',name:'中央口与茶屋町口',y:8,stackIndex:2,description:'中央改札与茶屋町口改札分别建模，闸内通过多组楼梯、扶梯及直梯上至站台。'},
  {id:'hankyu-platform',station:draft.id,label:'3F',name:'终端站台与 3F 改札',y:16,stackIndex:3,description:'1–9 番线与梳状终端站台；1–3 京都线、4–6 宝冢线、7–9 神户线。机柜与设施数量为示意。'},
];
area('ground','hankyu-ground','阪急 1F · 公共通道','public',-7,0,132,82);
area('bigman','hankyu-ground','BIGMAN · 入口方向','service',-60,-24,9,13,2.2);
area('central-public','hankyu-hall','2F 中央口 · 闸外','public',-24,0,24,82);
area('central-paid','hankyu-hall','2F 中央口 · 闸内','paid',-3,0,18,76);
area('chaya-paid','hankyu-hall','2F 茶屋町口 · 闸内','paid',43,0,16,76);
area('chaya-public','hankyu-hall','2F 茶屋町口 · 闸外','public',60,0,18,82);
area('jr-interface','hankyu-hall','往 JR 大阪站 / Yodobashi · 接口','public',-26,46,12,12);
area('upper-public','hankyu-platform','3F 改札 · 闸外','public',-64,0,18,82);
area('terminal-head','hankyu-platform','3F 终端横向通道 · 闸内','paid',-49,0,12,76);
facility('gate-3f','hankyu-platform','阪急 · 3F 改札口','gate',-55,0,'3F 终端侧改札。进入后沿横向通道选择番线，线路配色来自参考图。',Math.PI/2);
facility('gate-central','hankyu-hall','阪急 · 2F 中央改札口','gate',-12,0,'2F 中央改札，位于 3F 站台下方；经闸内设施上至各番线。',Math.PI/2);
facility('gate-chaya','hankyu-hall','阪急 · 茶屋町口改札','gate',51,0,'与中央改札分开的另一组 2F 改札；周边店铺与出口以现场为准。',Math.PI/2);
facility('machines-2f','hankyu-hall','阪急 · 中央口售票机','ticket-machine',-33,14,'中央口闸外售票机，数量与间距为示意。',-Math.PI/2);
facility('machines-3f','hankyu-platform','阪急 · 3F 售票机','ticket-machine',-71,13,'3F 改札闸外沿墙机柜。',-Math.PI/2);
facility('entry','hankyu-ground','阪急 · 1F 南侧入口','entrance',-59,0,'地面入口及 BIGMAN 周边的公共通路示意，不表示与 JR 已建立完整可导航换乘。');

// Ten platform strips flank nine tracks. The outermost strip is alighting-only.
for(let i=0;i<10;i++){
  const z=-32.85+i*7.3,track=i+1;
  const line=i<3?'京都线':i<6?'宝冢线':'神户线';
  const p=platform(`platform-${i+1}`,'hankyu-platform',i<9?[track]:[],12,z,110,4,
    {terminal:true,trackSides:[1],lineName:i<9?line:undefined,lineColor:i<3?0x579a67:i<6?0xd3923f:0x5c8fb4,name:i<9?`${track} 番线 · ${line}`:'最外侧降车站台'});
  if(i===9)continue;
  const lower=node(`central-${track}-lower`,'hankyu-hall',-3,z),upper=node(`central-${track}-upper`,'hankyu-platform',7,z);
  connection(`central-bank-${track}`,'escalator',lower,upper,p.id);
  const chayaLow=node(`chaya-${track}-lower`,'hankyu-hall',43,z),chayaHigh=node(`chaya-${track}-upper`,'hankyu-platform',33,z);
  connection(`chaya-bank-${track}`,'stairs',chayaLow,chayaHigh,p.id);
  if(track===1){
    const a=node(`lift-${track}-lower`,'hankyu-hall',-8,z),c=node(`lift-${track}-upper`,'hankyu-platform',-8,z);
    connection(`lift-${track}`,'elevator',a,c,p.id);
  }
}
facility('escalator','hankyu-hall','阪急 · 2F 至 1 番线扶梯','escalator',-3,-32.85,'选取的中央口至站台扶梯；数量和位置为首版示意。');
facility('lift','hankyu-hall','阪急 · 2F–3F 直梯','elevator',-8,-32.85,'参考图中的 2F–3F 直梯，先到站台层再选择各线，不按每条线路虚构一座直梯。');
const lift2a=node('public-lift-1','hankyu-ground',-25,-20),lift2b=node('public-lift-2','hankyu-hall',-25,-20);
connection('public-lift','elevator',lift2a,lift2b);
const e=node('route-entry','hankyu-ground',-59,0),g0=node('public-rise-lower','hankyu-ground',-30,0),g1=node('public-rise-upper','hankyu-hall',-21,0);
connection('public-rise','escalator',g0,g1);edge(e,g0);edge(g0,g1,'escalator');
const directLow=node('direct-low','hankyu-ground',-65,-19),directHigh=node('direct-high','hankyu-platform',-65,-36);
connection('direct-1f-3f','escalator',directLow,directHigh);
const out=node('gate-out','hankyu-hall',-15,0),inside=node('gate-in','hankyu-hall',-8,0);
edge(g1,out);edge(out,inside,'gate');
const lower=draft.nodes.find(n=>n.id==='hankyu-umeda-central-1-lower')!,upper=draft.nodes.find(n=>n.id==='hankyu-umeda-central-1-upper')!;
const aisle=node('route-aisle','hankyu-hall',-11,0),turn=node('route-turn','hankyu-hall',-11,-32.85),dest=node('destination','hankyu-platform',23,-32.85);
edge(inside,aisle);edge(aisle,turn);edge(turn,lower);edge(lower,upper,'escalator');edge(upper,dest);
facility('kyoto-platform','hankyu-platform','阪急 · 京都线 1 番线','entrance',23,-32.85,'京都线站台方向示意。本站采用自己的番线身份，与 JR、Metro 的同号番线互不混用。');
export const hankyuStation=draft;
