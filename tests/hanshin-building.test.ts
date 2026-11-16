import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {layout,levels} from '../src/infrastructure/umeda-map.ts';
import {pointInPolygon,closestPolygonPoint} from '../src/domain/map/geometry.ts';
import {buildCommercialMassing} from '../src/presentation/commercial-massing-model.ts';
import {buildCommercialFloor} from '../src/presentation/commercial-building-model.ts';
import {explorationElevation} from '../src/application/exploration-level.ts';

test('Hanshin retail podium and offset office tower share an L-shaped host footprint',()=>{
  const b=layout.buildings.find(b=>b.id==='hanshin-dept')!;
  assert(b.outline.length>=12);assert.equal(b.volumes!.length,1);
  assert(b.evidence.urls!.includes('https://www.openstreetmap.org/way/502411898'));
  const tower=b.volumes![0]!;
  assert(tower.outline.every(p=>pointInPolygon(p,b.outline)||Math.hypot(closestPolygonPoint(p,b.outline).x-p.x,closestPolygonPoint(p,b.outline).z-p.z)<0.01));
  assert(Math.min(...tower.outline.map(p=>p.x))>Math.min(...b.outline.map(p=>p.x))+20,'tower stays on the eastern wing, leaving the western podium low');
  const group=buildCommercialMassing(b,{areas:layout.areas,passages:layout.passages});
  for(const name of ['podium','tower-envelope','hanshin-facade-glazing','hanshin-facade-fins','hanshin-podium-planter-bands'])assert(group.getObjectByName(name));
  group.traverse(o=>{if(o instanceof T.Mesh)assert([...o.geometry.getAttribute('position').array].every(Number.isFinite));});
});

test('Hanshin commercial portals replace the former deck stub and stay open on B1, ground and 2F',()=>{
  const b=layout.buildings.find(b=>b.id==='hanshin-dept')!;
  const bridge=layout.passages.find(p=>p.id==='hanshin-dept-deck-reserve')!;
  assert.equal(bridge.points.at(-1)!.buildingId,b.id);
  assert.equal(explorationElevation(levels.find(l=>l.id===bridge.points.at(-1)!.level)!),8);
  for(const floor of b.floors){
    const doors=layout.passages.flatMap(p=>p.points.filter(v=>v.buildingId===b.id&&v.level===floor.level));
    assert(doors.length>0,`${floor.name}: missing public entry`);
    const model=buildCommercialFloor(b,floor,layout.passages,{areas:layout.areas,levels,passages:layout.passages});model.updateMatrixWorld(true);
    for(const door of doors){
      const q=closestPolygonPoint(door,b.outline);assert(Math.hypot(q.x-door.x,q.z-door.z)<1e-6);
      const hits=new T.Raycaster(new T.Vector3(door.x,5,door.z),new T.Vector3(0,-1,0)).intersectObject(model,true);
      assert(!hits.some(h=>h.point.y>0.7),'wall or coping seals the public connection');
    }
  }
});
