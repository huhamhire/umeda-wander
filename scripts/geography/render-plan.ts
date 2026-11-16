import {roadWidth} from './road-width.ts';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
type Feature={id:string;kind?:'relation';version:string;tags:Record<string,string>;coordinates:number[][];outerRings?:number[][][];holes?:number[][][];polygons?:number[][][][]};
const features=JSON.parse(readFileSync('data/geography/features.json','utf8')) as Feature[];
const origin={lon:135.491,lat:34.708};
const project=([lon,lat]:number[]):[number,number]=>[(lon!-origin.lon)*111320*Math.cos(origin.lat*Math.PI/180),(origin.lat-lat!)*111320];
const [width,height]=project([135.502,34.697]);
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const names:Record<string,string>={'1146510724':'JP Tower / KITTE','502411898':'阪神百货','162157689':'阪急 Grand Building','161450829':'大丸 / 南门大楼','588689735':'阪急百货','788888925':'Yodobashi / LINKS','1313244350':'LUCUA 1100','1313244351':'LUCUA','178942581':'Grand Front 南馆','178942508':'Grand Front 北馆'};
const roads:string[]=[],buildings:string[]=[],labels:string[]=[];
Object.assign(names,{'139168082':'阪急大阪梅田站','6803731':'大阪站前第 3 大楼','17915329':'JR 大阪站','70561756':'大阪站前第 1 大楼','70561758':'大阪站前第 2 大楼','135624700':'大阪站前第 4 大楼','162158150':'Hilton Plaza WEST','162158151':'Hilton Plaza EAST','162158153':'大阪第一生命'});
const labelBoxes:{x:number;y:number;w:number;h:number}[]=[];
function addLabel(text:string,x:number,y:number,size=11){
 const w=Array.from(text).reduce((s,c)=>s+(c.charCodeAt(0)>255?size:size*.58),0);
 for(const dy of [0,14,-14,28,-28]){
  const box={x:x-w/2,y:y+dy-size,w,h:size+3};
  if(box.x<0||box.x+w>width!||box.y<0||box.y+box.h>height!)continue;
  if(labelBoxes.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y))continue;
  labelBoxes.push(box);labels.push(`<text x="${x}" y="${y+dy}" class="building" font-size="${size}">${escape(text)}</text>`);return;
 }
}
const roadLabels=new Map<string,{length:number;x:number;y:number}>();
let excluded=0,estimated=0;
const geo=[]; const widthAudit:unknown[]=[];
for(const f of features){
 const t=f.tags,pts=f.coordinates.map(project),closed=JSON.stringify(f.coordinates[0])===JSON.stringify(f.coordinates.at(-1));
 const below=t.tunnel==='yes'||Number(t.layer??0)<0||Number(t.level??0)<0;
 const elevated=t.bridge==='yes'||Number(t.layer??0)>0||Number(t.level??0)>0;
 if(!t.building&&(below||elevated||t.indoor==='yes'||(t.highway==='steps'||t.highway==='corridor'))){excluded++;continue;}
 const points=pts.map(p=>p.map(v=>v.toFixed(2)).join(',')).join(' ');
 const polygon=t.building||t['area:highway']||t.area==='yes';
 if(polygon&&!closed)continue;
 const rings=[...(f.outerRings??[f.coordinates]),...(f.holes??[])];
 geo.push({type:'Feature',id:`${f.kind??'way'}/${f.id}`,properties:{...t,osmVersion:f.version,source:`https://www.openstreetmap.org/${f.kind??'way'}/${f.id}`},geometry:{type:f.polygons?'MultiPolygon':polygon?'Polygon':'LineString',coordinates:f.polygons??(polygon?rings:f.coordinates)}});
 if(t.building){const path=rings.map(r=>'M'+r.map(project).map(p=>p.join(',')).join('L')+'Z').join('');
 buildings.push(`<path d="${path}" fill-rule="evenodd" fill="${names[f.id]?'#b9cdbf':'#dddccf'}" stroke="#a5aea3" stroke-width="0.6"><title>${escape(t.name??names[f.id]??f.id)}</title></path>`);
 if(names[f.id]){const cx=pts.reduce((s,p)=>s+p[0]!,0)/pts.length,cy=pts.reduce((s,p)=>s+p[1]!,0)/pts.length;addLabel(names[f.id]!,cx,cy);}continue;}
 const foot=['footway','pedestrian','path','cycleway'].includes(t.highway??'');
 const chosen=roadWidth(t),w=chosen.metres;
 if(!polygon)widthAudit.push({id:f.id,name:t.name,highway:t.highway,lanes:t.lanes,...chosen});
 if(!polygon&&chosen.basis!=='osm-width')estimated++;
 if(t.name&&!foot&&!polygon){const mid=pts[Math.floor(pts.length/2)]!;const length=pts.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]!-pts[i]![0]!,p[1]!-pts[i]![1]!),0);if(length>(roadLabels.get(t.name)?.length??0))roadLabels.set(t.name,{length,x:mid[0]!,y:mid[1]!});}
 roads.push(polygon?`<polygon points="${points}" fill="#e8dcb5"/>`:`<polyline points="${points}" fill="none" stroke="${foot?'#e8dcb5':'#aeb8b8'}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"><title>${escape(t.name??t.highway??'道路')} · ${chosen.basis==='osm-width'?'OSM width':'宽度估计'}</title></polyline>`);
}
mkdirSync('build/geography',{recursive:true});
writeFileSync('build/geography/road-width-audit.json',JSON.stringify(widthAudit,null,2));
for(const [name,p] of roadLabels)if(p.length>90)addLabel(name,p.x,p.y,9);
writeFileSync('build/geography/ground-plan.geojson',JSON.stringify({type:'FeatureCollection',features:geo},null,2));
writeFileSync('build/geography/ground-plan.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1810" viewBox="-30 -85 ${width+60} ${height+150}"><style>text{font-family:'Microsoft YaHei',sans-serif;fill:#294c49}.building{font-size:11px;font-weight:600;text-anchor:middle}</style><rect x="-30" y="-85" width="${width+60}" height="${height+150}" fill="#f6f4e9"/><text x="0" y="-52" font-size="24">梅田 · 建筑与道路平面布局</text><text x="0" y="-25" font-size="11">第一阶段校对稿 · 北向上 · 米制投影 · 道路宽度含估计值</text><defs><clipPath id="extent"><rect width="${width}" height="${height}"/></clipPath></defs><g clip-path="url(#extent)">${roads.join('')}${buildings.join('')}${labels.join('')}</g><path d="M970 65V15m-7 10 7-10 7 10" fill="none" stroke="#294c49" stroke-width="2"/><text x="965" y="10">N</text><path d="M10 ${height+16}h100m-100 -4v8m100 -8v8" stroke="#294c49"/><text x="10" y="${height+35}" font-size="11">100 m · 绿色：主要建筑　灰米：其他建筑　蓝灰：道路　浅黄：步行空间</text><a href="https://www.openstreetmap.org/copyright"><text x="10" y="${height+53}" font-size="11">© OpenStreetMap contributors · ODbL 1.0 · 2026-11-16</text></a></svg>`);
writeFileSync('build/geography/report.json',JSON.stringify({features:geo.length,buildings:buildings.length,roads:roads.length,estimatedRoadWidths:estimated,excludedNonGround:excluded,labelled:labels.length},null,2));
console.log({buildings:buildings.length,roads:roads.length,estimated,excluded});
