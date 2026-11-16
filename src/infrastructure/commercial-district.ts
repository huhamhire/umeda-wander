import type {CommercialBuilding,CommercialBuildingId,CommercialConcourse,FloorArea,LevelId,PassageEndpoint,Point2,PublicPassage,VerticalConnection,AtriumVoid} from '../domain/map/model.ts';
import {closestPolygonPoint,rotatePoint,passageOutline} from '../domain/map/geometry.ts';
import {commercialFootprints,grandFrontTowers,yodobashiHotelTower,yodobashiMultimediaPodium,northGateOfficeTower} from './commercial-footprints.ts';
import polygonClipping from 'polygon-clipping';
import {districtFrame,districtPlacements,districtAnchors} from './district-placement.ts';
import {insetPolygon} from '../utils/polygon-inset.ts';
import {hanshinCommercialBuilding} from './hanshin-commercial-building.ts';
import {jpTowerBuilding} from './jp-tower-building.ts';

const cityMap='https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda02-3%28202404%29.pdf';
const access={
  'hanshin-dept':'https://www.hanshin-dept.jp/hshonten/access/',
  'jp-tower':'https://www.jp-re.japanpost.jp/sp/osaka/',
  'hankyu-dept':'https://www.hankyu-dept.co.jp/honten/map/index.html',
  'hankyu-grand':'https://www.hankyu.co.jp/company/news/pdf/ER201209194N1.pdf',
  daimaru:'https://www.daimaru.co.jp/umedamise/access.html',
  lucua:'https://www.lucua.jp/access/',
  'lucua-1100':'https://www.lucua.jp/access/',
  yodobashi:'https://global.yodobashi/stores/yodobashi_shopping_mall/001670/',
  'grand-front-south':'https://www.gfo-ad.jp/access.html',
  'grand-front-north':'https://www.gfo-ad.jp/access.html',
};
const east=districtFrame.bearingDeg*Math.PI/180;
const deptAnchor=commercialFootprints['hankyu-dept'].outline[0]!;
const deptWestEnd=commercialFootprints['hankyu-dept'].outline[1]!;
const deptWestLength=Math.hypot(deptWestEnd.x-deptAnchor.x,deptWestEnd.z-deptAnchor.z);
const deptSouth={x:(deptWestEnd.x-deptAnchor.x)/deptWestLength,z:(deptWestEnd.z-deptAnchor.z)/deptWestLength};
const deptEast={x:deptSouth.z,z:-deptSouth.x};
// Raw OSM geometry is retained separately; fit it to the existing oversized station sketch.
const fit=(id:CommercialBuildingId,p:Point2):Point2=>{
  if(id==='lucua-1100')return {x:p.x,z:p.z-24};
  if(id==='lucua')return {x:p.x+11,z:p.z-25};
  if(id==='daimaru')return {x:-25+(p.x+30.59)*58/50.01,z:p.z+25};
  // Fit the map-sized retail complex to the enlarged JR schematic, keeping its west-side reference.
  if(id==='yodobashi')return {x:22.65+(p.x-22.65)*1.15+3,z:-54.09+(p.z+54.09)*1.15-26.5};
  if(id.startsWith('grand-front-'))return {x:p.x-1,z:p.z-29.6};
  const dx=p.x-deptAnchor.x,dz=p.z-deptAnchor.z;
  const across=(dx*deptEast.x+dz*deptEast.z)*1.2,along=(dx*deptSouth.x+dz*deptSouth.z)*1.15;
  return {x:deptAnchor.x+deptEast.x*across+deptSouth.x*along+30*Math.sin(east),
    z:deptAnchor.z+deptEast.z*across+deptSouth.z*along+30*Math.cos(east)};
};
const descriptions:[CommercialBuildingId,string,CommercialBuilding['floors']][]=[
  ['hankyu-dept','阪急百货 · 梅田本店',[{level:'metro-hall',name:'B1'},{level:'concourse',name:'1F'},{level:'south-deck',name:'2F'}]],
  ['hankyu-grand','阪急 Grand Building',[{level:'metro-hall',name:'B1'},{level:'concourse',name:'1F'},{level:'south-deck',name:'2F'}]],
  ['daimaru','大丸梅田店 / 南门大楼',[{level:'underground-hall',name:'B1'},{level:'concourse',name:'1F',elevationOffset:1.3},{level:'south-deck',name:'2F'}]],
  ['lucua','LUCUA',[{level:'underground-hall',name:'B1'},{level:'concourse',name:'1F'},{level:'platform',name:'2F'}]],
  ['lucua-1100','LUCUA 1100',[{level:'underground-hall',name:'B1'},{level:'concourse',name:'1F'},{level:'platform',name:'2F'}]],
  ['yodobashi','Yodobashi / LINKS UMEDA',[{level:'metro-hall',name:'B1'},{level:'concourse',name:'1F'},{level:'platform',name:'2F'}]],
  ['grand-front-south','Grand Front · 南馆',[{level:'concourse',name:'1F'},{level:'platform',name:'2F'}]],
  ['grand-front-north','Grand Front · 北馆',[{level:'concourse',name:'1F'},{level:'platform',name:'2F'}]],
];
export const commercialBuildings:CommercialBuilding[]=descriptions.map(([id,name,floors])=>{
  const raw=commercialFootprints[id];
  return {id,name,floors,outline:raw.outline.map(p=>fit(id,p)),evidence:{source:'district',pages:[],
    urls:[`https://www.openstreetmap.org/way/${raw.way}`,access[id],cityMap],
    detail:`OSM way ${raw.way} v${raw.version}, simplified outline and explicit display fitting; building envelope includes the host complex, not a surveyed retail lease boundary; no interior plan`}};
});
commercialBuildings.push(hanshinCommercialBuilding);
commercialBuildings.push(jpTowerBuilding);
const building=(id:CommercialBuildingId)=>commercialBuildings.find(b=>b.id===id)!;
// Upper silhouettes follow the supplied oblique photos; heights and setbacks are
// compressed display choices. They do not define additional walkable floors.
building('hankyu-dept').podiumHeight=13;
building('hankyu-dept').volumes=[{name:'阪急百货 · 完整切角主塔楼',height:22,
  // Southern convex lobe shares the podium's outer corners; the long northern
  // retail wing stays low. A narrow setback preserves the roof edge/terrace.
  outline:insetPolygon(building('hankyu-dept').outline.slice(1,9),0.9),
  evidence:{...building('hankyu-dept').evidence,
    detail:'User aerial facade photo: one complete convex chamfered main tower on the southern retail lobe, following the podium outer corners with a narrow roof terrace. Northern retail wing remains low. Neighbouring Grand Building stays separate. Setback and height schematic.'}}];
