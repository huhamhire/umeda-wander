import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {layout} from '../src/infrastructure/umeda-map.ts';
import {buildCommercialMassing} from '../src/presentation/commercial-massing-model.ts';
import {pointInPolygon} from '../src/domain/map/geometry.ts';

test('department exteriors preserve distinct podiums and upper silhouettes with finite facade meshes',()=>{
  for(const id of ['hankyu-dept','hankyu-grand','daimaru']){
    const b=layout.buildings.find(b=>b.id===id)!,group=buildCommercialMassing(b,{areas:layout.areas,passages:layout.passages});
    assert(b.podiumHeight!>0&&b.volumes!.length>0);
    assert(group.getObjectByName('podium'));assert(group.getObjectByName('department-window-grid'));
    assert(group.getObjectByName('department-stone-piers'));assert(group.getObjectByName('department-podium-layer-bands'));
    group.traverse(o=>{if(o instanceof T.Mesh)assert(o.geometry.getAttribute('position').array.every(Number.isFinite));});
    for(const v of b.volumes!)for(const p of v.outline)assert(pointInPolygon(p,b.outline)||b.outline.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<0.01));
  }
});

test('Hankyu department main tower is one convex chamfered mass, separate from Grand Building',()=>{
  const dept=layout.buildings.find(b=>b.id==='hankyu-dept')!,grand=layout.buildings.find(b=>b.id==='hankyu-grand')!;
  assert.equal(dept.volumes!.length,1);assert.equal(dept.volumes![0]!.courtyards,undefined);
  const ring=dept.volumes![0]!.outline;
  const turns=ring.map((a,i)=>{const b=ring[(i+1)%ring.length]!,c=ring[(i+2)%ring.length]!;return Math.sign((b.x-a.x)*(c.z-b.z)-(b.z-a.z)*(c.x-b.x));});
  assert(turns.every(t=>t===turns[0]),'main tower must not inherit the neighbouring building notch');
  const a=dept.outline[0]!,b=dept.outline[1]!,length=Math.hypot(b.x-a.x,b.z-a.z);
  const along=(p:{x:number;z:number})=>((p.x-a.x)*(b.x-a.x)+(p.z-a.z)*(b.z-a.z))/length;
  const extent=dept.outline.map(along),cut=Math.min(...extent)+(Math.max(...extent)-Math.min(...extent))*0.55;
  assert(ring.every(p=>along(p)>cut),'tower occupies only the southern lobe; northern wing remains low');
  for(const p of ring){
    const gap=Math.min(...dept.outline.map((a,i)=>{
      const b=dept.outline[(i+1)%dept.outline.length]!,dx=b.x-a.x,dz=b.z-a.z;
      const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));
      return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);
    }));
    assert(gap<2,'tower corners follow the podium perimeter with a narrow setback');
  }
  assert(grand.volumes!.length>0);
});

test('South Gate upper hotel has two open roof courts and the south facade carries Osaka station signage',()=>{
  const b=layout.buildings.find(b=>b.id==='daimaru')!,volume=b.volumes![0]!;
  const group=buildCommercialMassing(b),body=group.getObjectByName('tower-envelope')!;
  group.updateMatrixWorld(true);assert.equal(volume.courtyards!.length,2);
  for(const court of volume.courtyards!){
    const x=court.reduce((s,p)=>s+p.x/court.length,0),z=court.reduce((s,p)=>s+p.z/court.length,0);
    assert.equal(new T.Raycaster(new T.Vector3(x,80,z),new T.Vector3(0,-1,0)).intersectObject(body).length,0);
  }
  const sign=group.getObjectByName('osaka-station-facade-sign')!;
  assert.equal(sign.userData.text,'大阪駅 / OSAKA STATION');
  assert(sign.position.z>70,'station sign faces the southern street');
});
