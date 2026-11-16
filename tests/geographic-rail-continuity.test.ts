import {geographicBuildings} from '../src/infrastructure/buildings/index.ts';
import {pointInPolygon} from '../src/domain/map/geometry.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGeographicStations} from '../src/infrastructure/district/geographic-stations.ts';
import {sampleRailSegment,platformRail} from '../src/domain/map/rail-geometry.ts';
import {platformTangent} from '../src/domain/map/geometry.ts';
import {nishiAxis} from '../src/infrastructure/stations/nishi-umeda/geographic.ts';
test('calibrated rail approaches restore smooth shared merges without sharp doglegs',()=>{
 for(const station of createGeographicStations())for(const approach of station.layout.railApproaches??[]){
  const platform=station.layout.platforms.find(p=>p.level===approach.level)!;
  const axis={x:Math.cos(platform.rotationRad),z:Math.sin(platform.rotationRad)};
  for(const segment of approach.segments){
   const samples=sampleRailSegment(approach,segment,100),a=samples[0]!.point,b=samples.at(-1)!.point;
   const sign=Math.sign((b.x-a.x)*axis.x+(b.z-a.z)*axis.z);
   let previous:{x:number;z:number}|undefined;
   for(let i=1;i<samples.length;i++){
    const p=samples[i-1]!.point,q=samples[i]!.point,dx=q.x-p.x,dz=q.z-p.z,length=Math.hypot(dx,dz);
    const forward=sign*(dx*axis.x+dz*axis.z)/length;
    assert.ok(forward>Math.cos(40*Math.PI/180),segment.id+' sideways or reversing');
    if(previous){const angle=Math.acos(Math.min(1,Math.max(-1,(previous.x*dx+previous.z*dz)/length)));assert.ok(angle<.04,segment.id+' abrupt curvature');}
    previous={x:dx/length,z:dz/length};
   }
   if(segment.platformId){
    const p=station.layout.platforms.find(p=>p.id===segment.platformId)!,rail=platformRail(p,p.tracks.indexOf(segment.track!));
    assert.ok([rail.start,rail.end].some(end=>Math.hypot(end.x-a.x,end.z-a.z)<1e-8));
    const tangent=platformTangent(p,sign*p.length/2),dx=segment.control1.x-a.x,dz=segment.control1.z-a.z;
    assert.ok(Math.abs(dx*Math.sin(tangent)-dz*Math.cos(tangent))<1e-7);
   }
  }
 }
});
test('Nishi platform and paid halls move west in the same station frame',()=>{
 assert.equal(nishiAxis.negativeEnd.x,415);assert.equal(nishiAxis.positiveEnd.x,423);
 const station=createGeographicStations().find(s=>s.id==='nishi-umeda')!;
 const paid=station.layout.areas.find(a=>a.kind==='paid')!;
 assert.ok(paid.outline.reduce((s,p)=>s+p.x/paid.outline.length,0)<station.layout.platforms[0]!.x);
});

test('Umekita and Hankyu merge into shared running pairs rather than independent tails',()=>{
 const stations=createGeographicStations();
 for(const s of stations)for(const a of s.layout.railApproaches??[]){
  if(a.level!=='underground-platform'&&a.level!=='hankyu-platform')continue;
  assert.equal(a.nodes.filter(n=>n.kind==='end').length,2);
  assert.equal(a.segments.filter(seg=>a.nodes.find(n=>n.id===seg.to)!.kind==='end').length,2);
  assert.ok(a.nodes.filter(n=>n.kind==='platform-end').length>=3);
  for(const node of a.nodes.filter(n=>n.kind==='junction')){
   const outgoing=a.segments.find(s=>s.from===node.id)!;
   const ox=outgoing.control1.x-node.point.x,oz=outgoing.control1.z-node.point.z;
   for(const incoming of a.segments.filter(s=>s.to===node.id)){
    const ix=node.point.x-incoming.control2.x,iz=node.point.z-incoming.control2.z;
    assert.ok(Math.abs(ix*oz-iz*ox)<1e-6);assert.ok(ix*ox+iz*oz>0);
   }
  }
 }
});

test('JR main bends north at both ends and east loop avoids Hankyu building envelopes',()=>{
 const jr=createGeographicStations()[0]!,angle=jr.layout.platforms.find(p=>p.level==='platform')!.rotationRad;
 for(const side of [-1,1]){
  const main=jr.layout.railApproaches!.find(a=>a.id===`map-rail-jr-osaka-platform-main-${side}`)!;
  const tail=main.segments.at(-1)!,a=main.nodes.find(n=>n.id===tail.from)!.point,b=main.nodes.find(n=>n.id===tail.to)!.point;
  assert.ok((b.z-a.z)/Math.hypot(b.x-a.x,b.z-a.z)<side*Math.sin(angle),'main must turn toward geographic north');
  assert.ok(main.name.includes(side===1?'新大阪':'神户'));
 }
 const loop=jr.layout.railApproaches!.find(a=>a.id==='map-rail-jr-osaka-platform-loop-1')!;
 assert.ok(loop.name.includes('京桥'));
 for(const segment of loop.segments)for(const sample of sampleRailSegment(loop,segment,200))for(const side of [-1,0,1]){
  const point={x:sample.point.x+sample.normal.x*side*1.5,z:sample.point.z+sample.normal.z*side*1.5};
  for(const building of geographicBuildings.filter(b=>b.id==='hankyu-dept'||b.id==='hankyu-grand'))assert.ok(!pointInPolygon(point,building.volumes[0]!.outline),building.id+' intersects east loop track bed');
 }
});
