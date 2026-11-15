import {test} from 'node:test';
import assert from 'node:assert/strict';
import {layout,levels} from '../src/infrastructure/umeda-map.ts';
import {cameraEnvelope} from '../src/presentation/camera-framing.ts';
import {displayElevation} from '../src/application/display-elevation.ts';
import type {StationId} from '../src/domain/map/model.ts';

test('floor cuts retain an identical camera envelope within each station focus',()=>{
  for(const station of [null,'jr-osaka','hankyu-umeda','metro-umeda'] as (StationId|null)[]){
    for(const explode of [0,0.48,1]){
      const elevation=(id:typeof levels[number]['id'])=>displayElevation(levels,id,explode);
      const all=cameraEnvelope(layout,levels,{level:'all',focusStation:station},elevation).map(p=>p.toArray());
      for(const level of levels)assert.deepEqual(cameraEnvelope(layout,levels,{level:level.id,focusStation:station},elevation).map(p=>p.toArray()),all);
    }
  }
});