building('hankyu-grand').podiumHeight=8;
building('hankyu-grand').volumes=[{name:'阪急 Grand Building · 独立南侧塔楼',height:20,
  outline:insetPolygon(building('hankyu-grand').outline,1.4),evidence:{...building('hankyu-grand').evidence,
    detail:'Separate Grand Building host footprint retained; inset upper silhouette inferred from the user reference, not a notch cut into the department store main tower. Compressed height.'}}];
building('daimaru').podiumHeight=10;
const southHotel=polygonClipping.intersection([building('daimaru').outline.map(p=>[p.x,p.z] as [number,number])],
  [[[-24,49],[31,49],[31,63],[-24,63]]]);
building('daimaru').volumes=southHotel.map(p=>({name:'南门大楼 · Hotel Granvia Osaka',height:18,
  outline:p[0]!.slice(0,-1).map(([x,z])=>({x,z})),
  courtyards:[[{x:-15,z:52},{x:-4,z:52},{x:-4,z:59},{x:-15,z:59}],
    [{x:5,z:52},{x:17,z:52},{x:17,z:59},{x:5,z:59}]],
  evidence:{...building('daimaru').evidence,detail:'User aerial photo of South Gate building: long upper hotel block behind lower department podium with two roof courts. Footprint clipped to host OSM outline; heights, court sizes and setbacks are schematic.'}}));
