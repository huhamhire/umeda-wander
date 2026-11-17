import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import polygonClipping from 'polygon-clipping';
import {hanshinStation} from '../src/infrastructure/stations/hanshin-umeda/index.ts';
import {layout,levels,facilities,edges,stations} from '../deprecated/infrastructure/umeda-map.ts';
import {platformLocalPoint,platformPoint,pointInPolygon} from '../src/domain/map/geometry.ts';
import {planFloorOpenings} from '../src/application/connection-openings.ts';
import {planGateBoundaries} from '../src/application/gate-boundaries.ts';
import {planAtriumOpenings} from '../src/application/atrium-openings.ts';
import {buildFloorGeometry} from '../src/presentation/floor-geometry.ts';
import {VerticalConnectionModel} from '../src/presentation/vertical-connection-model.ts';
import {displayElevation} from '../src/application/display-elevation.ts';
import {findRoute} from '../src/domain/navigation/find-route.ts';
import {MapSession} from '../src/application/map-session.ts';
import {explorationElevation} from '../src/application/exploration-level.ts';
import {sampleRailSegment} from '../src/domain/map/rail-geometry.ts';
import {connectionLanes} from '../src/application/connection-lanes.ts';

test('Hanshin has separate B1 west/department gates, B2 east gate and four tracks with independent alighting strips',()=>{
  assert(stations.some(s=>s.id==='hanshin-umeda'));
  const ps=hanshinStation.layout.platforms;
  assert.equal(ps.length,4);assert.deepEqual(ps.flatMap(p=>p.tracks),[1,2,3,4]);
  assert.equal(ps.filter(p=>!p.tracks.length).length,2);assert(ps.every(p=>p.terminal&&p.screenDoors==='half-height'));
  for(const f of hanshinStation.facilities){assert.equal(f.evidence.source,'hanshin');assert.deepEqual(f.evidence.pages,[1]);}
  const gates=hanshinStation.facilities.filter(f=>f.kind==='gate');
  assert.equal(gates.filter(f=>f.level==='hanshin-hall').length,2);assert.equal(gates.filter(f=>f.level==='hanshin-platform').length,1);
  assert.equal(planGateBoundaries(gates,hanshinStation.layout.areas).length,3);
});

test('Hanshin landing nodes and all platform equipment remain supported and correctly aligned',()=>{
  for(const p of hanshinStation.nodes){
    const supported=hanshinStation.layout.areas.some(a=>a.level===p.level&&pointInPolygon(p,a.outline))||hanshinStation.layout.platforms.some(a=>{
      const local=platformLocalPoint(a,p);return a.level===p.level&&Math.abs(local.x)<=a.length/2&&Math.abs(local.z)<=a.width/2;
    });assert(supported,`${p.id}: missing landing support`);
  }
  for(const c of hanshinStation.layout.connections.filter(c=>c.platformId)){
    const platform=hanshinStation.layout.platforms.find(p=>p.id===c.platformId)!;
    const p=platformLocalPoint(platform,c.from),q=platformLocalPoint(platform,c.to);
    assert(Math.abs(p.z-q.z)<1e-6,'vertical connections must follow their platform frame');
  }
});

test('Hanshin vertical models and real upper floor openings survive underground cuts and expansion',()=>{
  const openings=planFloorOpenings(hanshinStation.layout.connections,levels,layout.platforms);
  for(const c of hanshinStation.layout.connections){
    assert(openings.some(o=>o.connectionId===c.id&&o.level===c.to.level));
    const model=new VerticalConnectionModel(c,levels,layout.platforms);
    for(const explode of [0,0.48,1]){
      model.update(id=>displayElevation(levels,id,explode),'hanshin-platform');
      const lower=c.from.level==='hanshin-platform';assert.equal(model.group.visible,lower);
      model.group.traverse(o=>{if(o instanceof T.Mesh)assert(o.geometry.getAttribute('position').array.every(Number.isFinite));});
    }
  }
  const floor=hanshinStation.layout.areas.find(a=>a.id==='hanshin-umeda-hall-paid')!;
  const c=hanshinStation.layout.connections.find(c=>c.kind==='escalator')!,hole=openings.find(o=>o.connectionId===c.id&&o.level==='hanshin-hall')!;
  const p=hole.outline.reduce((s,p)=>({x:s.x+p.x/hole.outline.length,z:s.z+p.z/hole.outline.length}),{x:0,z:0});
  const mesh=new T.Mesh(buildFloorGeometry(floor.outline,openings.filter(o=>o.level==='hanshin-hall').map(o=>o.outline),0.55),new T.MeshBasicMaterial({side:T.DoubleSide}));
  mesh.updateMatrixWorld(true);assert.equal(new T.Raycaster(new T.Vector3(p.x,5,p.z),new T.Vector3(0,-1,0)).intersectObject(mesh).length,0);
});

