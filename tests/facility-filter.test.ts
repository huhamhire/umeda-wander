import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filterFacilities} from '../src/application/facility-filter.ts';
import {explorationElevation} from '../src/application/exploration-level.ts';
import {facilities,levels,stations,layout} from '../src/infrastructure/umeda-map.ts';
import {facilityCodes} from '../src/infrastructure/facility-codes.ts';
import type {FacilityKind} from '../src/domain/map/model.ts';

test('facility type filters intersect the selected station and exploration floor',()=>{
  const kinds=['all',...new Set(facilities.map(f=>f.kind))] as (FacilityKind|'all')[];
  for(const station of stations)for(const level of levels)for(const kind of kinds){
    const actual=filterFacilities(facilities,levels,{station:station.id,level:level.id,kind});
    const expected=facilities.filter(f=>{
      const owner=levels.find(l=>l.id===f.level)!;
      return owner.station===station.id&&explorationElevation(owner)===explorationElevation(level)&&
        (kind==='all'||kind===f.kind||(kind==='ticket'&&f.kind==='ticket-machine'));
    });
    assert.deepEqual(actual.map(f=>f.id),expected.map(f=>f.id));
  }
  assert.equal(filterFacilities(facilities,levels,{station:null,level:'all',kind:'all'}).length,facilities.length);
  assert(filterFacilities(facilities,levels,{station:'jr-osaka',level:'concourse',kind:'stairs'}).some(f=>f.level==='mezzanine'));
});

test('every directory facility has a unique persistent number independent of filtering order',()=>{
  const codes=facilities.map(f=>facilityCodes[f.id]);
  assert(codes.every(c=>/^(JR|HK|M16|HS|T20)-\d{3}$/.test(c!)));
  assert.equal(new Set(codes).size,facilities.length);
  assert.equal(facilityCodes['west-gate'],'JR-001');assert.equal(facilityCodes['metro-umeda-north-gate'],'M16-001');
  for(const f of [...facilities].reverse())assert.equal(facilityCodes[f.id],codes[facilities.findIndex(v=>v.id===f.id)]);
});

test('ticket filter includes counters and machines while every modeled connection landing and platform is selectable',()=>{
  const sales=filterFacilities(facilities,levels,{station:null,level:'all',kind:'ticket'});
  assert(sales.some(f=>f.kind==='ticket'));assert(sales.some(f=>f.kind==='ticket-machine'));
  assert(sales.every(f=>f.kind==='ticket'||f.kind==='ticket-machine'));
  for(const connection of layout.connections)for(const p of [connection.from,connection.to])
    assert(facilities.some(f=>f.kind===connection.kind&&f.level===p.level&&Math.hypot(f.x-p.x,f.z-p.z)<0.01&&
      (f.elevationOffset??0)===(p.elevationOffset??0)),`${connection.id}: missing landing candidate`);
  for(const platform of layout.platforms)assert(facilities.some(f=>f.kind==='platform'&&f.platformId===platform.id));
});
