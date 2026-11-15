import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {layout,levels} from '../src/infrastructure/umeda-map.ts';
import {hankyuStation} from '../src/infrastructure/hankyu-umeda-map.ts';
import {platformRail,sampleRailSegment,offsetRailSample} from '../src/domain/map/rail-geometry.ts';
import {pointInPolygon} from '../src/domain/map/geometry.ts';
import {districtFrame} from '../src/infrastructure/district-placement.ts';
import {buildRailApproachModel} from '../src/presentation/rail-approach-model.ts';
import {cameraEnvelope} from '../src/presentation/camera-framing.ts';
import {displayElevation} from '../src/application/display-elevation.ts';
import type {Point2} from '../src/domain/map/model.ts';

const approaches=layout.railApproaches;
test('station approaches retain each source track and independent running bundles',()=>{
  assert.equal(approaches.length,14);
  const leads=approaches.flatMap(a=>a.segments.filter(s=>s.platformId));
  assert.equal(leads.length,51);
  for(const p of layout.platforms.filter(p=>['platform','hankyu-platform','hanshin-platform','metro-platform'].includes(p.level)))for(const [index,track]of p.tracks.entries()){
    const a=approaches.find(a=>a.segments.some(s=>s.platformId===p.id&&s.track===track))!;
    const segment=a.segments.find(s=>s.platformId===p.id&&s.track===track)!;
    assert.deepEqual(a.nodes.find(n=>n.id===segment.from)!.point,p.level==='metro-platform'?platformRail(p,index).start:platformRail(p,index).end);
  }
});

test('JR forms two directions and each Hankyu three-road group reaches a separate running pair',()=>{
  for(const a of approaches){
    const outgoing=a.nodes.filter(n=>n.kind==='outlet');
    assert.equal(outgoing.length,a.id==='jr-east-main'||a.id==='jr-west-main'?4:2);
    for(const start of a.nodes.filter(n=>n.kind==='platform-end')){
      const seen=new Set<string>(),queue=[start.id];
      while(queue.length){const id=queue.shift()!;if(seen.has(id))continue;seen.add(id);queue.push(...a.segments.filter(s=>s.from===id).map(s=>s.to));}
      assert(a.nodes.some(n=>n.kind==='end'&&seen.has(n.id)),start.id);
    }
    if(a.station==='hankyu-umeda'){
      assert.equal(a.nodes.filter(n=>n.kind==='platform-end').length,3);
      const junction=a.nodes.find(n=>n.kind==='junction')!;
      assert.equal(a.segments.filter(s=>s.from===junction.id).length,2);
    }
  }
  const main=approaches.find(a=>a.id==='jr-east-main')!,loop=approaches.find(a=>a.id==='jr-east-loop')!;
  const mainEnds=main.nodes.filter(n=>n.kind==='end'),loopEnds=loop.nodes.filter(n=>n.kind==='end');
  assert(Math.max(...mainEnds.map(n=>n.point.z))+15<Math.min(...loopEnds.map(n=>n.point.z)),'main and loop tails retain distinct directions after southward fitting');
  assert(loop.nodes.filter(n=>n.kind==='end').every(n=>n.point.z>20));
  assert([...main.nodes,...loop.nodes].filter(n=>n.kind==='end').every(n=>n.point.x===185));
});

test('JR western platform ends join separate main and loop bundles without backtracking',()=>{
  const west=approaches.filter(a=>a.id.startsWith('jr-west'));
  assert.equal(west.length,2);
  assert.equal(west.flatMap(a=>a.segments.filter(s=>s.platformId)).length,11);
  for(const p of layout.platforms.filter(p=>p.level==='platform'))for(const [index,track]of p.tracks.entries()){
    const a=west.find(a=>a.id===(track<=2?'jr-west-loop':'jr-west-main'))!;
    const lead=a.segments.find(s=>s.platformId===p.id&&s.track===track)!;
    assert.deepEqual(a.nodes.find(n=>n.id===lead.from)!.point,platformRail(p,index).start);
    const samples=sampleRailSegment(a,lead);
    assert(Math.abs(samples[0]!.normal.x)<1e-6,'station rail tangent must stay on the platform axis');
  }
  for(const a of west)for(const s of a.segments){
    const points=sampleRailSegment(a,s,100).map(p=>p.point);
    assert(points.every((p,i)=>i===0||p.x<points[i-1]!.x),'westward curve must not reverse');
  }
  const main=west.find(a=>a.id==='jr-west-main')!,loop=west.find(a=>a.id==='jr-west-loop')!;
  assert(main.nodes.filter(n=>n.kind==='end').every(n=>n.point.x===-215));
  assert(loop.nodes.filter(n=>n.kind==='end').every(n=>n.point.x===-215));
  // Running pairs remain ordered and separated across the full shared tail.
  for(let i=0;i<=100;i++){
    const zMain=main.segments.filter(s=>s.id.includes('-tail-')).map(s=>sampleRailSegment(main,s,100)[i]!.point.z);
    const zLoop=loop.segments.filter(s=>s.id.includes('-tail-')).map(s=>sampleRailSegment(loop,s,100)[i]!.point.z);
    assert(Math.min(...zLoop)-Math.max(...zMain)>8);
  }
});