for(const id of ['grand-front-south','grand-front-north'] as const)building(id).podiumHeight=6;
building('lucua').podiumHeight=10.5;
building('lucua-1100').podiumHeight=8;
const officeShape=polygonClipping.intersection([building('lucua-1100').outline.map(p=>[p.x,p.z] as [number,number])],
  [northGateOfficeTower.outline.map(p=>{const q=fit('lucua-1100',p);return [q.x,q.z] as [number,number];})]);
building('lucua-1100').volumes=[{name:'北门大楼 · 办公塔楼',height:20,
  outline:officeShape[0]![0]!.slice(0,-1).map(([x,z])=>({x,z})),
  evidence:{source:'district',pages:[],urls:[`https://www.openstreetmap.org/way/${northGateOfficeTower.way}`,
    'https://osakastationcity.com/about/office/ngb_office.php'],
    detail:'North Gate office tower reference 494976863 v9; upper footprint clipped to the fitted LUCUA 1100 host outline, height compressed. Retail and office floors not modeled individually.'}}];
building('yodobashi').podiumHeight=7;
building('yodobashi').perimeterGallery={level:'platform',innerOutline:insetPolygon(building('yodobashi').outline,2.4)};
const yodobashiInner=building('yodobashi').perimeterGallery!.innerOutline;
const ring=(points:Point2[]):[number,number][]=>points.map(p=>[p.x,p.z]);
const frontPodium=polygonClipping.intersection([ring(yodobashiInner)],[ring(yodobashiMultimediaPodium.outline.map(p=>fit('yodobashi',p)))]);
const rearPodium=polygonClipping.difference([ring(yodobashiInner)],frontPodium);
building('yodobashi').podiumParts=[
  ...frontPodium.map(p=>({name:'Yodobashi · 前侧弧形商业楼',outline:p[0]!.slice(0,-1).map(([x,z])=>({x,z})),height:10.5,
    evidence:{source:'district' as const,pages:[],urls:[`https://www.openstreetmap.org/way/${yodobashiMultimediaPodium.way}`],detail:'Southern existing multimedia building part 175942074 v24, clipped inside the outer 2F gallery; compressed display height, not measured storeys'}})),
  ...rearPodium.map(p=>({name:'LINKS · 后侧酒店基座',outline:p[0]!.slice(0,-1).map(([x,z])=>({x,z})),height:7,
    evidence:{source:'district' as const,pages:[],urls:['https://www.openstreetmap.org/way/776542350'],detail:'Northern LINKS retail base, fitted as the remainder of the combined inner footprint after the southern building; reference part 776542350 v5, not a surveyed lease boundary'}})),
];
const hotelReference=yodobashiHotelTower.outline.map(p=>fit('yodobashi',p));
const hotelA=hotelReference[1]!,hotelB=hotelReference[2]!,hotelSpan=Math.hypot(hotelB.x-hotelA.x,hotelB.z-hotelA.z);
const hotelAxis={x:(hotelB.x-hotelA.x)/hotelSpan,z:(hotelB.z-hotelA.z)/hotelSpan};
const hotelCenter={x:(hotelA.x+hotelB.x)/2,z:(hotelA.z+hotelB.z)/2};
const hotelOutline=hotelReference.map(p=>{
  const along=(p.x-hotelCenter.x)*hotelAxis.x+(p.z-hotelCenter.z)*hotelAxis.z;
  return {x:p.x+hotelAxis.x*(along*0.5+8)-hotelAxis.z*2,z:p.z+hotelAxis.z*(along*0.5+8)+hotelAxis.x*2};
});
building('yodobashi').volumes=[{name:'阪急 RESPIRE 大阪酒店',height:22,
  outline:hotelOutline,
  evidence:{source:'district',pages:[],urls:[`https://www.openstreetmap.org/way/${yodobashiHotelTower.way}`,
    'https://www.hankyu-hotel.com/hotel/respire/osaka/info/','https://www.yodobashi.com/ec/support/news/190603326750/index.html'],
    detail:'OSM hotel building part 776542349 v4 is the shape reference. Main-axis display span broadened 1.5x and centered over the podium per user visual reference; thickness retained. Height and rooftop details schematic, not a measured hotel footprint or indoor layout.'}}];
