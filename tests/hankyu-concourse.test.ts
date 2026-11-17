import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {layout,levels} from '../deprecated/infrastructure/umeda-map.ts';
import {pointInPolygon} from '../src/domain/map/geometry.ts';
import {planAtriumOpenings} from '../src/application/atrium-openings.ts';
import {buildCommercialFloor} from '../src/presentation/commercial-building-model.ts';
import {buildCommercialConcourse} from '../src/presentation/commercial-concourse-model.ts';
import {viewLayerRole} from '../src/application/view-layer.ts';

test('Hankyu 1F public concourses cross between two distinct building outlines and reach JR outside the gates',()=>{
  const [ns,ew]=layout.concourses;assert(ns&&ew);
  assert.equal(ns.level,'concourse');assert.equal(ew.level,'concourse');
  assert(ns.height>ew.height);assert(ns.evidence.urls?.some(u=>u.includes('ER201209194N1')));
  assert(layout.buildings.some(b=>b.id==='hankyu-grand'));
  const a=layout.areas.find(a=>a.id==='jr-hankyu-ground-approach')!;
  assert.equal(a.kind,'public');assert.equal(a.level,'concourse');
  assert(pointInPolygon({x:53,z:4},a.outline));assert(pointInPolygon(ew.axis[0],a.outline));
  assert(pointInPolygon(ns.axis[0],ew.outline),'north–south hall must meet east–west concourse');
  for(const t of [0.05,0.25,0.5,0.75,0.95]){
    const p={x:ns.axis[0].x+(ns.axis[1].x-ns.axis[0].x)*t,z:ns.axis[0].z+(ns.axis[1].z-ns.axis[0].z)*t};
    assert(layout.areas.some(a=>a.kind==='public'&&a.level==='concourse'&&pointInPolygon(p,a.outline)));
  }
  assert.equal(viewLayerRole(levels,{level:'concourse'},ns.level),'current');
  assert.equal(viewLayerRole(levels,{level:'underground-hall'},ns.level),'hidden');
});

test('the tall 1F hall cuts the real 2F retail slab while the east–west upper passage remains intact',()=>{
  const ns=layout.concourses[0]!,building=layout.buildings.find(b=>b.id==='hankyu-dept')!,floor=building.floors.find(f=>f.name==='2F')!;
  const cuts=planAtriumOpenings(layout.atria);
  assert(cuts.some(c=>c.connectionId==='hankyu-concourse-void'&&c.level===floor.level));
  assert(!cuts.some(c=>c.connectionId==='hankyu-concourse-void'&&c.level==='concourse'));
  const p={x:(ns.axis[0].x+ns.axis[1].x)/2,z:(ns.axis[0].z+ns.axis[1].z)/2};
  const raw=buildCommercialFloor(building,floor,layout.passages),cut=buildCommercialFloor(building,floor,layout.passages,undefined,cuts);
  raw.updateMatrixWorld(true);cut.updateMatrixWorld(true);
  const ray=new T.Raycaster(new T.Vector3(p.x,10,p.z),new T.Vector3(0,-1,0));
  assert(ray.intersectObject(raw.getObjectByName('building-footprint')!).length>0);
  assert.equal(ray.intersectObject(cut.getObjectByName('building-footprint')!).length,0);
});

test('arched concourse geometry is finite and its walking centerline is unobstructed',()=>{
  for(const hall of layout.concourses){
    const model=buildCommercialConcourse(hall);model.updateMatrixWorld(true);
    model.traverse(o=>{if(o instanceof T.Mesh)assert(o.geometry.getAttribute('position').array.every(Number.isFinite));});
    const [a,b]=hall.axis,dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
    const ray=new T.Raycaster(new T.Vector3(a.x+dx/length,1.8,a.z+dz/length),new T.Vector3(dx/length,0,dz/length),0,length-2);
    assert.equal(ray.intersectObject(model,true).length,0,'facade or paving blocks public walking axis');
    assert(model.getObjectByName('concourse-paving'));assert(model.getObjectByName('open-ceiling-beam'));
    if(hall.height>4){assert(model.getObjectByName('arched-facade'));assert(model.getObjectByName('warm-display-window'));}
  }
});
