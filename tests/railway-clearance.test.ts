import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import polygonClipping from 'polygon-clipping';
import {surfaceRailwayPlan} from '../src/infrastructure/geography/railway-plan.ts';
import {createGeographicHankyu} from '../src/infrastructure/stations/hankyu-umeda/geographic.ts';
import {passageOutline} from '../src/domain/map/geometry.ts';
import type {Point2} from '../src/domain/map/model.ts';

const ring=(points:Point2[]):[number,number][]=>[...points,points[0]!].map(p=>[p.x,p.z]);
test('all Hankyu floor envelopes clear the JR surface track beds by at least 3 m',()=>{
  const rails=surfaceRailwayPlan(JSON.parse(readFileSync('data/geography/railways/features.json','utf8')))
    .filter(r=>r.operator==='西日本旅客鉄道');
  assert.ok(rails.length>10);
  const station=createGeographicHankyu();
  for(const r of rails)for(let i=1;i<r.points.length;i++){
    const a=r.points[i-1]!,b=r.points[i]!;
    if(Math.hypot(a.x-b.x,a.z-b.z)<1e-8)continue;
    const buffer=ring(passageOutline(a,b,r.bedWidth+6));
    for(const area of station.layout.areas){
      assert.equal(polygonClipping.intersection([ring(area.outline)],[buffer]).length,0,
        `${area.id} intersects clearance around ${r.id}`);
    }
  }
});
test('surface rail reference excludes subway tunnels but retains building passages',()=>{
  const base={id:'1',version:'1',coordinates:[[135.49,34.7],[135.491,34.701]]};
  const result=surfaceRailwayPlan([
    {...base,tags:{railway:'rail',tunnel:'yes'}},
    {...base,id:'2',tags:{railway:'rail',layer:'-1'}},
    {...base,id:'3',tags:{railway:'rail',tunnel:'building_passage',layer:'1'}},
  ]);
  assert.deepEqual(result.map(r=>r.id),['osm-rail-3']);
});
