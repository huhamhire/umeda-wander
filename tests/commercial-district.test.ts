import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {layout,levels} from '../src/infrastructure/umeda-map.ts';
import {pointInPolygon,closestPolygonPoint} from '../src/domain/map/geometry.ts';
import {commercialFootprints} from '../src/infrastructure/commercial-footprints.ts';
import {buildCommercialFloor} from '../src/presentation/commercial-building-model.ts';
import {PublicPassageModel} from '../src/presentation/public-passage-model.ts';
import {displayElevation} from '../src/application/display-elevation.ts';
import {viewLayerRole} from '../src/application/view-layer.ts';
import {cameraEnvelope} from '../src/presentation/camera-framing.ts';
import {explorationElevation} from '../src/application/exploration-level.ts';
import {hankyuStation} from '../src/infrastructure/hankyu-umeda-map.ts';
import {districtPlacements} from '../src/infrastructure/district-placement.ts';
import {sampleRailSegment} from '../src/domain/map/rail-geometry.ts';

const height=(id:typeof levels[number]['id'])=>levels.find(l=>l.id===id)!.y;

test('Hankyu department store approaches station width and receives both bridges on its west face',()=>{
  const store=layout.buildings.find(b=>b.id==='hankyu-dept')!;
  const axis={x:-Math.sin(districtPlacements.hankyu.angle),z:Math.cos(districtPlacements.hankyu.angle)};
  const span=(points:{x:number;z:number}[])=>{
    const values=points.map(p=>p.x*axis.x+p.z*axis.z);return Math.max(...values)-Math.min(...values);
  };
  const station=hankyuStation.layout.areas.find(a=>a.id==='hankyu-umeda-ground')!;
  assert(span(store.outline)>span(station.outline)*0.95&&span(store.outline)<span(station.outline)*1.1);
  const a=store.outline[0]!,b=store.outline[1]!,dx=b.x-a.x,dz=b.z-a.z;
  for(const id of ['hankyu-dept-deck-north-arm','hankyu-dept-deck-south-arm']){
    const bridge=layout.passages.find(p=>p.id===id)!,door=bridge.points.at(-1)!;
    assert.equal(door.buildingId,store.id);
    assert(Math.abs((door.x-a.x)*dz-(door.z-a.z)*dx)<1e-6,'bridge must meet the west wall, not the south corner');
    const t=((door.x-a.x)*dx+(door.z-a.z)*dz)/(dx*dx+dz*dz);assert(t>0.1&&t<0.98);
  }
  for(const approach of layout.railApproaches.filter(a=>a.id.startsWith('jr-east')))for(const segment of approach.segments)
    for(const {point}of sampleRailSegment(approach,segment,120)){
      assert(!pointInPolygon(point,store.outline),'railway cannot cross the enlarged department-store envelope');
      const edge=closestPolygonPoint(point,store.outline);
      assert(Math.hypot(edge.x-point.x,edge.z-point.z)>1.25,'include ballast in department-store clearance');
    }
});
test('commercial envelopes have their own footprint evidence and continuous 2F walking band',()=>{
  assert.deepEqual(layout.buildings.map(b=>b.id),['hankyu-dept','hankyu-grand','daimaru','lucua','lucua-1100','yodobashi','grand-front-south','grand-front-north']);
  for(const b of layout.buildings){
    assert(b.outline.length>=4);assert(b.outline.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)));
    assert.equal(b.evidence.source,'district');assert.deepEqual(b.evidence.pages,[]);
    assert(b.evidence.urls?.includes(`https://www.openstreetmap.org/way/${commercialFootprints[b.id].way}`));
    assert.equal(explorationElevation(levels.find(l=>l.id===b.floors.find(f=>f.name==='2F')!.level)!),8);
  }
  assert(layout.passages.filter(p=>p.kind==='deck').every(p=>p.points.every(v=>explorationElevation(levels.find(l=>l.id===v.level)!)===8)),'small grades must not split the exterior 2F walking band');
  assert.equal(layout.railApproaches.filter(a=>a.station==='hankyu-umeda').map(a=>a.name).join('/'),'京都线/宝冢线/神户线');
});