test('Hanshin remains south of Daimaru and its B2 platform floors do not intersect M16',()=>{
  const box=(points:{x:number;z:number}[])=>[points.map(p=>[p.x,p.z] as [number,number])];
  const metro=layout.platforms.find(p=>p.level==='metro-platform')!;
  const metroRing=[platformPoint(metro,-metro.length/2,-metro.width/2),platformPoint(metro,metro.length/2,-metro.width/2),platformPoint(metro,metro.length/2,metro.width/2),platformPoint(metro,-metro.length/2,metro.width/2)];
  const daimaru=layout.buildings.find(b=>b.id==='daimaru')!;
  for(const p of hanshinStation.layout.platforms){
    assert(p.z>Math.max(...daimaru.outline.map(p=>p.z))+10);
    const ring=[platformPoint(p,-p.length/2,-p.width/2),platformPoint(p,p.length/2,-p.width/2),platformPoint(p,p.length/2,p.width/2),platformPoint(p,-p.length/2,p.width/2)];
    assert.equal(polygonClipping.intersection(box(ring),box(metroRing)).length,0);
  }
});

test('Hanshin public slope and south lift connect underground halls, ground and the existing 2F deck',()=>{
  const slope=layout.passages.find(p=>p.id==='hanshin-east-south-public-slope')!;
  assert.deepEqual(slope.points.map(p=>p.level),['hanshin-platform','hanshin-hall']);
  assert(planAtriumOpenings(layout.atria).some(o=>o.connectionId==='hanshin-south-ramp-opening'));
  const lift=hanshinStation.layout.connections.filter(c=>c.id.includes('south-lift'));
  assert.deepEqual(lift.map(c=>[c.from.level,c.to.level]),[['hanshin-hall','hanshin-ground'],['hanshin-ground','hanshin-deck']]);
  const deck=layout.passages.find(p=>p.id==='hanshin-south-connecting-deck')!;
  assert.equal(deck.points[0]!.level,'hanshin-deck');assert.equal(deck.points.at(-1)!.level,'hanshin-deck');
  assert.equal(explorationElevation(levels.find(l=>l.id==='hanshin-deck')!),8);
});

test('compact Hanshin terminal leaves clearance beside the Midosuji south tunnel reserve',()=>{
  const metro=layout.railApproaches.find(a=>a.id==='metro-south')!;
  const rings=[...hanshinStation.layout.areas.filter(a=>a.level==='hanshin-platform').map(a=>a.outline),
    ...hanshinStation.layout.platforms.map(p=>[
      platformPoint(p,-p.length/2,-p.width/2),platformPoint(p,p.length/2,-p.width/2),
      platformPoint(p,p.length/2,p.width/2),platformPoint(p,-p.length/2,p.width/2)])];
  for(const segment of metro.segments)for(const {point}of sampleRailSegment(metro,segment,80))for(const ring of rings){
    assert(!pointInPolygon(point,ring));
    for(let i=0;i<ring.length;i++){
      const a=ring[i]!,b=ring[(i+1)%ring.length]!,dx=b.x-a.x,dz=b.z-a.z;
      const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/(dx*dx+dz*dz)));
      assert(Math.hypot(point.x-a.x-t*dx,point.z-a.z-t*dz)>6,'leave space for track bed and road-side separation');
    }
  }
  for(const p of hanshinStation.layout.platforms)assert(p.length<70&&p.width<=6.4);
});

test('east gate has a double public escalator and stairs to B1, with a separate South Exit bank',()=>{
  const ids=['east-public-escalators','east-public-stairs','south-public-escalator','south-public-stairs'];
  const openings=planFloorOpenings(hanshinStation.layout.connections,levels,layout.platforms);
  for(const id of ids){
    const c=hanshinStation.layout.connections.find(c=>c.id===`hanshin-umeda-${id}`)!;
    assert.equal(c.from.level,'hanshin-platform');assert.equal(c.to.level,'hanshin-hall');assert.equal(c.platformId,undefined);
    assert.equal(c.from.elevationOffset,undefined);assert.equal(c.to.elevationOffset,undefined);
    assert(c.evidence.urls!.some(url=>url.includes('city.osaka')));
    assert.equal(openings.filter(o=>o.connectionId===c.id&&o.level==='hanshin-hall').length,c.lanes??1);
    for(const lane of connectionLanes(c))for(const p of [lane.from,lane.to])assert(
      hanshinStation.layout.areas.some(a=>a.kind==='public'&&a.level===p.level&&pointInPolygon(p,a.outline)),'each public bank landing stays outside paid floors');
  }
  assert.equal(hanshinStation.layout.connections.find(c=>c.id==='hanshin-umeda-east-public-escalators')!.lanes,2);
});

