import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import polygonClipping from 'polygon-clipping';
import {nishiStation} from '../src/infrastructure/nishi-umeda-map.ts';
import {kitashinchiStation} from '../src/infrastructure/kitashinchi-map.ts';
import {layout,levels,edges,stations} from '../src/infrastructure/umeda-map.ts';
import {pointInPolygon,platformLocalPoint,platformPoint} from '../src/domain/map/geometry.ts';
import {platformRail} from '../src/domain/map/rail-geometry.ts';
import {findRoute} from '../src/domain/navigation/find-route.ts';
import {planGateBoundaries} from '../src/application/gate-boundaries.ts';
import {planFloorOpenings} from '../src/application/connection-openings.ts';
import {connectionLanes} from '../src/application/connection-lanes.ts';
import {MapSession} from '../src/application/map-session.ts';
import {VerticalConnectionModel} from '../src/presentation/vertical-connection-model.ts';
import {displayElevation} from '../src/application/display-elevation.ts';
import {viewLayerRole} from '../src/application/view-layer.ts';
import {floorOptions} from '../src/presentation/floor-options.ts';
import {sampleRailSegment} from '../src/domain/map/rail-geometry.ts';
import {districtFrame,districtPlacements} from '../src/infrastructure/district-placement.ts';

test('Y11 north terminal and Kitashinchi through island retain their own tracks and evidence',()=>{
  assert.equal(stations.length,7);
  const y=nishiStation.layout.platforms[0]!,k=kitashinchiStation.layout.platforms[0]!;
  assert.equal(y.terminalEnd,'end');assert(y.terminal);assert(!k.terminal);
  for(const [i,track]of y.tracks.entries()){
    assert([1,2].includes(track));const r=platformRail(y,i);
    assert(Math.abs(platformLocalPoint(y,r.end).x-(y.length/2-3))<1e-6);
    assert(Math.abs(platformLocalPoint(y,r.start).x+y.length/2)<1e-6);
  }
  for(const [s,source]of [[nishiStation,'yotsubashi'],[kitashinchiStation,'kitashinchi']] as const)
    for(const item of [...s.facilities,...s.layout.connections,...s.layout.platforms,...s.layout.areas]){
      assert.equal(item.evidence.source,source);assert.deepEqual(item.evidence.pages,[1]);
    }
});

test('Y11 north gate permits exit only, middle gate entry only and south gate works both ways',()=>{
  assert.equal(planGateBoundaries(nishiStation.facilities,nishiStation.layout.areas).length,3);
  assert(findRoute(edges,'nishi-umeda-north-route-in','nishi-umeda-north-route-out',true));
  assert.equal(findRoute(edges,'nishi-umeda-north-route-out','nishi-umeda-north-route-in',true),null);
  assert(findRoute(edges,'nishi-umeda-middle-route-out','nishi-umeda-middle-route-in',true));
  assert.equal(findRoute(edges,'nishi-umeda-middle-route-in','nishi-umeda-middle-route-out',true),null);
  assert(findRoute(edges,'nishi-umeda-south-route-in','nishi-umeda-south-route-out',true));
  assert(findRoute(edges,'nishi-umeda-south-route-out','nishi-umeda-south-route-in',true));
});

test('western stations support every landing and cut each upper flight without invalid geometry',()=>{
  for(const s of [nishiStation,kitashinchiStation]){
    for(const p of s.nodes)assert(s.layout.areas.some(a=>a.level===p.level&&pointInPolygon(p,a.outline))||s.layout.platforms.some(a=>{
      const q=platformLocalPoint(a,p);return a.level===p.level&&Math.abs(q.x)<=a.length/2&&Math.abs(q.z)<=a.width/2;
    }),p.id);
    const openings=planFloorOpenings(s.layout.connections,levels,s.layout.platforms);
    for(const c of s.layout.connections){
      assert.equal(openings.filter(o=>o.connectionId===c.id&&o.level===c.to.level).length,connectionLanes(c).length,c.id);
      const model=new VerticalConnectionModel(c,levels,s.layout.platforms);
      for(const explode of [0,0.48,1]){
        model.update(id=>displayElevation(levels,id,explode),s===nishiStation?'y11-platform':'kitashinchi-platform');
        model.group.traverse(o=>{if(o instanceof T.Mesh)assert(o.geometry.getAttribute('position').array.every(Number.isFinite));});
      }
      if(c.platformId)for(const lane of connectionLanes(c)){
        const p=s.layout.platforms.find(p=>p.id===c.platformId)!,q=platformLocalPoint(p,lane.from);
        assert(Math.abs(q.z)+(c.kind==='stairs'?1.4:c.kind==='elevator'?1.75:1.15)<p.width/2);
      }
    }
  }
});

