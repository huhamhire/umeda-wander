import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {layout,levels,nodes,facilities} from '../src/infrastructure/umeda-map.ts';
import {pointInPolygon} from '../src/domain/map/geometry.ts';
import {planFloorOpenings} from '../src/application/connection-openings.ts';
import {planAtriumOpenings} from '../src/application/atrium-openings.ts';
import {buildFloorGeometry} from '../src/presentation/floor-geometry.ts';

test('North atrium is a shared void with all four bank groups arriving at exterior edges',()=>{
  const wells=planFloorOpenings(layout.connections,levels,layout.platforms),voids=planAtriumOpenings(layout.atria.filter(a=>a.id==='north-atrium-void'));
  assert.equal(voids.length,2);assert(!voids.some(o=>o.level==='concourse'));
  for(const id of ['north-2','north-2-stairs','north-3','north-47','north-48']){
    const c=layout.connections.find(c=>c.id===id)!;
    assert.equal(c.placement,'exterior');assert(!wells.some(o=>o.connectionId===id));
  }
  const floor=layout.areas.find(a=>a.id==='north-2f-public')!;
  const material=new T.MeshBasicMaterial({side:T.DoubleSide});
  const mesh=(cuts:typeof voids)=>{const m=new T.Mesh(buildFloorGeometry(floor.outline,cuts.map(o=>o.outline),0.55),material);m.updateMatrixWorld();return m;};
  const ray=new T.Raycaster(new T.Vector3(0,20,-45),new T.Vector3(0,-1,0));
  assert(ray.intersectObject(mesh([])).length>0);
  assert.equal(ray.intersectObject(mesh(voids.filter(o=>o.level==='platform'))).length,0);
});

test('Umekita public corridor turns around LUCUA 1100 north side without crossing retail or paid areas',()=>{
  const building=layout.buildings.find(b=>b.id==='lucua-1100')!;
  const route=['public-b1-entry','public-b1-turn','public-join','umekita-gate-out'].map(id=>nodes.find(n=>n.id===id)!);
  assert(route[1]!.z<Math.min(...building.outline.map(p=>p.z))-3);
  assert.equal(route[1]!.z,route[2]!.z,'north-side leg stays straight');
  for(let i=1;i<route.length;i++)for(let j=0;j<=100;j++){
    const a=route[i-1]!,b=route[i]!,t=j/100,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
    assert(!pointInPolygon(p,building.outline));
    assert(layout.areas.some(area=>area.level==='underground-hall'&&area.kind==='public'&&pointInPolygon(p,area.outline)));
    assert(!layout.areas.some(area=>area.level==='underground-hall'&&area.kind==='paid'&&pointInPolygon(p,area.outline)));
  }
});

test('South bridge flights are diagonal exterior connections followed by 50/T to the front 2F passage',()=>{
  const a=layout.connections.find(c=>c.id==='south-15')!,b=layout.connections.find(c=>c.id==='south-stairs-16')!;
  for(const c of [a,b]){assert.equal(c.placement,'exterior');assert(c.from.x!==c.to.x&&c.from.z!==c.to.z);}
  const ad=new T.Vector2(a.to.x-a.from.x,a.to.z-a.from.z).normalize(),bd=new T.Vector2(b.to.x-b.from.x,b.to.z-b.from.z).normalize();assert(ad.dot(bd)>0.999);
  const front=layout.areas.find(a=>a.id==='south-building-2f')!;assert.equal(front.level,'south-deck');
  for(const id of ['south-building-50','south-lift-t']){
    const c=layout.connections.find(c=>c.id===id)!;assert.equal(c.from.level,'south-deck');assert(pointInPolygon(c.from,front.outline));
  }
});

test('South exterior bridge arms are straight and collinear through their common junctions',()=>{
  const get=(id:string)=>layout.passages.find(p=>p.id===id)!;
  const spine=get('umeda-deck-spine');assert.equal(spine.points.length,2);
  for(const side of ['north','south']){
    const west=get(`daimaru-deck-${side}-arm`),east=get(`hankyu-dept-deck-${side}-arm`);
    assert.equal(west.points.length,2);assert.equal(east.points.length,2);
    assert.deepEqual(west.points[1],east.points[0]);
    const a=west.points[0]!,j=west.points[1]!,b=east.points[1]!;
    assert(Math.abs((j.x-a.x)*(b.z-a.z)-(j.z-a.z)*(b.x-a.x))<1e-6);
    assert(spine.points.some(p=>p.x===j.x&&p.z===j.z));
  }
  assert(get('hanshin-dept-deck-reserve').points.at(-1)!.boundaryName?.includes('阪神百货'));
  assert.equal(get('grand-front-jr-deck').points.at(-1)!.buildingId,'grand-front-south');
});

test('both convenience stores use compact labels and retain separate source floors and paid status',()=>{
  const stores=facilities.filter(f=>f.kind==='convenience-store');assert.equal(stores.length,2);
  for(const f of stores){assert.equal(f.name,'7-Eleven');assert(f.evidence.pages.length>0);}
  const central=stores.find(f=>f.level==='concourse')!,bridge=stores.find(f=>f.level==='bridge')!;
  assert(!layout.areas.some(a=>a.level===central.level&&a.kind==='paid'&&pointInPolygon(central,a.outline)));
  assert(layout.areas.some(a=>a.level===bridge.level&&a.kind==='paid'&&pointInPolygon(bridge,a.outline)));
});
