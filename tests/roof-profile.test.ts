import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roofHeightAt,roofPlan } from '../src/presentation/roof-profile.ts';
import {layout} from '../src/infrastructure/umeda-map.ts';

test('the large roof is higher on the north side and lower on the south side', () => {
  assert(roofHeightAt(-36) > roofHeightAt(36));
  for (let z = -36; z < 36; z += 1) assert(roofHeightAt(z) > roofHeightAt(z + 1));
});

test('central roof extends west while retaining the fitted east facade boundary',()=>{
  const b=layout.buildings.find(b=>b.id==='daimaru')!;
  const width=Math.max(...b.outline.map(p=>p.x))-Math.min(...b.outline.map(p=>p.x));
  assert(roofPlan.width>width&&roofPlan.width<width*1.6);
  assert(roofPlan.centerX-roofPlan.width/2<=-48);
  assert.equal(roofPlan.centerX+roofPlan.width/2,38);
});