test('Kitashinchi east/west gates, paired escalators and both local previews integrate with B1 focus',()=>{
  assert.equal(planGateBoundaries(kitashinchiStation.facilities,kitashinchiStation.layout.areas).length,2);
  assert.equal(kitashinchiStation.layout.connections.filter(c=>c.lanes===2).length,2);
  for(const [s,level]of [[nishiStation,'y11-hall'],[kitashinchiStation,'kitashinchi-hall']] as const){
    const session=new MapSession(edges);session.focusStation(s.id);assert.equal(session.state.level,level);
    const route=findRoute(edges,`${s.id}-route-entry`,`${s.id}-destination`,true);
    assert(route&&route.every(id=>id.startsWith(s.id)));
  }
  assert.equal(findRoute(edges,'nishi-umeda-route-entry','kitashinchi-destination',true),null);
  const hydraulic=nishiStation.layout.connections.find(c=>c.id==='nishi-umeda-hydraulic-lift')!;
  assert.equal(hydraulic.from.level,hydraulic.to.level);assert.equal(hydraulic.to.elevationOffset,1.2);
});

test('district walking map produces public western links and shared DIAMOR junctions',()=>{
  for(const id of ['nishi-hanshin-b1-public','y11-kitashinchi-public','diamor-hanshin-kitashinchi-public','diamor-metro-public']){
    const p=layout.passages.find(p=>p.id===id)!;assert(p&&p.kind==='underground');
    for(const end of p.points.filter(p=>p.station))assert(layout.areas.some(a=>a.kind==='public'&&a.level===end.level&&pointInPolygon(end,a.outline)));
  }
  const main=layout.passages.find(p=>p.id==='diamor-hanshin-kitashinchi-public')!,metro=layout.passages.find(p=>p.id==='diamor-metro-public')!;
  const shared=layout.areas.find(a=>a.id==='hanshin-umeda-department-public')!;
  assert(pointInPolygon(main.points[0]!,shared.outline)&&pointInPolygon(metro.points.at(-1)!,shared.outline),'separate perimeter portals meet through the same station public region');
  assert.equal(main.evidence.source,'district');assert(main.evidence.detail.includes('梅田周边地区通道.pdf'));
});

test('Grand Front bridge crosses the road perpendicular to its south-building facade',()=>{
  const south=layout.buildings.find(b=>b.id==='grand-front-south')!,p=layout.passages.find(p=>p.id==='grand-front-north-south-deck')!;
  const a=south.outline[0]!,b=south.outline[1]!,from=p.points[0]!,to=p.points[1]!;
  assert(Math.abs((to.x-from.x)*(b.x-a.x)+(to.z-from.z)*(b.z-a.z))<1e-6);
  assert(Number.isFinite(to.x)&&Number.isFinite(to.z));
  assert(Math.hypot(to.x-from.x,to.z-from.z)<26);
});

test('western station interiors do not intersect neighbouring stations at the same physical height',()=>{
  const ring=(ps:{x:number;z:number}[])=>[ps.map(p=>[p.x,p.z] as [number,number])];
  for(const station of [nishiStation,kitashinchiStation]){
    for(const a of station.layout.areas.filter(a=>a.kind==='paid'))for(const other of layout.areas.filter(b=>b.kind==='paid'&&
      levels.find(l=>l.id===b.level)!.station!==station.id&&levels.find(l=>l.id===b.level)!.y===levels.find(l=>l.id===a.level)!.y))
      assert.equal(polygonClipping.intersection(ring(a.outline),ring(other.outline)).length,0,`${a.id} intersects ${other.id}`);
    const platformRing=(p:typeof layout.platforms[number])=>ring([
      platformPoint(p,-p.length/2,-p.width/2),platformPoint(p,p.length/2,-p.width/2),
      platformPoint(p,p.length/2,p.width/2),platformPoint(p,-p.length/2,p.width/2)]);
    for(const p of station.layout.platforms)for(const other of layout.platforms.filter(q=>levels.find(l=>l.id===q.level)!.station!==station.id&&levels.find(l=>l.id===q.level)!.y===levels.find(l=>l.id===p.level)!.y))
      assert.equal(polygonClipping.intersection(platformRing(p),platformRing(other)).length,0);
  }
});

test('Kitashinchi platform escalators remain local rather than spanning a quarter of the station',()=>{
  const station=kitashinchiStation,p=station.layout.platforms[0]!;
  for(const c of station.layout.connections.filter(c=>c.kind==='escalator'&&c.platformId===p.id)){
    assert(Math.hypot(c.to.x-c.from.x,c.to.z-c.from.z)<=12.01);
    assert(Math.hypot(c.to.x-c.from.x,c.to.z-c.from.z)<p.length*0.15);
  }
  const session=new MapSession([]);assert.equal(session.state.explode,0);
  session.state.explode=0.8;session.reset();assert.equal(session.state.explode,0);
});

