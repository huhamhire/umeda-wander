import {readFileSync,writeFileSync} from 'node:fs';
import {createPilotCalibrations} from '../../src/infrastructure/district/calibration-registry.ts';
import {toGeographicPlan} from '../../src/domain/map/spatial-block.ts';
import {geographicFrame} from '../../src/infrastructure/geography/frame.ts';
import {districtFrame} from '../../src/infrastructure/district-placement.ts';
import {stationMaps} from '../../src/infrastructure/station-maps.ts';
import type {OsmPlanFeature} from '../../src/infrastructure/geography/osm-envelope.ts';
import type {Point2} from '../../src/domain/map/model.ts';

const features=JSON.parse(readFileSync('data/geography/features.json','utf8')) as OsmPlanFeature[];
const calibrations=createPilotCalibrations(features);
// Display the OLD sketch in the same physical frame for comparison, including its
// artificial offsets. This conversion is diagnostic, not an interior calibration.
const origin=toGeographicPlan(districtFrame.origin,geographicFrame);
function oldPlan(p:Point2):Point2 {
  const x=(p.x-districtFrame.anchor.x)*districtFrame.metersPerUnit;
  const z=(p.z-districtFrame.anchor.z)*districtFrame.metersPerUnit;
  const a=districtFrame.bearingDeg*Math.PI/180;
  return {x:origin.x+x*Math.sin(a)+z*Math.cos(a),z:origin.z-x*Math.cos(a)+z*Math.sin(a)};
}
const path=(p:Point2[])=>'M'+p.map(p=>`${p.x.toFixed(2)},${p.z.toFixed(2)}`).join('L')+'Z';
const overlays:string[]=[];
const report=[];
for(const c of calibrations){
  const station=stationMaps.find(s=>s.id===c.station)!;
  const areas=station.layout.areas.filter(a=>c.station!=='jr-osaka'||a.level==='concourse');
  for(const a of areas)overlays.push(`<path d="${path(a.outline.map(oldPlan))}" fill="none" stroke="#b47769" stroke-width="1" stroke-dasharray="4 3"/>`);
  for(const e of c.envelopes){
    overlays.push(`<path d="${[e.outline,...e.holes].map(path).join('')}" fill="#5c98a4" fill-opacity=".25" fill-rule="evenodd" stroke="#27697a" stroke-width="2"/>`);
    const p=e.outline[0]!;
    overlays.push(`<text x="${p.x}" y="${p.z-5}" font-size="12" fill="#174e61">${station.name} · ${e.certainty==='approximate'?'待校准留位':'建筑基准'}</text>`);
  }
  report.push({...c,legacyAreaCount:areas.length});
}
const base=readFileSync('build/geography/ground-plan.svg','utf8');
const svg=base.replace('梅田 · 建筑与道路平面布局','阶段二 · 三站包络校准对照')
  .replace('第一阶段校对稿 · 北向上 · 米制投影 · 道路宽度含估计值','蓝色：地理包络 / M16 留位　红虚线：旧场景楼板　尚未调整内部或替换 H5 场景')
  .replace('</svg>',`<g>${overlays.join('')}</g></svg>`);
writeFileSync('build/geography/station-calibration.svg',svg);
writeFileSync('build/geography/station-calibration.json',JSON.stringify({frame:geographicFrame,stations:report},null,2));
console.log('Wrote build/geography/station-calibration.svg and station-calibration.json');