for(const tower of grandFrontTowers){
  const id=tower.name==='Tower A'?'grand-front-south':'grand-front-north';
  (building(id).volumes??=[]).push({name:tower.name,outline:tower.outline.map(p=>fit(id,p)),height:tower.height,
    evidence:{source:'district',pages:[],urls:[`https://www.openstreetmap.org/way/${tower.way}`,access[id]],
      detail:`OSM building part ${tower.way} v${tower.version}; simplified tower footprint, compressed display height, not a surveyed building elevation`}});
}
const portal=(id:CommercialBuildingId,name:string,near:Point2):PassageEndpoint=>{
  const b=building(id),floor=b.floors.find(f=>f.name===name)!;
  return {...closestPolygonPoint(near,b.outline),level:floor.level,elevationOffset:floor.elevationOffset,buildingId:id};
};
const jr=(level:LevelId,x:number,z:number):PassageEndpoint=>({level,x,z,station:'jr-osaka'});
const metro=(along:number,across:number):PassageEndpoint=>{
  const m=districtPlacements.metro,p=rotatePoint({x:along,z:across},{x:0,z:0},m.angle);
  return {level:'metro-hall',x:p.x+m.origin.x,z:p.z+m.origin.z,station:'metro-umeda'};
};
const publicPoint=(level:LevelId,x:number,z:number):PassageEndpoint=>({level,x,z});
export const commercialPassages:PublicPassage[]=[];
const link=(id:string,name:string,kind:PublicPassage['kind'],points:PassageEndpoint[],width=4)=>{
  const sites=points.flatMap(p=>p.buildingId?[access[p.buildingId]]:[]);
  commercialPassages.push({id,name,kind,points,width,evidence:{source:'district',pages:[],urls:[cityMap,...new Set(sites)],
    detail:'Public approach to exterior portals only; topology based on city/official access maps, bends and heights fitted to schematic station geometry, not verified entrance-by-entrance. No retail interior or navigation edge.'}});
};

for(const [id,x]of [['lucua',30],['lucua-1100',-33]] as const){
  link(`${id}-1f-entry`,`${building(id).name} · 1F 入口`,'entrance',[jr('concourse',x,-41),portal(id,'1F',{x,z:-41})]);
  link(`${id}-2f-deck`,`${building(id).name} · 2F 连廊`,'deck',[jr('platform',x,-43),portal(id,'2F',{x,z:-43})]);
  if(id==='lucua')link(`${id}-b1-entry`,`${building(id).name} · 地下入口`,'underground',[jr('underground-hall',0,-52),portal(id,'B1',{x:0,z:-52})]);
}
// JR-facing south gallery: land before the southeast curved corner, not on the east side wall.
const yodobashiSouthFace=building('yodobashi').outline;
const yodobashiEastDeckPortal:PassageEndpoint={level:'platform',buildingId:'yodobashi',
  x:yodobashiSouthFace[6]!.x*0.18+yodobashiSouthFace[7]!.x*0.82,
  z:yodobashiSouthFace[6]!.z*0.18+yodobashiSouthFace[7]!.z*0.82};
link('yodobashi-east-deck','Yodobashi · 2F 东侧联络桥','deck',[
  {...jr('platform',districtAnchors.jrNorthEastDeck.x,districtAnchors.jrNorthEastDeck.z)},yodobashiEastDeckPortal]);
commercialPassages.at(-1)!.evidence={source:'jr',pages:[3],urls:[access.yodobashi,cityMap],
  detail:'East station bridge joins the JR-facing south gallery before the southeast corner; corrected from the user satellite reference. Boundary segment and landing fraction fitted to the schematic, not a measured portal coordinate.'};
link('yodobashi-west-deck','Yodobashi · 2F 西侧联络桥','deck',[
  jr('platform',-1,-67),publicPoint('platform',-1,-84),portal('yodobashi','2F',{x:12,z:-82})]);
link('yodobashi-metro-b1','M16 北改札外 → Yodobashi B1','underground',[
  metro(67,-18),publicPoint('metro-hall',96,-76),portal('yodobashi','B1',{x:91,z:-89})]);
link('jr-north-metro-b1','JR 北侧地下通路 → M16 北改札外','underground',[
  jr('underground-hall',61,-52),metro(67,-18)],7);
