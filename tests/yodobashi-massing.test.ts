import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {layout,levels} from '../deprecated/infrastructure/umeda-map.ts';
import {pointInPolygon,closestPolygonPoint} from '../src/domain/map/geometry.ts';
import {buildCommercialFloor} from '../src/presentation/commercial-building-model.ts';
import {buildCommercialMassing} from '../src/presentation/commercial-massing-model.ts';

const building=layout.buildings.find(b=>b.id==='yodobashi')!;

test('Yodobashi separates the outer 2F gallery from its inset retail podium and hotel',()=>{
  const gallery=building.perimeterGallery!;assert.equal(gallery.level,'platform');
  const hotel=building.volumes![0]!;
  const a=hotel.outline[1]!,b=hotel.outline[2]!,length=Math.hypot(b.x-a.x,b.z-a.z);
  const projection=(p:{x:number;z:number})=>(p.x*(b.x-a.x)+p.z*(b.z-a.z))/length;
  const span=(points:{x:number;z:number}[])=>Math.max(...points.map(projection))-Math.min(...points.map(projection));
  assert(span(hotel.outline)/span(gallery.innerOutline)>0.85,'hotel long face should approach the retail podium width');
  assert(building.podiumParts![0]!.height>building.podiumParts![1]!.height,'front old building and rear hotel base retain their stepped roof heights');
  assert(hotel.evidence.urls?.includes('https://www.openstreetmap.org/way/776542349'));
  for(const p of hotel.outline)assert(pointInPolygon(p,gallery.innerOutline),'hotel must remain above the retail podium');
  const floor=buildCommercialFloor(building,building.floors.find(f=>f.level===gallery.level)!,layout.passages,{areas:layout.areas,levels,passages:layout.passages});
  floor.updateMatrixWorld(true);
  const deck=floor.getObjectByName('perimeter-gallery-floor')!;
  assert(deck);assert(floor.getObjectByName('perimeter-gallery-railing'));
  const points=building.outline;
  for(let i=0;i<points.length;i++){
    const a=points[i]!,b=points[(i+1)%points.length]!,edge={x:(a.x+b.x)/2,z:(a.z+b.z)/2};
    const inner=closestPolygonPoint(edge,gallery.innerOutline),walk={x:(edge.x+inner.x)/2,z:(edge.z+inner.z)/2};
    assert(!pointInPolygon(walk,gallery.innerOutline));
    assert(new T.Raycaster(new T.Vector3(walk.x,2,walk.z),new T.Vector3(0,-1,0)).intersectObject(deck).length,'continuous gallery pavement must support the outer walking ring');
  }
});

test('Yodobashi massing retains hotel facade, retail roof and clear exterior gallery',()=>{
  const model=buildCommercialMassing(building,{areas:layout.areas,passages:layout.passages});model.updateMatrixWorld(true);
  for(const name of ['podium','阪急 RESPIRE 大阪酒店','yodobashi-vertical-facade-ribs','retail-roof-garden','hotel-roof-service-block','hotel-roof-helipad'])assert(model.getObjectByName(name),name);
  const inner=building.perimeterGallery!.innerOutline;
  for(let i=0;i<building.outline.length;i++){
    const p=building.outline[i]!,q=closestPolygonPoint(p,inner),walk={x:(p.x+q.x)/2,z:(p.z+q.z)/2};
    assert.equal(new T.Raycaster(new T.Vector3(walk.x,2,walk.z),new T.Vector3(0,-1,0)).intersectObject(model,true).length,0,'podium must not fill the public gallery');
  }
});

test('east station bridge lands on the JR-facing south gallery before the curved corner',()=>{
  const bridge=layout.passages.find(p=>p.id==='yodobashi-east-deck')!,door=bridge.points.at(-1)!;
  const a=building.outline[6]!,b=building.outline[7]!,dx=b.x-a.x,dz=b.z-a.z;
  const t=((door.x-a.x)*dx+(door.z-a.z)*dz)/(dx*dx+dz*dz);
  assert(t>0.65&&t<0.95,'entry must remain on the straight south face before the southeast corner');
  assert(Math.abs((door.x-a.x)*dz-(door.z-a.z)*dx)<1e-6);
  const start=bridge.points[0]!;
  assert(start.z>door.z,'bridge approaches the JR-facing side from the south');
  const inner=building.perimeterGallery!.innerOutline;
  const inward=closestPolygonPoint(door,inner);
  const walk={x:(door.x+inward.x)/2,z:(door.z+inward.z)/2};
  assert(pointInPolygon(walk,building.outline)&&!pointInPolygon(walk,inner),'arrival joins the outer public gallery');
});