test('commercial links end at actual building boundaries and existing public station surfaces',()=>{
  for(const passage of layout.passages)for(const point of [passage.points[0]!,passage.points.at(-1)!]){
    if(point.buildingId){
      const b=layout.buildings.find(b=>b.id===point.buildingId)!;
      const boundary=closestPolygonPoint(point,b.outline);
      assert(Math.hypot(boundary.x-point.x,boundary.z-point.z)<1e-6);
      assert(b.floors.some(f=>f.level===point.level));
    }else if(point.station){
      assert(layout.areas.some(a=>a.level===point.level&&a.kind==='public'&&pointInPolygon(point,a.outline)),`${passage.id}: detached station end`);
    }
  }
});

test('new public passages do not cut through station paid areas at the same walking height',()=>{
  for(const passage of layout.passages)for(let i=1;i<passage.points.length;i++){
    const a=passage.points[i-1]!,b=passage.points[i]!,dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
    assert(length>0.05);
    for(let j=0;j<=80;j++)for(const side of [-passage.width/2,0,passage.width/2]){
      const t=j/80,point={x:a.x+dx*t-dz/length*side,z:a.z+dz*t+dx/length*side};
      const y=height(a.level)*(1-t)+height(b.level)*t;
      assert(!layout.areas.some(area=>area.kind==='paid'&&Math.abs(height(area.level)-y)<0.1&&pointInPolygon(point,area.outline)),`${passage.id}: enters a paid area`);
    }
  }
});

test('building facade entry gaps remain open above the footprint slab',()=>{
  for(const b of layout.buildings)for(const f of b.floors){
    const model=buildCommercialFloor(b,f,layout.passages,{areas:layout.areas,levels,passages:layout.passages});model.updateMatrixWorld(true);
    for(const passage of layout.passages)for(const [i,door]of passage.points.entries()){
      if(door.buildingId!==b.id||door.level!==f.level)continue;
      const neighbour=passage.points[i===0?1:i-1]!,dx=door.x-neighbour.x,dz=door.z-neighbour.z,length=Math.hypot(dx,dz);
      for(const offset of [-0.45*passage.width,0,0.45*passage.width]){
        const point={x:door.x-dz/length*offset,z:door.z+dx/length*offset};
        const hits=new T.Raycaster(new T.Vector3(point.x,(f.elevationOffset??0)+5,point.z),new T.Vector3(0,-1,0)).intersectObject(model,true);
        assert(!hits.some(h=>h.point.y>(f.elevationOffset??0)+0.7),`${b.id}: portal width blocked by its shell`);
      }
    }
    model.traverse(o=>{if(o instanceof T.Mesh)assert([...o.geometry.getAttribute('position').array].every(Number.isFinite));});
  }
});

test('passage geometry follows explosion and B1/2F cuts while district framing includes outer buildings',()=>{
  const elevation=(id:typeof levels[number]['id'])=>displayElevation(levels,id,0.48);
  const bounds=new T.Box3().setFromPoints(cameraEnvelope(layout,levels,{level:'all'},elevation));
  for(const b of layout.buildings)for(const f of b.floors)for(const p of b.outline)
    assert(bounds.containsPoint(new T.Vector3(p.x,elevation(f.level)+(f.elevationOffset??0)+3,p.z)));
  for(const passage of layout.passages){
    const model=new PublicPassageModel(passage);
    if(passage.kind==='underground'){
      assert(!model.group.getObjectByName('passage-railing'));
      assert(!model.group.getObjectByName('passage-post'));
    }else assert(model.group.getObjectByName('passage-railing'));
    for(const explode of [0,0.48,1])for(const level of ['all','platform','metro-hall'] as const){
      model.update(id=>displayElevation(levels,id,explode),id=>viewLayerRole(levels,{level},id));
      model.group.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
      if(level==='metro-hall'&&passage.kind==='deck')assert(!model.group.visible);
      if(level==='metro-hall'&&passage.kind==='underground')assert(model.group.visible);
    }
  }
});
