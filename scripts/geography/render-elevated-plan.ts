import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';

type Point=[number,number];
type Link={id:string;name:string;ways:number[];source:string;displayLevel:string;widthMetres:number;geometryEvidence:string;levelEvidence:string;status?:string};
type Feature={id:string;tags:Record<string,string>;coordinates:Point[]};
const features=JSON.parse(readFileSync('data/geography/features.json','utf8')) as Feature[];
const project=([lon,lat]:Point):Point=>[(lon-135.491)*111320*Math.cos(34.708*Math.PI/180),(34.708-lat)*111320];
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const colors={north:'#398c83',south:'#b57b39',west:'#7189b0'};
const paths:string[]=[],labels:string[]=[],legend:string[]=[],geo:unknown[]=[],pending:Link[]=[];
const labelPositions:Point[]=[];
let count=0;
for(const region of ['north','south','west'] as const){
 const config=JSON.parse(readFileSync(`data/geography/elevated/${region}.json`,'utf8')) as {links:Link[]};
 for(const link of config.links){
  if(!link.ways.length){pending.push(link);continue;}
  count++;
  const lines:Point[][]=[];
  for(const id of link.ways){
   const f=features.find(f=>f.id===String(id));
   if(!f||f.tags.highway!=='footway')throw new Error(`Invalid walking way ${id}`);
   const points=f.coordinates.map(project);lines.push(points);
   paths.push(`<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${colors[region]}" stroke-width="${link.widthMetres}" stroke-linejoin="round" stroke-linecap="butt"><title>${escape(link.name)}</title></polyline>`);
   geo.push({type:'Feature',geometry:{type:'LineString',coordinates:f.coordinates},properties:{...link,region,osmWay:id,osmLevel:f.tags.level??null,sourceUrl:`https://www.openstreetmap.org/way/${id}`,widthBasis:'illustrative',note:'OSM level retained verbatim; display 2F follows reference interpretation, not numeric conversion.'}});
  }
  const line=lines[Math.floor(lines.length/2)]!,p=line[Math.floor(line.length/2)]!;
  let label:Point=[...p];
  for(const [dx,dy] of [[0,0],[16,0],[-16,0],[0,18],[0,-18]] as Point[]){
   const candidate:Point=[p[0]+dx,p[1]+dy];
   if(labelPositions.every(q=>Math.hypot(q[0]-candidate[0],q[1]-candidate[1])>18)){label=candidate;break;}
  }
  labelPositions.push(label);
  labels.push(`<circle cx="${label[0]}" cy="${label[1]}" r="8" fill="white" stroke="${colors[region]}"/><text x="${label[0]}" y="${label[1]+3}" text-anchor="middle" font-size="9">${count}</text>`);
  legend.push(`<text x="${count%2?190:480}" y="${920+Math.floor((count-1)/2)*19}" font-size="11">${count}. ${escape(link.name)}</text>`);
 }
}
const ground=readFileSync('build/geography/ground-plan.svg','utf8');
const body=ground.match(/<g clip-path="url\(#extent\)">([\s\S]*?)<\/g>/)?.[1];
if(!body)throw new Error('Generate ground-plan.svg first');
// The south forecourt is an illustrative landing with a curved setback, not a surveyed footprint.
const forecourt='M455 753 L559 690 L565 700 L539 716 Q516 716 496 743 L461 764 Z';
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2050" viewBox="120 200 680 930"><style>text{font-family:Microsoft YaHei,sans-serif;fill:#294c49}.building{text-anchor:middle;font-size:10px;font-weight:600}</style><rect x="120" y="200" width="680" height="930" fill="#f6f4e9"/><defs><clipPath id="map"><rect x="120" y="255" width="680" height="645"/></clipPath></defs><text x="140" y="226" font-size="19">梅田 · 2F 公共连廊平面校对</text><text x="140" y="245" font-size="10">北向上 · 绿色北侧 / 棕色南侧 / 蓝色西侧 · 线位来自 OSM，桥宽及前庭为示意</text><g clip-path="url(#map)"><g opacity=".38">${body}</g><path d="${forecourt}" fill="#e4c69c" stroke="#b57b39" stroke-dasharray="3 2" stroke-width="1"/>${paths.join('')}${labels.join('')}</g><text x="765" y="275">N ↑</text>${legend.join('')}<text x="140" y="1080" font-size="9">大丸前庭浅色虚边：弧形退避示意；跨层设备仅记录接口，本站付费站台不属于此公共网络。</text><text x="140" y="1095" font-size="9">© OpenStreetMap contributors / ODbL · 参考几何授权待核实 · 内部校对，不用于现场导航</text></svg>`;
mkdirSync('build/geography',{recursive:true});
writeFileSync('build/geography/elevated-plan.svg',svg);
writeFileSync('build/geography/elevated-plan.geojson',JSON.stringify({type:'FeatureCollection',features:geo},null,2));
writeFileSync('build/geography/elevated-report.json',JSON.stringify({groups:count,segments:geo.length,pending,limitations:['Widths and forecourt are illustrative.','Not a navigable graph; endpoint continuity and vertical access require further modelling.','Ground road crossings are grade-separated, not walking junctions.']},null,2));
console.log(`Generated ${count} groups, ${geo.length} OSM segments; ${pending.length} unresolved geometry.`);