test('western railway continuations join the correct ends and cross at separate heights within B2',()=>{
  for(const [id,station,side]of [['y11-south',nishiStation,-1],['kitashinchi-west',kitashinchiStation,-1],['kitashinchi-east',kitashinchiStation,1]] as const){
    const a=layout.railApproaches.find(a=>a.id===id)!,p=station.layout.platforms[0]!;
    for(const [index,track]of p.tracks.entries()){
      const s=a.segments.find(s=>s.platformId===p.id&&s.track===track)!;
      assert.deepEqual(a.nodes.find(n=>n.id===s.from)!.point,side===-1?platformRail(p,index).start:platformRail(p,index).end);
    }
    const ends=a.nodes.filter(n=>n.kind==='end');
    assert(Math.abs(Math.hypot(ends[0]!.point.x-ends[1]!.point.x,ends[0]!.point.z-ends[1]!.point.z)-4.4)<1e-6);
  }
  assert(!layout.railApproaches.some(a=>a.id==='y11-north'));
  const y=layout.railApproaches.find(a=>a.id==='y11-south')!,k=layout.railApproaches.find(a=>a.id==='kitashinchi-west')!;
  let crossings=0;
  for(const ys of y.segments)for(const ks of k.segments){
    const yp=sampleRailSegment(y,ys,80),kp=sampleRailSegment(k,ks,80);
    for(let i=1;i<yp.length;i++)for(let j=1;j<kp.length;j++){
      const a=yp[i-1]!.point,b=yp[i]!.point,c=kp[j-1]!.point,d=kp[j]!.point;
      const cross=(x:number,z:number,u:number,v:number)=>x*v-z*u;
      const det=cross(b.x-a.x,b.z-a.z,d.x-c.x,d.z-c.z);if(Math.abs(det)<1e-10)continue;
      const t=cross(c.x-a.x,c.z-a.z,d.x-c.x,d.z-c.z)/det,u=cross(c.x-a.x,c.z-a.z,b.x-a.x,b.z-a.z)/det;
      if(t>=0&&t<1&&u>=0&&u<1)crossings++;
    }
  }
  assert.equal(crossings,4,'both JR running tracks pass beneath both Y11 tracks');
  for(const explode of [0,0.48,1])assert.equal(displayElevation(levels,y.level,explode)-displayElevation(levels,k.level,explode),8);
  assert.equal(viewLayerRole(levels,{level:'y11-platform'},'kitashinchi-platform'),'current');
  assert.equal(floorOptions(levels).length,5);
});

test('DIAMOR east branches join T20 and commercial basement placeholders remain connected',()=>{
  for(const id of ['diamor-t20-public','diamor-sonechika-public','whity-hankyu-dept-public','whity-hankyu-grand-public']){
    const p=layout.passages.find(p=>p.id===id)!;assert(p&&p.kind==='underground');
    assert.equal(p.evidence.source,'district');assert.deepEqual(p.evidence.pages,[1]);
  }
  for(const a of layout.areas.filter(a=>a.id.startsWith('district-')&&a.id.endsWith('-b1'))){
    assert(a.kind==='commercial'&&a.outline.length>=4&&a.label);
    assert.equal(a.labelStyle,'floor');
    const passage=layout.passages.find(p=>p.id===`${a.id}-entry`)!;assert(passage);
    const door=passage.points.at(-1)!;
    assert(a.outline.some((v,i)=>{
      const w=a.outline[(i+1)%a.outline.length]!,dx=w.x-v.x,dz=w.z-v.z;
      return Math.abs((door.x-v.x)*dz-(door.z-v.z)*dx)<1e-6;
    }));
  }
});

test('southern stations preserve the walking-map ordering and proportions around Hanshin',()=>{
  const angle=districtFrame.bearingDeg*Math.PI/180,origin=districtPlacements.hanshin.origin;
  const coordinates=(p:{x:number;z:number})=>({east:(p.x-origin.x)*Math.sin(angle)+(p.z-origin.z)*Math.cos(angle),
    south:-(p.x-origin.x)*Math.cos(angle)+(p.z-origin.z)*Math.sin(angle)});
  const y=coordinates(districtPlacements.nishi.origin),k=coordinates(districtPlacements.kitashinchi.origin),t=coordinates(districtPlacements.higashi.origin);
  assert(y.east<0&&t.east>0&&k.east>y.east&&k.east<t.east);
  assert(k.south>y.south&&y.south>t.south&&t.south>0);
  assert(Math.abs((t.east-y.east)/(k.south-t.south)-649/520)<1e-6,'shared source-map crop calibration must not drift independently between stations');
  for(const placement of [districtPlacements.nishi,districtPlacements.kitashinchi,districtPlacements.higashi]){
    assert(Math.abs(placement.origin.x-placement.referenceOrigin.x-placement.displayOffset.x)<1e-6);
    assert(Math.abs(placement.origin.z-placement.referenceOrigin.z-placement.displayOffset.z)<1e-6);
  }
});

test('Y11 curved eastern approach joins Hanshin south and DIAMOR retains the diagonal through corridor',()=>{
  const curve=layout.passages.find(p=>p.id==='nishi-hanshin-b1-public')!,end=curve.points.at(-1)!;
  const south=layout.areas.find(a=>a.id==='hanshin-umeda-department-public')!;
  assert(curve.points.length>8);assert(pointInPolygon(end,south.outline));
  const diagonal=layout.passages.find(p=>p.id==='diamor-diagonal-public')!,cross=layout.passages.find(p=>p.id==='diamor-east-west-public')!;
  assert(diagonal.points.some(p=>cross.points.some(q=>p.x===q.x&&p.z===q.z)));
  assert(diagonal.points.at(-1)!.station==='kitashinchi');
});
