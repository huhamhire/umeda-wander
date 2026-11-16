import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
type Feature={id:string;version:string;tags:Record<string,string>;coordinates:number[][]};
const features=JSON.parse(readFileSync('data/geography/features.json','utf8')) as Feature[];
const origin={lon:135.491,lat:34.708};
const project=([lon,lat]:number[])=>[(lon!-origin.lon)*111320*Math.cos(origin.lat*Math.PI/180),(origin.lat-lat!)*111320];
const width=1007,height=1225;
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const names:Record<string,string>={'1146510724':'JP Tower / KITTE','502411898':'阪神百货','162157689':'阪急 Grand Building','161450829':'大丸 / 南门大楼','588689735':'阪急百货','788888925':'Yodobashi / LINKS','1313244350':'LUCUA 1100','1313244351':'LUCUA','178942581':'Grand Front 南馆','178942508':'Grand Front 北馆'};
const roads:string[]=[],buildings:string[]=[],labels:string[]=[];
let excluded=0,estimated=0;
const geo=[];
for(const f of features){
 const t=f.tags,pts=f.coordinates.map(project),closed=JSON.stringify(f.coordinates[0])===JSON.stringify(f.coordinates.at(-1));
 const below=t.tunnel==='yes'||Number(t.layer??0)<0||Number(t.level??0)<0;
 const elevated=t.bridge==='yes'||Number(t.layer??0)>0||Number(t.level??0)>0;
 if(!t.building&&(below||elevated||t.indoor==='yes'||t.highway==='steps')){excluded++;continue;}
 const points=pts.map(p=>p.map(v=>v.toFixed(2)).join(',')).join(' ');
 const polygon=t.building||t['area:highway']||t.area==='yes';
 if(polygon&&!closed)continue;
 geo.push({type:'Feature',id:`way/${f.id}`,properties:{...t,osmVersion:f.version,source:`https://www.openstreetmap.org/way/${f.id}`},geometry:{type:polygon?'Polygon':'LineString',coordinates:polygon?[pts]:pts}});
 if(t.building){buildings.push(`<polygon points="${points}" fill="${names[f.id]?'#b9cdbf':'#dddccf'}" stroke="#a5aea3" stroke-width="0.6"><title>${escape(t.name??names[f.id]??f.id)}</title></polygon>`);
 if(names[f.id]){const cx=pts.reduce((s,p)=>s+p[0]!,0)/pts.length,cy=pts.reduce((s,p)=>s+p[1]!,0)/pts.length;labels.push(`<text x="${cx}" y="${cy}" class="building">${escape(names[f.id]!)}</text>`);}continue;}
 const foot=['footway','pedestrian','path','cycleway'].includes(t.highway??'');
 const raw=Number(t.width),w=Number.isFinite(raw)&&raw>0?raw:({primary:18,secondary:14,tertiary:10,residential:6,service:4,footway:2,pedestrian:5} as Record<string,number>)[t.highway??'']??4;
 if(!polygon&&!(raw>0))estimated++;
 roads.push(polygon?`<polygon points="${points}" fill="#e8dcb5"/>`:`<polyline points="${points}" fill="none" stroke="${foot?'#e8dcb5':'#bac9d2'}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"><title>${escape(t.name??t.highway??'道路')} · ${raw>0?'OSM width':'宽度估计'}</title></polyline>`);
}
mkdirSync('build/geography',{recursive:true});
writeFileSync('build/geography/ground-plan.geojson',JSON.stringify({type:'FeatureCollection',coordinateSystem:'local metres; x east, y south',origin,features:geo},null,2));
writeFileSync('build/geography/ground-plan.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1810" viewBox="-30 -85 ${width+60} ${height+150}"><style>text{font-family:'Microsoft YaHei',sans-serif;fill:#294c49}.building{font-size:11px;font-weight:600;text-anchor:middle}</style><rect x="-30" y="-85" width="${width+60}" height="${height+150}" fill="#f6f4e9"/><text x="0" y="-52" font-size="24">梅田 · 建筑与道路平面布局</text><text x="0" y="-25" font-size="11">第一阶段校对稿 · 北向上 · 米制投影 · 道路宽度含估计值</text><defs><clipPath id="extent"><rect width="${width}" height="${height}"/></clipPath></defs><g clip-path="url(#extent)">${roads.join('')}${buildings.join('')}${labels.join('')}</g><path d="M970 65V15m-7 10 7-10 7 10" fill="none" stroke="#294c49" stroke-width="2"/><text x="965" y="10">N</text><path d="M10 ${height+16}h100m-100 -4v8m100 -8v8" stroke="#294c49"/><text x="10" y="${height+35}" font-size="11">100 m · 绿色：主要建筑　灰米：其他建筑　蓝灰：道路　浅黄：步行空间</text><a href="https://www.openstreetmap.org/copyright"><text x="10" y="${height+53}" font-size="11">© OpenStreetMap contributors · ODbL 1.0 · 2026-11-16</text></a></svg>`);
writeFileSync('build/geography/report.json',JSON.stringify({features:geo.length,buildings:buildings.length,roads:roads.length,estimatedRoadWidths:estimated,excludedNonGround:excluded,labelled:labels.length},null,2));
console.log({buildings:buildings.length,roads:roads.length,estimated,excluded});