commercialPassages.at(-1)!.evidence={source:'district',pages:[],urls:[cityMap,
  'https://osaka-info.jp/special/universal/tourism/lucua-osaka/',
  'https://subway.osakametro.co.jp/station_guide/M/m16/map.php/1000'],
  detail:'LUCUA north/east B1 corridor joins Metro north-gate public approach and Yodobashi branch; source confirms connection, coordinates fitted; stays outside gates, no cross-operator route edge'};
link('hankyu-dept-metro-b1','M16 闸外 → 阪急百货 B1','underground',[metro(7,23),portal('hankyu-dept','B1',{x:122,z:15})]);
link('daimaru-crost-b1','Crost → 大丸 B1','underground',[jr('underground-hall',0,46),portal('daimaru','B1',{x:0,z:48})]);
// JR PDF 1F pedestrian bridge + city map + user satellite reference:
// the north/south arms skirt the bus loop and share an east-side spine.
const northWest={...publicPoint('south-deck',53,43),station:'jr-osaka' as const};
const deptWestFace=building('hankyu-dept').outline;
const deptWestPortal=(t:number):PassageEndpoint=>({level:'south-deck',buildingId:'hankyu-dept',
  x:deptWestFace[0]!.x*(1-t)+deptWestFace[1]!.x*t,z:deptWestFace[0]!.z*(1-t)+deptWestFace[1]!.z*t});
const northEast=deptWestPortal(0.3);
const southWest=portal('daimaru','2F',{x:30,z:80}),southEast=deptWestPortal(0.92);
const roadDirection={x:Math.cos(districtPlacements.metro.angle),z:Math.sin(districtPlacements.metro.angle)};
const roadOrigin={x:64,z:64};
const streetJunction=(a:Point2,b:Point2):PassageEndpoint=>{
  const dx=b.x-a.x,dz=b.z-a.z,t=((roadOrigin.x-a.x)*roadDirection.z-(roadOrigin.z-a.z)*roadDirection.x)/(dx*roadDirection.z-dz*roadDirection.x);
  return publicPoint('south-deck',a.x+dx*t,a.z+dz*t);
};
const northJunction=streetJunction(northWest,northEast),southJunction=streetJunction(southWest,southEast);
link('umeda-deck-spine','梅田新步道桥 · 东侧主干','deck',[northJunction,southJunction],5);
link('daimaru-deck-north-arm','JR 南口外 · 步道桥北连接臂','deck',[northWest,northJunction],5);
link('daimaru-deck-south-arm','大丸前侧公共通道 · 南连接臂','deck',[southWest,southJunction],5);
link('hankyu-dept-deck-north-arm','步道桥北支线 → 阪急百货 2F','deck',[northJunction,northEast],5);
link('hankyu-dept-deck-south-arm','步道桥南支线 → 阪急百货 2F','deck',[southJunction,southEast],5);
link('hanshin-dept-deck-reserve','步道桥 → 阪神百货 2F','deck',[southJunction,
  {...portal('hanshin-dept','2F',{x:43,z:145}),boundaryName:'往阪神百货 · 2F 连接'}],5);

const deckProof={source:'jr' as const,pages:[5],urls:[cityMap,'https://www.hanshin.co.jp/uploads/guidemap/umeda.pdf'],
  detail:'Pedestrian bridge in JR 1F south/east plan; bus-loop perimeter, north/south branches and Hanshin-facing outlet cross-checked with the user satellite reference. Coordinates and grouping at 2F are schematic, not surveyed deck elevations.'};