test('Umekita tracks continue from both platform ends along the underground axis',()=>{
  for(const p of layout.platforms.filter(p=>p.level==='underground-platform'))for(const [index,track]of p.tracks.entries()){
    const rail=platformRail(p,index);
    for(const [id,side,expected]of [['jr-umekita-north',1,rail.end],['jr-umekita-south',-1,rail.start]] as const){
      const a=approaches.find(a=>a.id===id)!;
      assert.equal(a.level,'underground-platform');
      const lead=a.segments.find(s=>s.platformId===p.id&&s.track===track)!;
      assert.deepEqual(a.nodes.find(n=>n.id===lead.from)!.point,expected);
      const end=a.nodes.find(n=>n.id===`${a.id}-end-${track<=22?'a':'b'}`)!.point;
      const dx=end.x-expected.x,dz=end.z-expected.z;
      if(side===-1){
        assert(Math.abs(dx*Math.cos(p.rotationRad)+dz*Math.sin(p.rotationRad)+44)<1e-6);
        assert(Math.abs(dx*Math.sin(p.rotationRad)-dz*Math.cos(p.rotationRad))<14);
      }else{
        assert(Math.hypot(dx,dz)>45&&Math.hypot(dx,dz)<100);
        const tail=a.segments.find(s=>s.id===`${a.id}-tail-${track<=22?'a':'b'}`)!;
        const tangent={x:end.x-tail.control2.x,z:end.z-tail.control2.z};
        assert(Math.atan2(tangent.z,tangent.x)<p.rotationRad-0.4,'north tail turns along Grand Front west-side road');
      }
      assert((dx*Math.cos(p.rotationRad)+dz*Math.sin(p.rotationRad))*side>0);
    }
  }
});

test('Umekita north bend keeps track spacing and aligns both exit cross-sections',()=>{
  const approach=approaches.find(a=>a.id==='jr-umekita-north')!;
  const bends=approach.segments.filter(s=>s.id.includes('-bend-'));
  assert.equal(bends.length,2);
  const samples=bends.map(s=>sampleRailSegment(approach,s,100));
  for(let i=0;i<samples.length;i++)for(let j=i+1;j<samples.length;j++){
    const spacing=samples[i]!.map((v,k)=>Math.hypot(v.point.x-samples[j]![k]!.point.x,v.point.z-samples[j]![k]!.point.z));
    assert(Math.min(...spacing)>3,'adjacent ballast beds must stay apart');
    assert(Math.max(...spacing)-Math.min(...spacing)<0.02,'concentric curves retain lateral spacing');
  }
  const ends=approach.nodes.filter(n=>n.kind==='end'),angle=(-7.3-58.35)*Math.PI/180;
  const along=(p:Point2)=>p.x*Math.cos(angle)+p.z*Math.sin(angle);
  const positions=ends.map(n=>along(n.point));
  assert(Math.max(...positions)-Math.min(...positions)<1e-6,'exits form a common section instead of staggered elbows');
});

test('JR east rail beds run close to Hankyu while retaining a narrow clear separation',()=>{
  const distance=(p:Point2,outline:Point2[])=>pointInPolygon(p,outline)?0:Math.min(...outline.map((a,i)=>{
    const b=outline[(i+1)%outline.length]!,dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));
    return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);
  }));
  let closest=Infinity;
  for(const a of approaches.filter(a=>a.id.startsWith('jr-east')))for(const s of a.segments){
    for(const {point}of sampleRailSegment(a,s,160))for(const area of hankyuStation.layout.areas){
      // Include the 1.25-unit ballast half-width, not only rail centre lines.
      const gap=distance(point,area.outline)-1.25;closest=Math.min(closest,gap);
      assert(gap>=4,`${s.id} intersects or approaches ${area.id}`);
    }
  }
  assert(closest<7,'JR should remain adjacent to Hankyu instead of moving far south');
});

