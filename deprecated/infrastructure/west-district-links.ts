import type {FloorArea,PassageEndpoint,PublicPassage} from '../../src/domain/map/model.ts';
import {closestPolygonPoint} from '../../src/domain/map/geometry.ts';
import {projectWalkwayReference} from '../../src/infrastructure/district-placement.ts';
import {higashiStation} from '../../src/infrastructure/stations/higashi-umeda/index.ts';
import {commercialBuildings} from './commercial-district.ts';
import {kitashinchiStation} from '../../src/infrastructure/stations/kitashinchi/index.ts';
import {nishiStation} from '../../src/infrastructure/stations/nishi-umeda/index.ts';
import {hanshinStation} from '../../src/infrastructure/stations/hanshin-umeda/index.ts';
import {metroStation} from '../../src/infrastructure/stations/metro-umeda/index.ts';
import {southBlockPlans} from './south-walkway-plan.ts';

const center=(points:{x:number;z:number}[])=>points.reduce((s,p)=>({x:s.x+p.x/points.length,z:s.z+p.z/points.length}),{x:0,z:0});
const stationPoint=(s:typeof nishiStation,id:string):PassageEndpoint=>({...center(s.layout.areas.find(a=>a.id===id)!.outline),level:s.layout.areas.find(a=>a.id===id)!.level,station:s.id});
const nishi=stationPoint(nishiStation,'nishi-umeda-south-public'),west=stationPoint(kitashinchiStation,'kitashinchi-west-public');
const north=stationPoint(kitashinchiStation,'kitashinchi-diamor-public'),east=stationPoint(kitashinchiStation,'kitashinchi-east-public');
const hanshin=stationPoint(hanshinStation,'hanshin-umeda-department-public'),metro=stationPoint(metroStation,'metro-umeda-south-public');
const ref=(x:number,z:number):PassageEndpoint=>({...projectWalkwayReference(x,z),level:'kitashinchi-hall'});
const junction=ref(390,468),cross=ref(389,682),diagonalCross=ref(565,680),eastCross=ref(789,680);
const evidence={source:'district' as const,pages:[1],detail:'references/梅田周边地区通道.pdf (UMEDA CONNECT, 2024-02): simplified public-space outline and shared crop calibration; standalone faces, not buffers of these connectivity skeletons. No inter-operator navigation edges.'};
export const westDistrictPassages:PublicPassage[]=[];
const add=(id:string,name:string,points:PassageEndpoint[],width=5)=>westDistrictPassages.push({id,name,points,width,kind:'underground',evidence});
add('y11-kitashinchi-public','西梅田—北新地 · 地下公共通路',[nishi,ref(121,851),west]);
add('diamor-hanshin-kitashinchi-public','DIAMOR 大阪 · 阪神—北新地公共通路',[hanshin,ref(290,357),junction,cross,ref(383,861),north],6);
add('diamor-metro-public','御堂筋线南口—DIAMOR 地下公共通路',[metro,ref(540,156),ref(502,184),hanshin]);
const curvedBranch=[[142,454],[187,426],[232,399],[264,379],[282,384],[303,402],[335,431],[365,454],[390,468]] as const;
const y11North=stationPoint(nishiStation,'nishi-umeda-north-public');
add('diamor-daiichi-hilton-curve','DIAMOR—第一生命／Hilton East · 地下互通',[
  junction,...curvedBranch.slice(0,-1).reverse().map(([x,z])=>ref(x,z)),y11North],4.5);
export const diamorRoundPlaza:FloorArea={id:'diamor-round-plaza',name:'DIAMOR · 圆形广场',level:'kitashinchi-hall',kind:'public',
  outline:Array.from({length:40},(_,i)=>ref(390+12*Math.cos(i*Math.PI/20),468+12*Math.sin(i*Math.PI/20))),evidence};
add('diamor-east-west-public','DIAMOR 大阪 · 东西公共通路',[cross,diagonalCross,ref(666,679)]);
add('diamor-diagonal-public','DIAMOR · 阪神—北新地东侧公共通路',[junction,ref(506,545),diagonalCross,ref(638,866),east],4.5);
const t20=stationPoint(higashiStation,'higashi-umeda-exit-8-arm'),whity=stationPoint(higashiStation,'higashi-umeda-whity-public');
add('diamor-t20-public','DIAMOR—东梅田 · 地下公共通路',[ref(666,679),diagonalCross,ref(518,527),ref(738,450),t20]);
add('diamor-sonechika-public','DIAMOR—曾根地下道—北新地东口',[ref(738,450),eastCross,ref(853,866),east]);
const retailPortal=(id:'hankyu-dept'|'hankyu-grand',near:{x:number;z:number}):PassageEndpoint=>({
  ...closestPolygonPoint(near,commercialBuildings.find(b=>b.id===id)!.outline),level:'metro-hall',buildingId:id});
// Whity is approached through its northern public hall; no diagonal chord across the retail block.
add('whity-hankyu-dept-public','Whity 梅田—阪急百货 B1',[whity,ref(735,280),ref(726,192),ref(660,141),retailPortal('hankyu-dept',ref(660,80))]);
add('whity-hankyu-grand-public','Whity 梅田—阪急 Grand Building B1',[whity,ref(735,280),ref(725,240),ref(726,192),ref(738,160),ref(800,150),ref(800,-88),retailPortal('hankyu-grand',ref(800,-88))]);

export const southDistrictAreas:FloorArea[]=southBlockPlans.map(([id,name,outline])=>({
  id:`district-${id}-b1`,name:`${name} · B1`,kind:'commercial',level:'kitashinchi-hall',height:0.45,label:true,labelStyle:'floor',
  outline:outline.map(([x,z])=>ref(x,z)),evidence:{...evidence,detail:evidence.detail+'; building infill stays inside the reference street grid, no shop plan'},
}));
const entries:[[number,number],[number,number]][]=[[[389,750],[363,750]],[[389,750],[408,750]],[[657,780],[700,780]],
  [[592,626],[592,608]],[[389,580],[411,580]],[[389,580],[361,580]],[[673,465],[640,445]]];
for(const [i,area]of southDistrictAreas.entries()){
  const [anchor,near]=entries[i]!;
  add(`${area.id}-entry`,`${area.name.replace(' · B1','')} · 地下接入口`,[ref(...anchor),{...closestPolygonPoint(ref(...near),area.outline),level:area.level}],3);
}
