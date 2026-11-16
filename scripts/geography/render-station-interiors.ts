import {readFileSync,writeFileSync} from 'node:fs';
import {createGeographicStations} from '../../src/infrastructure/district/geographic-stations.ts';
import type {Point2} from '../../src/domain/map/model.ts';
import {surfaceRailwayPlan} from '../../src/infrastructure/geography/railway-plan.ts';

const stations=createGeographicStations();
const path=(p:Point2[])=>'M'+p.map(v=>`${v.x.toFixed(2)},${v.z.toFixed(2)}`).join('L')+'Z';
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const parts:string[]=[];
const rails=surfaceRailwayPlan(JSON.parse(readFileSync('data/geography/railways/features.json','utf8')));
const railParts=rails.map(r=>{const d='M'+r.points.map(p=>`${p.x},${p.z}`).join('L');
  return `<path d="${d}" fill="none" stroke="#b8b9af" stroke-width="${r.bedWidth}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#777f79" stroke-width=".65"><title>${escape(r.name)} · ${r.id}</title></path>`;});
for(const s of stations){
  for(const a of s.layout.areas){
    parts.push(`<path d="${[a.outline,...a.holes??[]].map(path).join('')}" fill="${a.kind==='paid'?'#a9c0ad':'#e5d4b0'}" fill-rule="evenodd" fill-opacity=".2" stroke="#a18b66" stroke-width=".5" stroke-dasharray="3 2"/>`);
  }
  for(const p of s.layout.platforms){
    const c=Math.cos(p.rotationRad),d=Math.sin(p.rotationRad);
    const ring=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>({x:p.x+x!*p.length/2*c-z!*p.width/2*d,z:p.z+x!*p.length/2*d+z!*p.width/2*c}));
    parts.push(`<path d="${path(ring)}" fill="#a6c7ce" stroke="#417989" stroke-width=".7"/>`);
  }
  for(const c of s.layout.connections)parts.push(`<path d="M${c.from.x},${c.from.z}L${c.to.x},${c.to.z}" stroke="${c.kind==='stairs'?'#8a8473':'#4b7964'}" stroke-width="1.8"/><circle cx="${c.from.x}" cy="${c.from.z}" r="1.6" fill="#4b7964"><title>${escape(c.id)}</title></circle>`);
  for(const f of s.facilities.filter(f=>f.kind==='gate'))parts.push(`<circle cx="${f.x}" cy="${f.z}" r="3" fill="#b46c60"><title>${escape(f.name)}</title></circle>`);
}
const base=readFileSync('build/geography/ground-plan.svg','utf8');
writeFileSync('build/geography/station-interiors.svg',base.replace('梅田 · 建筑与道路平面布局','阶段二 · 三站内部平面校准')
  .replace('第一阶段校对稿 · 北向上 · 米制投影 · 道路宽度含估计值','蓝：站台　虚线：各层站厅　绿：垂直设施　红：改札　端点为人工拟合 / JR 仅地上部分')
  .replace('</svg>',`<g clip-path="url(#extent)">${railParts.join('')}${parts.join('')}</g></svg>`));
writeFileSync('build/geography/station-interiors.json',JSON.stringify(stations,null,2));
writeFileSync('build/geography/surface-railways.json',JSON.stringify(rails,null,2));
console.log(stations.map(s=>({station:s.id,platforms:s.layout.platforms.length,connections:s.layout.connections.length})));