for(const p of commercialPassages.filter(p=>p.id.includes('deck-')||p.id==='umeda-deck-spine'))if(p.id.startsWith('daimaru-')||p.id.startsWith('hankyu-dept-')||p.id.startsWith('hanshin-')||p.id==='umeda-deck-spine')p.evidence=deckProof;
export const commercialAreas:FloorArea[]=[{
  id:'umeda-deck-north-landing',level:'south-deck',name:'新步道桥 · 北侧上桥平台',kind:'public',
  outline:passageOutline(northWest,northJunction,5),evidence:deckProof,
},{
  id:'jr-north-atrium-b1',level:'underground-hall',name:'JR 北侧中庭 · B1 公共区域',kind:'public',label:true,
  outline:[{x:-13.5,z:-71},{x:12.5,z:-71},{x:12.5,z:-47},{x:-13.5,z:-47}],
  evidence:{source:'jr',pages:[6],detail:'North Gate B1 public corridor at the atrium side, expanded per user identification; footprint schematic, not a passage beneath JR to south-side Crost'},
}];
const northLength=Math.hypot(northJunction.x-northWest.x,northJunction.z-northWest.z);
const stairTop={x:northWest.x+(northJunction.z-northWest.z)/northLength*2.5,z:northWest.z-(northJunction.x-northWest.x)/northLength*2.5};
export const commercialConnections:VerticalConnection[]=[{
  id:'umeda-deck-north-stairs',kind:'stairs',placement:'exterior',width:2.6,
  from:{id:'umeda-deck-north-ground',level:'concourse',x:stairTop.x,z:stairTop.z-6.5},
  to:{id:'umeda-deck-north-upper',level:'south-deck',...stairTop},
  evidence:deckProof,
}];

const grandSouthEntry=portal('grand-front-south','2F',{x:-2,z:-90});
const grandSouthFace=building('grand-front-south').outline;
const ga=grandSouthFace[0]!,gb=grandSouthFace[1]!,gx=gb.x-ga.x,gz=gb.z-ga.z,gLength=Math.hypot(gx,gz);
const grandSouthNorth:PassageEndpoint={level:'platform',buildingId:'grand-front-south',x:(ga.x+gb.x)/2,z:(ga.z+gb.z)/2};
const acrossRoad={x:gz/gLength,z:-gx/gLength};
const northOutline=building('grand-front-north').outline;
const intersections=northOutline.flatMap((a,i)=>{
  const b=northOutline[(i+1)%northOutline.length]!,ex=b.x-a.x,ez=b.z-a.z;
  const den=acrossRoad.x*ez-acrossRoad.z*ex;if(Math.abs(den)<1e-8)return [];
  const qx=a.x-grandSouthNorth.x,qz=a.z-grandSouthNorth.z;
  const t=(qx*ez-qz*ex)/den,u=(qx*acrossRoad.z-qz*acrossRoad.x)/den;
  return t>0&&u>=0&&u<=1?[t]:[];
});
const crossDistance=Math.min(...intersections);
const grandNorthSouth:PassageEndpoint={level:'platform',buildingId:'grand-front-north',
  x:grandSouthNorth.x+acrossRoad.x*crossDistance,z:grandSouthNorth.z+acrossRoad.z*crossDistance};
link('grand-front-jr-deck','JR 北侧 2F 连廊 → Grand Front 南馆','deck',[
  publicPoint('platform',-1,-84),grandSouthEntry],5);
link('grand-front-north-south-deck','Grand Front · 南北馆 2F 连桥','deck',[grandSouthNorth,grandNorthSouth],5);
// Only the documented through-connection is shown; no shop aisles or indoor routing graph.
commercialAreas.push({id:'grand-front-south-public-axis',level:'platform',name:'Grand Front 南馆 · 往北馆公共通道',
  kind:'public',label:true,outline:passageOutline(grandSouthEntry,grandSouthNorth,5),
  evidence:{source:'district',pages:[],urls:['https://www.gfo-ad.jp/access.html','https://www.gfo-ad.jp/media_case01.html'],
    detail:'Documented JR-to-south-to-north 2F through connection; schematic public axis only, interior bends and retail partitions not modeled'}});

// OSM bridge 1347368421 v1, with the same Z=-24 fit as LUCUA 1100.
// Only the destination landing is represented; its building is intentionally omitted.
const umekitaUpperLanding:PassageEndpoint={level:'platform',x:-77.02,z:-52.5,station:'jr-osaka',boundaryName:'往梅北 · 2F 公共通道'};
link('lucua-1100-umekita-deck','LUCUA 1100—梅北 · 2F 连廊','deck',[
  portal('lucua-1100','2F',{x:-55.8,z:-52.43}),publicPoint('platform',-61.35,-52.43),umekitaUpperLanding],4.5);
