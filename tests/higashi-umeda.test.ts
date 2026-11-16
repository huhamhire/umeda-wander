import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {higashiStation} from '../src/infrastructure/higashi-umeda-map.ts';
import {layout,levels,facilities,edges,stations} from '../src/infrastructure/umeda-map.ts';
import {platformLocalPoint,pointInPolygon} from '../src/domain/map/geometry.ts';
import {platformRail} from '../src/domain/map/rail-geometry.ts';
import {planGateBoundaries} from '../src/application/gate-boundaries.ts';
import {planFloorOpenings} from '../src/application/connection-openings.ts';
import {connectionLanes} from '../src/application/connection-lanes.ts';
import {displayElevation} from '../src/application/display-elevation.ts';
import {VerticalConnectionModel} from '../src/presentation/vertical-connection-model.ts';
import {MapSession} from '../src/application/map-session.ts';
import {findRoute} from '../src/domain/navigation/find-route.ts';
import {districtFrame,districtPlacements} from '../src/infrastructure/district-placement.ts';

test('T20 has two side platforms with tracks between them and four independent gate boundaries',()=>{
  assert(stations.some(s=>s.id==='higashi-umeda'));
  const ps=higashiStation.layout.platforms;assert.equal(ps.length,2);assert.deepEqual(ps.flatMap(p=>p.tracks),[1,2]);
  for(const p of ps){
    assert.equal(p.tracks.length,1);assert.equal(p.screenDoors,'half-height');
    const r=platformRail(p,0);assert(Math.abs(platformLocalPoint(p,r.start).z)>p.width/2);
    assert(Math.hypot((r.start.x+r.end.x)/2-districtPlacements.higashi.origin.x,
      (r.start.z+r.end.z)/2-districtPlacements.higashi.origin.z)<3,'rail must be on the inward platform edge');
  }
  assert.equal(planGateBoundaries(higashiStation.facilities,higashiStation.layout.areas).length,4);
  assert.equal(higashiStation.facilities.filter(f=>f.kind==='gate').length,4);
  assert(higashiStation.facilities.every(f=>f.evidence.source==='tanimachi'&&f.evidence.pages[0]===1));
});

test('T20 landing nodes are supported, vertical equipment follows each platform and upper openings include every flight',()=>{
  const {areas,platforms,connections}=higashiStation.layout;
  for(const p of higashiStation.nodes)assert(areas.some(a=>a.level===p.level&&pointInPolygon(p,a.outline))||platforms.some(a=>{
    const q=platformLocalPoint(a,p);return a.level===p.level&&Math.abs(q.x)<=a.length/2&&Math.abs(q.z)<=a.width/2;
  }),`${p.id}: unsupported landing`);
  const cuts=planFloorOpenings(connections,levels,platforms);
  for(const c of connections){
    assert.equal(cuts.filter(o=>o.connectionId===c.id&&o.level===c.to.level).length,connectionLanes(c).length);
    if(c.platformId){
      const p=platforms.find(p=>p.id===c.platformId)!,a=platformLocalPoint(p,c.from),b=platformLocalPoint(p,c.to);
      assert(Math.abs(a.z-b.z)<1e-6);
      for(const cut of cuts.filter(o=>o.connectionId===c.id&&o.level==='t20-hall'))for(const p of cut.outline)
        assert(areas.some(a=>a.level==='t20-hall'&&a.kind==='paid'&&pointInPolygon(p,a.outline)),'paid equipment opening must not spill across the gate fence');
    }
    const model=new VerticalConnectionModel(c,levels,platforms);
    for(const explode of [0,0.48,1]){
      model.update(id=>displayElevation(levels,id,explode),'t20-platform');
      assert.equal(model.group.visible,c.from.level==='t20-platform');
      model.group.traverse(o=>{if(o instanceof T.Mesh)assert(o.geometry.getAttribute('position').array.every(Number.isFinite));});
    }
  }
});

test('T20 platform lifts serve the south and central-west gates; source exits remain separately selectable',()=>{
  const lifts=higashiStation.layout.connections.filter(c=>c.platformId&&c.kind==='elevator');
  assert.deepEqual(lifts.map(c=>c.platformId),['higashi-umeda-platform-1','higashi-umeda-platform-2']);
  assert(lifts[0]!.id.includes('south'));assert(lifts[1]!.id.includes('middle-west'));
  for(const number of [1,2,3,4,6,7,8,9])assert(facilities.some(f=>f.id===`higashi-umeda-exit-${number}`));
  assert(!facilities.some(f=>f.id==='higashi-umeda-exit-5'));
  const session=new MapSession(edges);session.focusStation('higashi-umeda');assert.equal(session.state.level,'t20-hall');
  const route=findRoute(edges,'higashi-umeda-route-entry','higashi-umeda-destination',true)!;
  assert(route?.every(id=>id.startsWith('higashi-umeda')));
  assert.equal(findRoute(edges,'higashi-umeda-route-entry','metro-umeda-destination',true),null);
});

test('T20 sits east of M16 and its Whity connector stays public at B1',()=>{
  const east=districtFrame.bearingDeg*Math.PI/180,a=districtPlacements.higashi.origin,b=districtPlacements.metro.origin;
  assert((a.x-b.x)*Math.sin(east)+(a.z-b.z)*Math.cos(east)>35);
  const link=layout.passages.find(p=>p.id==='whity-metro-t20-public')!;
  assert.equal(link.points[0]!.level,'metro-hall');assert.equal(link.points.at(-1)!.level,'t20-hall');
  assert.equal(link.kind,'underground');assert.equal(link.evidence.source,'tanimachi');
  for(const p of link.points)assert(layout.areas.some(a=>levels.find(l=>l.id===a.level)!.y===-8&&a.kind==='public'&&pointInPolygon(p,a.outline)&&!a.holes?.some(h=>pointInPolygon(p,h))));
});