test('JR east station throat converges gradually without a sharp lateral S bend',()=>{
  for(const approach of approaches.filter(a=>a.id.startsWith('jr-east')))for(const segment of approach.segments){
    const samples=sampleRailSegment(approach,segment,120);
    for(let i=1;i<samples.length;i++){
      const a=samples[i-1]!.point,b=samples[i]!.point;
      assert(b.x>a.x,'east approach cannot reverse along the station axis');
      assert(Math.abs(Math.atan2(b.z-a.z,b.x-a.x))<40*Math.PI/180,'station-exit fan must remain a gentle convergence');
    }
  }
});

test('paired rails meet exactly at merge nodes with matching endpoint tangents',()=>{
  for(const a of approaches)for(const node of a.nodes.filter(n=>n.kind==='outlet'||n.kind==='junction')){
    const ins=a.segments.filter(s=>s.to===node.id),outs=a.segments.filter(s=>s.from===node.id);
    for(const input of ins)for(const output of outs)for(const side of [-0.7,0.7]){
      const p=offsetRailSample(sampleRailSegment(a,input).at(-1)!,side),q=offsetRailSample(sampleRailSegment(a,output)[0]!,side);
      assert(Math.hypot(p.x-q.x,p.z-q.z)<1e-6,`${input.id} to ${output.id}`);
    }
  }
});

test('Midosuji island exits narrow into a running pair and turn outward along the southern road',()=>{
  const a=approaches.find(a=>a.id==='metro-south')!;
  const leads=a.segments.filter(s=>s.platformId),ends=a.nodes.filter(n=>n.kind==='outlet');
  const starts=leads.map(s=>a.nodes.find(n=>n.id===s.from)!.point);
  const gap=(points:Point2[])=>Math.hypot(points[0]!.x-points[1]!.x,points[0]!.z-points[1]!.z);
  assert(gap(starts)>10);assert(Math.abs(gap(ends.map(n=>n.point))-4.4)<1e-6);
  const samples=leads.map(s=>sampleRailSegment(a,s,100));
  let previous=Infinity;
  for(let i=0;i<=100;i++){
    const spacing=gap(samples.map(ps=>ps[i]!.point));assert(spacing<=previous+1e-6);assert(spacing>4);previous=spacing;
  }
  const curves=a.segments.filter(s=>s.id.includes('-bend-')).map(s=>sampleRailSegment(a,s,100));
  const east=districtFrame.bearingDeg*Math.PI/180;
  for(let i=0;i<=100;i++)assert(Math.abs(gap(curves.map(ps=>ps[i]!.point))-4.4)<0.01);
  for(const curve of curves){
    const first=curve[0]!,last=curve.at(-1)!;
    assert((last.point.x-first.point.x)*Math.sin(east)+(last.point.z-first.point.z)*Math.cos(east)>0,'bend toward the outside/east');
    const angle=Math.acos(first.normal.x*last.normal.x+first.normal.z*last.normal.z);
    assert(Math.abs(angle-32*Math.PI/180)<1e-6);
  }
});

test('rail models remain finite and station focus frames their external ends',()=>{
  for(const a of approaches){
    const model=buildRailApproachModel(a);assert(model.getObjectByName('ballast'));assert(model.getObjectByName('paired-rails'));
    model.traverse(o=>{
      if(!(o instanceof T.Mesh))return;
      assert([...o.geometry.getAttribute('position').array].every(Number.isFinite));
      if(o instanceof T.InstancedMesh)assert([...o.instanceMatrix.array].every(Number.isFinite));
    });
    const envelope=cameraEnvelope(layout,levels,{level:'all',focusStation:a.station},id=>displayElevation(levels,id,0.48));
    const bounds=new T.Box3().setFromPoints(envelope);
    for(const n of a.nodes.filter(n=>n.kind==='end'))assert(bounds.containsPoint(new T.Vector3(n.point.x,displayElevation(levels,a.level,0.48)+1,n.point.z)));
  }
});

test('Hankyu Kyoto tracks lie east of Kobe tracks while the JR approach stays on the west',()=>{
  const one=hankyuStation.layout.platforms.find(p=>p.tracks.includes(1))!,nine=hankyuStation.layout.platforms.find(p=>p.tracks.includes(9))!;
  const a=districtFrame.bearingDeg*Math.PI/180;
  assert((one.x-nine.x)*Math.sin(a)+(one.z-nine.z)*Math.cos(a)>0);
  const deck=layout.areas.find(a=>a.id==='district-jr-hankyu-deck')!;
  const endpoint={x:(deck.outline[1]!.x+deck.outline[2]!.x)/2,z:(deck.outline[1]!.z+deck.outline[2]!.z)/2};
  assert(hankyuStation.layout.areas.some(a=>a.kind==='public'&&a.level==='hankyu-hall'&&pointInPolygon(endpoint,a.outline)));
});