const umekitaDeckProof={source:'district' as const,pages:[],urls:[
  'https://www.openstreetmap.org/way/1347368421','https://umekita-greenplace.com/special/'],
  detail:'Official Umekita Green Place page confirms 2F direct connection from LUCUA 1100; user satellite image identifies west-side bridge. OSM v1 supplies bridge axis, short approach and landing fitted to LUCUA schematic. Public 2F destination only, no destination building or paid-platform shortcut.'};
commercialPassages.at(-1)!.evidence=umekitaDeckProof;
commercialPassages.at(-1)!.label=true;
commercialAreas.push({id:'umekita-upper-deck-landing',level:'platform',name:'梅北侧 · 2F 公共落台',kind:'public',
  outline:[{x:-83,z:-57},{x:-73,z:-57},{x:-73,z:-48},{x:-83,z:-48}],evidence:umekitaDeckProof});

const southPlazaProof={source:'jr' as const,pages:[4,5],detail:'South Gate Plaza lateral 1F–2F escalator group, paired with bank 61 per user front-view photo; geometric positions and local 1F rise are schematic, diagram bank number 74 is an internal reference'};
commercialAreas.push({id:'daimaru-south-right-ground-landing',level:'concourse',name:'大丸南侧 · 右侧扶梯地面落台',kind:'public',
  elevationOffset:1.3,outline:[{x:12,z:72},{x:24,z:72},{x:24,z:82},{x:12,z:82}],evidence:southPlazaProof});
commercialConnections.push({id:'south-building-74',kind:'escalator',lanes:2,
  from:{id:'south-74-ground',level:'concourse',x:18,z:77,elevationOffset:1.3},
  to:{id:'south-74-deck',level:'south-deck',x:18,z:69},evidence:southPlazaProof});

const concourseProof={source:'district' as const,pages:[],urls:[
  'https://www.hankyu.co.jp/company/news/pdf/ER201209194N1.pdf',
  'https://website.hankyu-dept.co.jp/honten/about/'],
  detail:'Official 2012 concourse release pp2,5,6 confirms public north–south concourse between the department store and Grand Building and east–west concourse toward JR/HEP. User photo supplies cream arches and glazed entrances. Footprint fit and compressed heights schematic; no retail aisles or navigation edges.'};
const nsNorth=fit('hankyu-dept',{x:110.76,z:12.98}),nsSouth=fit('hankyu-dept',{x:90.56,z:46.34});
const ewWest=fit('hankyu-dept',{x:75.64,z:13.4}),ewEast=fit('hankyu-dept',{x:124,z:16.1});
export const commercialConcourses:CommercialConcourse[]=[
  {id:'hankyu-north-south-concourse',name:'阪急百货 · 1F 南北公共通廊',level:'concourse',axis:[nsNorth,nsSouth],width:8.2,height:6.2,
    outline:passageOutline(nsNorth,nsSouth,8.2),evidence:concourseProof},
  {id:'hankyu-east-west-concourse',name:'1F 东西公共通廊 · JR / HEP 方向',level:'concourse',axis:[ewWest,ewEast],width:7,height:3.3,
    outline:passageOutline(ewWest,ewEast,7),evidence:concourseProof},
];
for(const hall of commercialConcourses)commercialAreas.push({id:hall.id,level:hall.level,name:hall.name,kind:'public',label:true,outline:hall.outline,evidence:hall.evidence});
commercialAreas.push({id:'jr-hankyu-ground-approach',level:'concourse',name:'JR 御堂筋口外—阪急 1F 公共通廊',kind:'public',label:true,
  outline:passageOutline({x:53,z:4},ewWest,6),evidence:concourseProof});
// The tall north–south hall remains open through the 2F cutaway. The east–west
// hall has its documented 2F passage above and must not be turned into a void.
export const commercialAtria:AtriumVoid[]=[{id:'hankyu-concourse-void',name:'阪急南北通廊 · 挑高空间',
  openings:[{level:'south-deck',outline:commercialConcourses[0]!.outline}],evidence:concourseProof}];
