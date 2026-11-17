import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createGeographicStation,createGeographicStations,geographicStationIds} from '../src/infrastructure/district/geographic-stations.ts';
import {layout,levels,publicInterfaces,publicInterfaceBindings} from '../src/infrastructure/district/geographic-map.ts';
import {pointInPolygon,platformLocalPoint} from '../src/domain/map/geometry.ts';
import {planFloorOpenings} from '../src/application/connection-openings.ts';
import {buildFloorGeometry} from '../src/presentation/floor-geometry.ts';
import {bindPublicInterfaces} from '../src/application/public-interface-bindings.ts';
import {geographicBuildings} from '../src/infrastructure/buildings/index.ts';
import {buildGeographicBuilding} from '../src/presentation/models/geographic-building-model.ts';

test('each of seven station blocks can be built independently, without cross-station level or route references',()=>{
  const all=createGeographicStations();
  for(const [i,id] of geographicStationIds.entries()){
    const station=createGeographicStation(id);assert.deepEqual(station,all[i]);
    const ownLevels=new Set(station.levels.map(l=>l.id)),nodes=new Set(station.nodes.map(n=>n.id));
    assert.equal(nodes.size,station.nodes.length,id+' duplicate nodes');
    assert.ok(station.levels.every(l=>l.station===id));
    for(const edge of station.edges)assert.ok(nodes.has(edge.from)&&nodes.has(edge.to),id+' route ownership');
    for(const c of station.layout.connections){assert.ok(ownLevels.has(c.from.level)&&ownLevels.has(c.to.level));
      for(const n of [c.from,c.to]){const canonical=station.nodes.find(p=>p.id===n.id);if(canonical)assert.deepEqual(canonical,n,c.id+' stale node');}}
  }
});

test('all equipment landings lie on their own station floor/platform or a same-height shared public floor',()=>{
  for(const c of layout.connections){
    for(const n of [c.from,c.to]){
      const y=levels.find(l=>l.id===n.level)!.y+(n.elevationOffset??0);
      const floor=layout.areas.some(a=>(a.level===n.level||a.kind==='public'&&(c.blockId!==undefined||a.blockId!==undefined))&&
        Math.abs(levels.find(l=>l.id===a.level)!.y+(a.elevationOffset??0)-y)<.01&&
        pointInPolygon(n,a.outline)&&!a.holes?.some(h=>pointInPolygon(n,h)));
      const platform=layout.platforms.some(p=>{const local=platformLocalPoint(p,n);return p.level===n.level&&Math.abs(local.x)<=p.length/2+.001&&Math.abs(local.z)<=p.width/2+.001;});
      assert.ok(floor||platform,c.id+' unsupported '+n.level);
    }
    if(c.kind==='elevator')assert.ok(Math.hypot(c.from.x-c.to.x,c.from.z-c.to.z)<.001,c.id+' inclined shaft');
  }
});

test('every B1 gate exposes a stable outward public interface bound at the shared display elevation',()=>{
  const ports=publicInterfaces.filter(p=>p.elevation===-8);
  assert.equal(ports.length,16);assert.equal(publicInterfaceBindings.length,ports.length);
  assert.equal(new Set(publicInterfaces.map(p=>p.id)).size,publicInterfaces.length);
  for(const p of ports){
    assert.ok(layout.areas.some(a=>a.level===p.level&&a.kind==='paid'&&pointInPolygon(p.inside,a.outline)),p.id+' inside');
    assert.ok(!layout.areas.some(a=>a.level===p.level&&a.kind==='paid'&&pointInPolygon(p.outside,a.outline)),p.id+' outside');
    assert.equal(publicInterfaceBindings.find(b=>b.interfaceId===p.id)!.elevation,-8);
  }
  assert.throws(()=>bindPublicInterfaces(ports,[],levels),/no same-height landing/);
});

test('shared B1 cuts openings for non-JR public stairs and street lift, with real holes in the mesh',()=>{
  const openings=planFloorOpenings(layout.connections,levels,layout.platforms);
  for(const id of ['hanshin-umeda-east-public-stairs','higashi-umeda-street-lift','nishi-umeda-street-lift']){
    const cut=openings.find(o=>o.level==='district-underground'&&o.connectionId===id);assert.ok(cut,id);
    const center=cut.outline.reduce((p,q)=>({x:p.x+q.x/cut.outline.length,z:p.z+q.z/cut.outline.length}),{x:0,z:0});
    const area=layout.areas.find(a=>a.level==='district-underground'&&pointInPolygon(center,a.outline)&&!a.holes?.some(h=>pointInPolygon(center,h)));assert.ok(area,id+' aperture outside floor');
    const geometry=buildFloorGeometry(area.outline,[...area.holes??[],...openings.filter(o=>o.level===area.level).map(o=>o.outline)],.55,0);
    const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld();
    assert.equal(new T.Raycaster(new T.Vector3(center.x,5,center.z),new T.Vector3(0,-1,0),0,10).intersectObject(mesh).length,0,id+' sealed hole');
    geometry.dispose();
  }
});

test('JR retains three Central Court to Crost flights separately from the paid west link',()=>{
  for(const id of ['crost-67','crost-stairs-68','crost-stairs-69']){
    const c=layout.connections.find(c=>c.id===id);assert.ok(c,id);
    assert.deepEqual(new Set([c.from.level,c.to.level]),new Set(['concourse','underground-hall']));
    const lower=c.from.level==='underground-hall'?c.from:c.to;
    assert.ok(layout.areas.some(a=>a.level==='district-underground'&&pointInPolygon(lower,a.outline)));
  }
});

test('Yodobashi has an open exterior gallery around its inward retail podium',()=>{
  const b=geographicBuildings.find(b=>b.id==='yodobashi')!,g=b.galleries![0]!;
  const model=buildGeographicBuilding(b);assert.ok(!model.getObjectByName('building-gallery'),'gallery must be owned by the public deck');
  const center=g.innerOutline.reduce((s,p)=>({x:s.x+p.x/g.innerOutline.length,z:s.z+p.z/g.innerOutline.length}),{x:0,z:0});
  assert.ok(!layout.areas.some(a=>a.blockId==='north-decks'&&pointInPolygon(center,a.outline)&&!a.holes?.some(h=>pointInPolygon(center,h))),'gallery fills retail interior');
  assert.equal(g.y,8);assert.ok(g.innerOutline.every(p=>pointInPolygon(p,g.outline)));
  const edge=g.outline[0]!,inner=g.innerOutline[0]!,p={x:(edge.x+inner.x)/2,z:(edge.z+inner.z)/2};
  assert.ok(!pointInPolygon(p,b.volumes[0]!.outline),'podium blocks the gallery');
});
