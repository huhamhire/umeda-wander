import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {layout,levels} from '../deprecated/infrastructure/umeda-map.ts';
import {pointInPolygon,closestPolygonPoint} from '../src/domain/map/geometry.ts';
import {buildCommercialMassing} from '../src/presentation/commercial-massing-model.ts';
import {cameraEnvelope} from '../src/presentation/camera-framing.ts';
import {displayElevation} from '../src/application/display-elevation.ts';
import {sampleRailSegment} from '../src/domain/map/rail-geometry.ts';

test('Grand Front sits beside Yodobashi, with shared JR junction and a south-to-north public connection',()=>{
  const south=layout.buildings.find(b=>b.id==='grand-front-south')!,north=layout.buildings.find(b=>b.id==='grand-front-north')!;
  const yodobashi=layout.buildings.find(b=>b.id==='yodobashi')!;
  const gap=Math.min(...south.outline.map(p=>{
    const edge=closestPolygonPoint(p,yodobashi.outline);return Math.hypot(p.x-edge.x,p.z-edge.z);
  }));
  assert(gap>8&&gap<20,'south hall remains close to Yodobashi with an open street between actual outlines');
  for(const platform of layout.platforms.filter(p=>p.level==='underground-platform'))
    assert(!pointInPolygon(platform,south.outline)&&!pointInPolygon(platform,north.outline),'commercial footprint must not sit over Umekita platform centers');
  for(const approach of layout.railApproaches.filter(a=>a.id==='jr-umekita-north'))for(const segment of approach.segments)
    for(const {point}of sampleRailSegment(approach,segment,100)){
      assert(!pointInPolygon(point,south.outline)&&!pointInPolygon(point,north.outline),'Umekita tunnel must remain west of Grand Front');
      for(const building of [south,north]){
        const edge=closestPolygonPoint(point,building.outline);
        assert(Math.hypot(edge.x-point.x,edge.z-point.z)>1.25,'include the ballast width in building clearance');
      }
      // At the same north/south section, the track remains on the west side in geographic coordinates.
      const angle=58.35*Math.PI/180,east=(p:{x:number;z:number})=>p.x*Math.sin(angle)+p.z*Math.cos(angle);
      assert(east(point)<Math.max(...south.outline.map(east)));
    }
  const jr=layout.passages.find(p=>p.id==='grand-front-jr-deck')!,yodo=layout.passages.find(p=>p.id==='yodobashi-west-deck')!;
  assert(yodo.points.some(p=>p.x===jr.points[0]!.x&&p.z===jr.points[0]!.z));
  assert.equal(jr.points.at(-1)!.buildingId,south.id);
  const bridge=layout.passages.find(p=>p.id==='grand-front-north-south-deck')!;
  assert.equal(bridge.points[0]!.buildingId,south.id);assert.equal(bridge.points[1]!.buildingId,north.id);
  const axis=layout.areas.find(a=>a.id==='grand-front-south-public-axis')!;
  const a=jr.points.at(-1)!,b=bridge.points[0]!;
  for(let i=1;i<20;i++)assert(pointInPolygon({x:a.x+(b.x-a.x)*i/20,z:a.z+(b.z-a.z)*i/20},axis.outline));
});

test('Grand Front tower geometry is finite, source-backed and included in the stable camera envelope',()=>{
  const elevation=(id:typeof levels[number]['id'])=>displayElevation(levels,id,0.48);
  const bounds=new T.Box3().setFromPoints(cameraEnvelope(layout,levels,{level:'all'},elevation));
  const towers=layout.buildings.filter(b=>b.id.startsWith('grand-front')).flatMap(b=>b.volumes??[]);assert.deepEqual(towers.map(v=>v.name),['Tower A','Tower B','Tower C']);
  for(const b of layout.buildings.filter(b=>b.volumes)){
    const model=buildCommercialMassing(b);model.position.y=elevation('platform');model.updateMatrixWorld(true);
    assert(bounds.containsBox(new T.Box3().setFromObject(model)));
    model.traverse(o=>{if(o instanceof T.Mesh)assert([...o.geometry.getAttribute('position').array].every(Number.isFinite));});
    for(const v of b.volumes!)assert(v.evidence.urls?.some(url=>url.includes('openstreetmap.org/way/')));
  }
});

test('Grand Front towers stand on a complete podium with open 2F bridge entrances below its roof',()=>{
  for(const building of layout.buildings.filter(b=>b.volumes)){
    const model=buildCommercialMassing(building,{areas:layout.areas,passages:layout.passages});model.updateMatrixWorld(true);
    const podium=model.getObjectByName('podium')!;assert(podium);
    const roofTops:number[]=[];
    model.traverse(o=>{if(o instanceof T.Mesh&&o.name==='podium-roof-terrace'){o.geometry.computeBoundingBox();roofTops.push(o.geometry.boundingBox!.max.y);}});
    for(const v of building.volumes!){
      const body=model.getObjectByName(v.name)!.getObjectByName('tower-envelope') as T.Mesh;
      body.geometry.computeBoundingBox();
      assert(roofTops.some(top=>Math.abs(body.geometry.boundingBox!.min.y-top)<1e-5),'tower must sit on its podium roof');
    }
    for(const passage of layout.passages)for(let i=0;i<passage.points.length;i++){
      const door=passage.points[i]!;if(door.buildingId!==building.id||door.level!=='platform')continue;
      const neighbour=passage.points[i===0?1:i-1]!,direction=new T.Vector3(door.x-neighbour.x,0,door.z-neighbour.z).normalize();
      const origin=new T.Vector3(door.x,1.5,door.z).addScaledVector(direction,-2);
      const ray=new T.Raycaster(origin,direction,0,4);
      assert.equal(ray.intersectObject(podium,true).length,0,`${passage.id}: podium blocks the bridge entrance`);
    }
  }
});

test('North atrium B1 meets LUCUA and the Metro public approach without a south-side shortcut',()=>{
  const atrium=layout.areas.find(a=>a.id==='jr-north-atrium-b1')!;
  assert(pointInPolygon({x:0,z:-52},atrium.outline));
  assert.equal(atrium.level,'underground-hall');assert(atrium.outline.every(p=>p.z<0));
  const link=layout.passages.find(p=>p.id==='jr-north-metro-b1')!;
  assert.deepEqual({x:link.points[0]!.x,z:link.points[0]!.z},{x:61,z:-52});
  assert(layout.areas.some(a=>a.id==='metro-umeda-north-public'&&pointInPolygon(link.points[1]!,a.outline)));
});