test('Hanshin eastern main exit has flanking escalators, a wide split stair and an expanded gate gap',()=>{
  const bank=hanshinStation.layout.connections.find(c=>c.id==='hanshin-umeda-east-public-escalators')!,
    stairs=hanshinStation.layout.connections.find(c=>c.id==='hanshin-umeda-east-public-stairs')!;
  const p=hanshinStation.layout.platforms[0]!,lanes=connectionLanes(bank);
  const from=platformLocalPoint(p,stairs.from),to=platformLocalPoint(p,stairs.to);
  assert(to.x<from.x&&Math.abs(to.z-from.z)<1e-6,'main exit extends beyond the east terminal, not toward its north side');
  const offsets=lanes.map(l=>platformLocalPoint(p,l.from).z-from.z);
  assert(offsets[0]!*offsets[1]!<0&&Math.min(...offsets.map(Math.abs))>stairs.width!/2+1.15);
  const model=new VerticalConnectionModel(stairs,levels,layout.platforms);
  for(const explode of [0,0.48,1]){
    model.update(id=>displayElevation(levels,id,explode),'hanshin-platform');
    const landing=model.group.getObjectByName('intermediate-stair-landing') as T.Mesh;
    assert(landing&&landing.visible);assert.equal(landing.scale.x,2.2);
    assert(landing.position.y>0&&Number.isFinite(landing.position.y));
  }
  const gate=hanshinStation.facilities.find(f=>f.id==='hanshin-umeda-east-gate')!;
  assert.equal(gate.gateCount,12);
  const boundary=planGateBoundaries(hanshinStation.facilities,hanshinStation.layout.areas).find(b=>b.gateId===gate.id)!;
  for(const fence of boundary.fences)for(const end of [fence.from,fence.to])assert(Math.hypot(end.x-boundary.center.x,end.z-boundary.center.z)>10);
});

test('Hanshin B1 gates occupy opposite ends of the western paid half and the central public corridor stays clear',()=>{
  const paid=hanshinStation.layout.areas.find(a=>a.id==='hanshin-umeda-hall-paid')!,p=hanshinStation.layout.platforms[0]!;
  assert(paid.outline.every(v=>platformLocalPoint(p,v).x>0));
  const gates=hanshinStation.facilities.filter(f=>f.kind==='gate'&&f.level==='hanshin-hall').map(f=>platformLocalPoint(p,f));
  assert(Math.abs(gates[0]!.z-gates[1]!.z)<1e-6);assert(Math.abs(gates[0]!.x-gates[1]!.x)>25);
  const publicFloor=hanshinStation.layout.areas.find(a=>a.id==='hanshin-umeda-central-public')!;
  assert.equal(polygonClipping.intersection([publicFloor.outline.map(v=>[v.x,v.z] as [number,number])],[paid.outline.map(v=>[v.x,v.z] as [number,number])]).length,0);
  for(const c of hanshinStation.layout.connections.filter(c=>c.platformId&&c.kind!=='elevator')){
    assert(platformLocalPoint(p,c.to).x>platformLocalPoint(p,c.from).x,'all internal stairs and escalators ascend westward');
    assert(pointInPolygon(c.to,paid.outline));
  }
});

test('Hanshin preview crosses its own gate and escalator while station focus and facility directory include it',()=>{
  const session=new MapSession(edges);session.focusStation('hanshin-umeda');assert.equal(session.state.level,'hanshin-hall');
  const route=findRoute(edges,'hanshin-umeda-route-entry','hanshin-umeda-destination',true)!;
  assert(route&&route.every(id=>id.startsWith('hanshin-umeda')));
  assert.equal(findRoute(edges,'hanshin-umeda-route-entry','destination',true),null);
  assert(facilities.some(f=>f.id==='hanshin-umeda-east-gate'));
  assert(facilities.filter(f=>f.level.startsWith('hanshin-')).every(f=>f.evidence.source==='hanshin'));
});
