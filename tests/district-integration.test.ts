import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {levels,layout,edges} from '../deprecated/infrastructure/umeda-map.ts';
import {districtPlacements,districtFrame} from '../src/infrastructure/district-placement.ts';
import {districtConnections} from '../deprecated/infrastructure/district-links.ts';
import {projectDistrictPoint} from '../src/domain/map/geography.ts';
import {pointInPolygon} from '../src/domain/map/geometry.ts';
import {cameraEnvelope} from '../src/presentation/camera-framing.ts';
import {stationPlinthParts} from '../src/presentation/station-plinth.ts';
import {viewLayerRole} from '../src/application/view-layer.ts';
import {displayElevation} from '../src/application/display-elevation.ts';
import {MapSession} from '../src/application/map-session.ts';
import {planFloorOpenings} from '../src/application/connection-openings.ts';
import {readFileSync} from 'node:fs';
import {metroStation} from '../src/infrastructure/stations/metro-umeda/index.ts';
import {platformPoint} from '../src/domain/map/geometry.ts';
import {platformRail} from '../src/domain/map/rail-geometry.ts';

test('two navigation tabs share station focusing through the facility station dropdown',()=>{
  const html=readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
  assert(!html.includes('station-picker'));assert(!html.includes('data-route='));
  assert.deepEqual([...html.matchAll(/id="(tab-[^"]+)"/g)].map(m=>m[1]),['tab-layers','tab-facilities']);
  assert.equal([...html.matchAll(/id="facility-station"/g)].length,1);
  assert(!html.includes('panel-stations'));assert(!html.includes('data-focus='));
});

test('geographic anchors place Metro near JR east and Hankyu farther north',()=>{
  assert.deepEqual(projectDistrictPoint(districtFrame.origin,districtFrame.origin,districtFrame.bearingDeg,districtFrame.metersPerUnit,districtFrame.anchor),districtFrame.anchor);
  const h=districtPlacements.hankyu,m=districtPlacements.metro;
  assert.deepEqual(h.referenceOrigin,projectDistrictPoint(h.geo,districtFrame.origin,districtFrame.bearingDeg,districtFrame.metersPerUnit,districtFrame.anchor));
  const eastOffset={x:30*Math.sin(districtFrame.bearingDeg*Math.PI/180),z:30*Math.cos(districtFrame.bearingDeg*Math.PI/180)};
  assert(Math.abs(h.displayOffset.x-eastOffset.x-8*Math.cos(h.angle))<1e-6);
  assert(Math.abs(h.displayOffset.z-eastOffset.z-8*Math.sin(h.angle))<1e-6);
  assert.deepEqual(h.origin,{x:h.referenceOrigin.x+h.displayOffset.x,z:h.referenceOrigin.z+h.displayOffset.z});
  assert.deepEqual(m.referenceOrigin,projectDistrictPoint(m.geo,districtFrame.origin,districtFrame.bearingDeg,districtFrame.metersPerUnit,districtFrame.anchor));
  const bearing=districtFrame.bearingDeg*Math.PI/180;
  const roadOffset={x:m.displayOffset.x-30*Math.sin(bearing),z:m.displayOffset.z-30*Math.cos(bearing)};
  assert(Math.abs(roadOffset.x*Math.sin(m.angle)-roadOffset.z*Math.cos(m.angle))<1e-6,'southern fit follows the road axis');
  assert(roadOffset.x*Math.cos(m.angle)+roadOffset.z*Math.sin(m.angle)<-30,'area map places the platform farther south');
  const east=(p:{x:number;z:number})=>p.x*Math.sin(bearing)+p.z*Math.cos(bearing);
  assert(east(m.origin)<east(h.origin),'Metro remains west of Hankyu while sitting east of JR');
  assert(h.origin.x>m.origin.x&&h.origin.z<m.origin.z-40);
  assert(Math.abs((h.angle-m.angle)*180/Math.PI)>4,'distinct measured headings');
});

test('Metro stays east of JR platforms while its north end crosses below the external railway throat',()=>{
  const eastEnd=Math.max(...layout.platforms.filter(p=>p.level==='platform').flatMap(p=>p.tracks.map((_,i)=>platformRail(p,i).end.x)));
  const p=metroStation.layout.platforms[0]!;
  for(const along of [-p.length/2,p.length/2])for(const across of [-p.width/2,p.width/2])
    assert(platformPoint(p,along,across).x>eastEnd,'Metro footprint intrudes into the main JR station body');
  const north=platformPoint(p,p.length/2,0),south=platformPoint(p,-p.length/2,0);
  assert(north.z<0&&south.z>70,'road station spans the eastern throat and the southern commercial district');
});

test('JR east plaza connects directly to both Hankyu and Yodobashi without an intermediate dogleg',()=>{
  const deck=layout.areas.find(a=>a.id==='district-jr-hankyu-deck')!;
  const start={x:(deck.outline[0]!.x+deck.outline[3]!.x)/2,z:(deck.outline[0]!.z+deck.outline[3]!.z)/2};
  const end={x:(deck.outline[1]!.x+deck.outline[2]!.x)/2,z:(deck.outline[1]!.z+deck.outline[2]!.z)/2};
  assert.deepEqual(start,{x:59,z:-44});
  assert(end.x>start.x+40);
  assert(Math.abs(end.z-start.z)/(end.x-start.x)<0.35,'bridge must not become a long northbound diagonal');
  const yodobashi=layout.passages.find(p=>p.id==='yodobashi-east-deck')!;
  assert.equal(yodobashi.points[0]!.x,start.x);assert.equal(yodobashi.points[0]!.z,start.z);
  assert.equal(yodobashi.points.length,2);
  assert(layout.areas.some(a=>a.id==='north-2f-public'&&pointInPolygon(start,a.outline)),'both bridges start on the JR public plaza');
  assert(!layout.areas.some(a=>a.id==='district-jr-yodobashi-junction'),'obsolete kink must not remain as an extra floor plate');
});

test('station focus changes framing while all three station scenes remain visible',()=>{
  const session=new MapSession(edges),initialExplode=session.state.explode;
  const all=cameraEnvelope(layout,levels,session.state,id=>displayElevation(levels,id,initialExplode));
  for(const station of ['jr-osaka','hankyu-umeda','metro-umeda'] as const){
    session.focusStation(station);
    assert.equal(session.state.explode,initialExplode);
    if(station==='metro-umeda'){
      assert.equal(session.state.level,'metro-hall');
      assert.equal(viewLayerRole(levels,session.state,'metro-hall'),'current');
      assert.equal(viewLayerRole(levels,session.state,'metro-intermediate'),'current');
      assert.equal(viewLayerRole(levels,session.state,'metro-platform'),'context');
      assert.equal(viewLayerRole(levels,session.state,'hankyu-platform'),'hidden');
    }else{
      assert.equal(session.state.level,'all');
      for(const level of levels)assert.equal(viewLayerRole(levels,session.state,level.id),'normal');
    }
    const focused=cameraEnvelope(layout,levels,session.state,id=>displayElevation(levels,id,initialExplode));
    assert(focused.length>0&&focused.length<all.length);
    assert(focused.every(p=>p.toArray().every(Number.isFinite)));
  }
  session.focusStation(null);
  assert.equal(cameraEnvelope(layout,levels,session.state,id=>displayElevation(levels,id,initialExplode)).length,all.length);
});

test('underground layer focus preserves lower structures across the shared district',()=>{
  assert.equal(viewLayerRole(levels,{level:'metro-hall',focusStation:'metro-umeda'},'underground-platform'),'context');
  assert.equal(viewLayerRole(levels,{level:'metro-hall'},'hankyu-platform'),'hidden');
  const points=cameraEnvelope(layout,levels,{level:'metro-hall',focusStation:'hankyu-umeda'},id=>displayElevation(levels,id,0.5));
  assert(points.length>0,'framing falls back safely if focused station is above a selected cut plane');
});

test('JR-to-Metro descent joins only public floor footprints',()=>{
  for(const c of districtConnections)for(const end of [c.from,c.to]){
    assert(layout.areas.some(a=>a.level===end.level&&a.kind==='public'&&pointInPolygon(end,a.outline)),end.id);
    assert(!layout.areas.some(a=>a.level===end.level&&a.kind==='paid'&&pointInPolygon(end,a.outline)),`${end.id}: paid shortcut`);
  }
});

test('Metro descent lands on the station JR interface with a continuous public path to the west gate approach',()=>{
  const connection=districtConnections.find(c=>c.id==='district-jr-metro-stairs')!;
  const portal=metroStation.layout.areas.find(a=>a.id==='metro-umeda-jr-interface')!;
  const publicHall=metroStation.layout.areas.find(a=>a.id==='metro-umeda-west-public')!;
  const center=publicHall.outline.reduce((sum,p)=>({x:sum.x+p.x/4,z:sum.z+p.z/4}),{x:0,z:0});
  // Require landing width support, not merely a point somewhere in the station.
  for(const dx of [-2,2])for(const dz of [-2,2])assert(pointInPolygon({x:connection.to.x+dx,z:connection.to.z+dz},portal.outline));
  for(let i=0;i<=100;i++){
    const t=i/100,point={x:connection.to.x*(1-t)+center.x*t,z:connection.to.z*(1-t)+center.z*t};
    assert(metroStation.layout.areas.some(a=>a.level==='metro-hall'&&a.kind==='public'&&pointInPolygon(point,a.outline)));
    assert(!metroStation.layout.areas.some(a=>a.level==='metro-hall'&&a.kind==='paid'&&pointInPolygon(point,a.outline)));
  }
});

test('the Metro descent cuts the ground slab, station base and paving lines',()=>{
  const cuts=planFloorOpenings(layout.connections,levels,layout.platforms);
  const opening=cuts.find(o=>o.connectionId==='district-jr-metro-stairs'&&o.level==='concourse')!;
  assert(opening);
  const center=opening.outline.reduce((sum,p)=>({x:sum.x+p.x/4,z:sum.z+p.z/4}),{x:0,z:0});
  for(const {geometry}of stationPlinthParts(cuts)){
    assert([...geometry.getAttribute('position').array].every(Number.isFinite));
    const material=new T.MeshBasicMaterial({side:T.DoubleSide}),mesh=new T.Mesh(geometry,material);mesh.updateMatrixWorld();
    assert.equal(new T.Raycaster(new T.Vector3(center.x,10,center.z),new T.Vector3(0,-1,0)).intersectObject(mesh).length,0);
    geometry.dispose();material.dispose();
  }
});
