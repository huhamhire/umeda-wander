import {geographicBuildings} from '../src/infrastructure/buildings/index.ts';
import {buildGeographicBuilding} from '../src/presentation/models/geographic-building-model.ts';
import {planGateBoundaries} from '../src/application/gate-boundaries.ts';
import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import * as T from 'three';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {layout,levels,facilities,nodes,edges,geographicOsmData} from '../src/infrastructure/district/geographic-map.ts';
import {buildGeographicContext} from '../src/presentation/geographic-context.ts';
import {planFloorOpenings} from '../src/application/connection-openings.ts';
import {VerticalConnectionModel} from '../src/presentation/vertical-connection-model.ts';
import {buildFloorGeometry} from '../src/presentation/floor-geometry.ts';
test('runtime geographic scene has finite ground, floors, openings and all cross-floor models',()=>{
 assert.equal(layout.geographic,true);
 const context=buildGeographicContext();
 for(const group of Object.values(context)){assert.ok(group.children.length);group.traverse(o=>{
  const mesh=o as import('three').Mesh;
  if(mesh.geometry)for(const v of mesh.geometry.getAttribute('position').array)assert.ok(Number.isFinite(v));
 });}
 const openings=planFloorOpenings(layout.connections,levels,layout.platforms);
 for(const area of layout.areas){const g=buildFloorGeometry(area.outline,[...area.holes??[],...openings.filter(o=>o.level===area.level).map(o=>o.outline)],.55);
  for(const v of g.getAttribute('position')?.array??[])assert.ok(Number.isFinite(v));}
 for(const c of layout.connections)assert.doesNotThrow(()=>new VerticalConnectionModel(c,levels,layout.platforms),c.id);
 const ids=new Set(nodes.map(n=>n.id));for(const e of edges)assert.ok(ids.has(e.from)&&ids.has(e.to));
 assert.equal(new Set(facilities.map(f=>f.id)).size,facilities.length);
 assert.ok(geographicOsmData().ground.length);
});

test('geographic runtime builds the actual station scene including gate fences',async()=>{
 await mkdir('build/tests',{recursive:true});
 await build({entryPoints:['src/presentation/map-scene.ts'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:'build/tests/map-scene.mjs'});
 const {MapScene}=await import(pathToFileURL(resolve('build/tests/map-scene.mjs')).href);
 const scene=Object.create(MapScene.prototype);
 const openings=planFloorOpenings(layout.connections,levels,layout.platforms);
 Object.assign(scene,{layout,levels,facilities,openings,gateBoundaries:planGateBoundaries(facilities,layout.areas),
  scene:new T.Scene(),base:new T.Group(),roof:new T.Group(),groups:new Map(),materials:new Map(),
  commercialMassing:[],publicPassages:[],connectors:[],pickables:[],labels:[],
  renderer:{capabilities:{getMaxAnisotropy:()=>1}},label:()=>{}});
 assert.doesNotThrow(()=>Reflect.get(scene,'buildStation').call(scene));
});

test('geographic commercial exteriors separate podiums and towers with finite metre heights',()=>{
 assert.equal(geographicBuildings.length,10);
 for(const b of geographicBuildings){
  assert.ok(b.volumes.length);
  for(const v of b.volumes){assert.ok(v.top>v.base&&v.top<=200);assert.ok(v.outline.length>=4);assert.ok(v.source.startsWith('https://www.openstreetmap.org/'));}
  const model=buildGeographicBuilding(b);
  model.traverse(o=>{const mesh=o as T.Mesh;if(mesh.geometry)for(const v of mesh.geometry.getAttribute('position').array)assert.ok(Number.isFinite(v));});
 }
 const gf=geographicBuildings.find(b=>b.id==='grand-front-south')!;
 assert.equal(gf.volumes[1]!.top,166);assert.equal(gf.volumes[1]!.base,40);
});
