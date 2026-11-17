import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import polygonClipping from 'polygon-clipping';
import {planUndergroundSpace} from '../src/application/underground-space.ts';
import {describeStationSite,stationPublicPortal} from '../src/application/station-site.ts';
import {pointInPolygon,closestPolygonPoint} from '../src/domain/map/geometry.ts';
import {stationMaps} from '../deprecated/infrastructure/station-maps.ts';
import {layout,levels} from '../deprecated/infrastructure/umeda-map.ts';
import {stationSites} from '../deprecated/infrastructure/southern-underground.ts';
import {buildFloorGeometry} from '../src/presentation/floor-geometry.ts';
import {buildCommercialFloor} from '../src/presentation/commercial-building-model.ts';
import {projectWalkwayReference} from '../src/infrastructure/district-placement.ts';
import type {PlanRegion,Point2} from '../src/domain/map/model.ts';

const contains=(r:PlanRegion,p:Point2)=>pointInPolygon(p,r.outline)&&!r.holes?.some(h=>pointInPolygon(p,h));
const polygon=(r:PlanRegion)=>[r.outline,...r.holes??[]].map(ring=>ring.map(p=>[p.x,p.z] as [number,number]));
const area=(polygons:polygonClipping.MultiPolygon)=>polygons.reduce((total,p)=>total+p.reduce((sum,r,i)=>{
  const signed=Math.abs(r.reduce((n,a,j)=>{const b=r[(j+1)%r.length]!;return n+a[0]*b[1]-b[0]*a[1];},0))/2;
  return sum+(i===0?signed:-signed);
},0),0);

test('underground floors union tapered sections and chambers while preserving occupied holes',()=>{
  const result=planUndergroundSpace({id:'sample',name:'sample',level:'kitashinchi-hall',evidence:{source:'district',pages:[1],detail:'test'},
    sections:[{points:[{x:0,z:0},{x:10,z:0}],widths:[2,8]}],
    chambers:[{outline:[{x:8,z:-5},{x:18,z:-5},{x:18,z:5},{x:8,z:5}]}],
    exclusions:[{outline:[{x:12,z:-1},{x:14,z:-1},{x:14,z:1},{x:12,z:1}]}]});
  assert.equal(result.length,1);const floor=result[0]!;
  assert(contains(floor,{x:1,z:0}));assert(!contains(floor,{x:1,z:2}));assert(contains(floor,{x:9,z:3}));
  assert.equal(floor.holes!.length,1);assert(!contains(floor,{x:13,z:0}));
  const mesh=new T.Mesh(buildFloorGeometry(floor.outline,floor.holes!,0.55),new T.MeshBasicMaterial());mesh.updateMatrixWorld();
  const hits=(p:Point2)=>new T.Raycaster(new T.Vector3(p.x,5,p.z),new T.Vector3(0,-1,0)).intersectObject(mesh);
  assert.equal(hits({x:13,z:0}).length,0);assert(hits({x:16,z:0}).length>0);
  mesh.geometry.dispose();mesh.material.dispose();
});

test('each station exposes independent per-floor occupied envelopes and exterior public portals',()=>{
  assert.equal(stationSites.length,stationMaps.length);
  for(const station of stationMaps){
    const before=JSON.stringify(station),site=describeStationSite(station);
    assert.equal(site.station,station.id);
    assert.deepEqual(site.layers.map(l=>l.level),station.levels.map(l=>l.id));
    assert.equal(JSON.stringify(station),before);
  }
  const hs=stationMaps.find(s=>s.id==='hanshin-umeda')!,region=hs.layout.areas.find(a=>a.id==='hanshin-umeda-department-public')!;
  const start={...region.outline.reduce((p,q)=>({x:p.x+q.x/region.outline.length,z:p.z+q.z/region.outline.length}),{x:0,z:0}),level:region.level};
  const portal=stationPublicPortal(hs,start,{x:start.x,z:start.z+100}),edge=closestPolygonPoint(portal,region.outline);
  assert(Math.hypot(portal.x-edge.x,portal.z-edge.z)<0.001);assert(contains(region,portal));
});

test('assembled underground faces protect station footprints and source-map street junctions',()=>{
  const surfaces=layout.areas.filter(a=>a.id.startsWith('south-underground-excavation'));
  assert(surfaces.length>0&&surfaces.some(a=>a.holes!.length));
  const occupied=stationSites.flatMap(s=>s.layers.filter(l=>levels.find(level=>level.id===l.level)!.y===-8).flatMap(l=>l.regions));
  for(const surface of surfaces)for(const block of occupied)
    assert(area(polygonClipping.intersection(polygon(surface),polygon(block)))<0.001,'external excavation must yield to station perimeters');
  const publicFloors=layout.areas.filter(a=>a.kind==='public'&&levels.find(l=>l.id===a.level)!.y===-8);
  for(const p of layout.passages.filter(p=>p.surfaceId)){
    assert(surfaces.some(a=>a.id.startsWith(p.surfaceId!)));
  }
  for(const [x,z]of [[389,682],[565,680],[638,866],[506,545],[390,468]]){
    const q=projectWalkwayReference(x!,z!);
    assert(publicFloors.some(f=>contains(f,q)),`source-map junction ${x}/${z} must be public`);
  }
  for(const block of layout.areas.filter(a=>a.id.startsWith('district-')&&a.kind==='commercial'))for(const s of surfaces)
    assert(area(polygonClipping.intersection(polygon(block),polygon(s)))<0.001,'street-block infill cannot overlap its public grid');
});

test('commercial basement slabs yield to real public-space polygons rather than cover them',()=>{
  const building=layout.buildings.find(b=>b.id==='hanshin-dept')!,floor=building.floors.find(f=>f.name==='B1')!;
  const model=buildCommercialFloor(building,floor,layout.passages,{areas:layout.areas,levels,passages:layout.passages});model.updateMatrixWorld(true);
  const surface=layout.areas.find(a=>a.id.startsWith('south-underground-excavation')&&polygonClipping.intersection(polygon(a),polygon(building)).length)!;
  const overlap=polygonClipping.intersection(polygon(surface),polygon(building))[0]![0]!;
  const point=overlap.reduce((p,[x,z])=>({x:p.x+x/overlap.length,z:p.z+z/overlap.length}),{x:0,z:0});
  const slab=model.getObjectByName('building-footprint')!;
  assert.equal(new T.Raycaster(new T.Vector3(point.x,5,point.z),new T.Vector3(0,-1,0)).intersectObject(slab).length,0);
});

test('Whity connections follow the public street faces instead of unrendered direct chords',()=>{
  const floors=layout.areas.filter(a=>a.kind==='public'&&levels.find(l=>l.id===a.level)!.y===-8);
  for(const id of ['whity-hankyu-dept-public','whity-hankyu-grand-public','whity-metro-t20-public']){
    const passage=layout.passages.find(p=>p.id===id)!;assert(passage.points.length>=5);
    for(let i=1;i<passage.points.length;i++)for(let j=0;j<=20;j++){
      const a=passage.points[i-1]!,b=passage.points[i]!,q={x:a.x+(b.x-a.x)*j/20,z:a.z+(b.z-a.z)*j/20};
      assert(floors.some(f=>contains(f,q)),`${id}: street face missing at ${i}/${j}`);
    }
  }
});
