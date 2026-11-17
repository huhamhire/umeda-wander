import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import polygonClipping from 'polygon-clipping';
import {layout,levels} from '../deprecated/infrastructure/umeda-map.ts';
import {pointInPolygon} from '../src/domain/map/geometry.ts';
import {planFloorOpenings} from '../src/application/connection-openings.ts';
import {connectionLanes} from '../src/application/connection-lanes.ts';
import {buildCommercialFloor} from '../src/presentation/commercial-building-model.ts';

test('Umekita public corridor joints share exact edges without overlapping caps',()=>{
  const slabs=['north-b1-public','public-b1-connector','umekita-east-link'].map(id=>layout.areas.find(a=>a.id===id)!);
  for(let i=1;i<slabs.length;i++){
    const before=slabs[i-1]!.outline,after=slabs[i]!.outline;
    assert.deepEqual(before[1],after[0]);assert.deepEqual(before[2],after[3]);
    const ring=(points:typeof before)=>points.map(p=>[p.x,p.z] as [number,number]);
    assert.equal(polygonClipping.intersection([ring(before)],[ring(after)]).length,0,'joint has no overlapping flap');
  }
});

test('LUCUA west bridge reaches only a public 2F landing and upper office volume stays on its podium',()=>{
  const bridge=layout.passages.find(p=>p.id==='lucua-1100-umekita-deck')!;
  assert.equal(bridge.points[0]!.buildingId,'lucua-1100');
  assert(bridge.points.every(p=>p.level==='platform'));
  const landing=layout.areas.find(a=>a.id==='umekita-upper-deck-landing')!;
  assert.equal(landing.kind,'public');assert(pointInPolygon(bridge.points.at(-1)!,landing.outline));
  assert(bridge.evidence.urls?.includes('https://umekita-greenplace.com/special/'));
  assert(!layout.buildings.some(b=>String(b.id).includes('green-place')));
  for(const id of ['lucua','lucua-1100'])assert(layout.buildings.find(b=>b.id===id)!.podiumHeight!>0);
  const building=layout.buildings.find(b=>b.id==='lucua-1100')!,tower=building.volumes![0]!;
  assert(tower.evidence.urls?.some(url=>url.includes('494976863')));
  for(const p of tower.outline)assert(pointInPolygon(p,building.outline));
});

test('both south plaza escalator banks retain paired lanes and cut through the commercial 2F slab',()=>{
  const openings=planFloorOpenings(layout.connections,levels,layout.platforms);
  const building=layout.buildings.find(b=>b.id==='daimaru')!,floor=building.floors.find(f=>f.name==='2F')!;
  const uncut=buildCommercialFloor(building,floor,layout.passages).getObjectByName('building-footprint')!;
  const cut=buildCommercialFloor(building,floor,layout.passages,undefined,openings).getObjectByName('building-footprint')!;
  uncut.updateMatrixWorld(true);cut.updateMatrixWorld(true);
  for(const id of ['south-building-61','south-building-74']){
    const bank=layout.connections.find(c=>c.id===id)!;
    assert.equal(bank.lanes,2);assert.equal(bank.from.level,'concourse');assert.equal(bank.to.level,'south-deck');
    assert(layout.areas.some(a=>a.kind==='public'&&a.level===bank.from.level&&pointInPolygon(bank.from,a.outline)));
    assert(layout.areas.some(a=>a.kind==='public'&&a.level===bank.to.level&&pointInPolygon(bank.to,a.outline)));
    const holes=openings.filter(o=>o.connectionId===id&&o.level===floor.level);assert.equal(holes.length,2);
    for(const [i,hole] of holes.entries()){
      const lane=connectionLanes(bank)[i]!;
      // Cross-section just downhill from the upper landing, inside the real well.
      const p={x:lane.to.x+(lane.from.x-lane.to.x)*0.25,z:lane.to.z+(lane.from.z-lane.to.z)*0.25};
      assert(pointInPolygon(p,hole.outline));
      const ray=new T.Raycaster(new T.Vector3(p.x,5,p.z),new T.Vector3(0,-1,0));
      assert(ray.intersectObject(uncut).length>0,`${id}: test must cross the commercial floor`);
      assert.equal(ray.intersectObject(cut).length,0,`${id}: commercial slab covers the escalator well`);
    }
  }
});
