import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {layout,levels} from '../deprecated/infrastructure/umeda-map.ts';
import {pointInPolygon} from '../src/domain/map/geometry.ts';
import {buildCommercialMassing} from '../src/presentation/commercial-massing-model.ts';
import {buildCommercialFloor} from '../src/presentation/commercial-building-model.ts';
import {planAtriumOpenings} from '../src/application/atrium-openings.ts';
import {planFloorOpenings} from '../src/application/connection-openings.ts';
import {visibleElevatorConnections} from '../src/application/elevator-visibility.ts';

test('JP Tower has a separate western host and public access at B1, ground and the South Gate deck',()=>{
  const b=layout.buildings.find(b=>b.id==='jp-tower')!,daimaru=layout.buildings.find(b=>b.id==='daimaru')!;
  assert(Math.max(...b.outline.map(p=>p.x))<Math.min(...daimaru.outline.map(p=>p.x))-20);
  assert.deepEqual(b.floors.map(f=>f.name),['B1','1F','2F']);
  const model=buildCommercialMassing(b,{areas:layout.areas,passages:layout.passages});assert(model.getObjectByName('jp-tower-mullions'));
  const deck=layout.passages.find(p=>p.id==='jp-south-gate-deck')!;
  assert.equal(deck.points[0]!.buildingId,'daimaru');assert.equal(deck.points.at(-1)!.buildingId,'jp-tower');
  const underground=layout.passages.find(p=>p.id==='jp-garden-avenue-public')!;
  assert.equal(underground.points.at(-1)!.station,'nishi-umeda');
  for(const c of layout.connections.filter(c=>c.id.startsWith('jp-garden')))for(const p of [c.from,c.to])assert(layout.areas.some(a=>a.level===p.level&&pointInPolygon(p,a.outline)));
  const cuts=planFloorOpenings(layout.connections,levels,layout.platforms);
  for(const c of layout.connections.filter(c=>c.id.startsWith('jp-garden')))assert(cuts.some(o=>o.connectionId===c.id&&o.level===c.to.level));
  const visible=visibleElevatorConnections(layout.connections,levels,'underground-hall');
  assert(visible.has('jp-garden-lift-0')&&visible.has('jp-garden-lift-1'),'B1 exploration retains the full connected garden shaft');
});

test('South Gate curved retreat is a true open edge with the two paired escalators outside it',()=>{
  const a=layout.atria.find(a=>a.id==='south-gate-curved-setback')!,outline=a.openings[0]!.outline;
  assert(pointInPolygon({x:0,z:68},outline));assert(!pointInPolygon({x:0,z:62},outline));
  const daimaru=layout.buildings.find(b=>b.id==='daimaru')!,floor=daimaru.floors.find(f=>f.name==='2F')!;
  const cuts=[...planAtriumOpenings(layout.atria),...planFloorOpenings(layout.connections,levels,layout.platforms)];
  const mesh=buildCommercialFloor(daimaru,floor,layout.passages,{areas:layout.areas,levels,passages:layout.passages},cuts);mesh.updateMatrixWorld(true);
  assert.equal(new T.Raycaster(new T.Vector3(0,10,68),new T.Vector3(0,-1,0)).intersectObject(mesh,true).length,0,'commercial slab must not fill the curved setback');
  const banks=['south-building-61','south-building-74'].map(id=>layout.connections.find(c=>c.id===id)!);
  assert(banks.every(c=>c.lanes===2&&c.from.level==='concourse'&&c.to.level==='south-deck'));
  assert(banks[0]!.to.x<0&&banks[1]!.to.x>0);
  assert(banks.every(c=>!pointInPolygon(c.to,outline)));
});

test('DIAMOR has a circular public junction and curved Life/Hilton branch outside the occupied block',()=>{
  const life=layout.areas.find(a=>a.id==='district-osaka-maru-b1')!;
  assert(life.name.includes('第一生命'));
  const branch=layout.passages.find(p=>p.id==='diamor-daiichi-hilton-curve')!;
  assert(layout.areas.filter(a=>a.kind==='public').some(a=>pointInPolygon(branch.points[0]!,a.outline)&&!a.holes?.some(h=>pointInPolygon(branch.points[0]!,h))));
  for(let i=1;i<branch.points.length;i++){
    const a=branch.points[i-1]!,b=branch.points[i]!;
    assert(!pointInPolygon({x:(a.x+b.x)/2,z:(a.z+b.z)/2},life.outline),'building placeholder must yield to public circulation');
  }
});
