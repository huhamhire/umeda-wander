import {test} from 'node:test';
import assert from 'node:assert/strict';
import {levels} from '../src/infrastructure/umeda-map.ts';
import {floorOptions} from '../src/presentation/floor-options.ts';
import {viewLayerRole} from '../src/application/view-layer.ts';
import {displayElevation} from '../src/application/display-elevation.ts';
import {explorationElevation} from '../src/application/exploration-level.ts';

test('floor exploration combines local half-floors into five district bands',()=>{
  const options=floorOptions(levels);
  assert.equal(options.length,5);
  assert.deepEqual(options.map(o=>o.y),[16,8,0,-8,-16]);
  assert.deepEqual(options.map(o=>o.label),['3F','2F','1F','B1','B2']);
  assert.deepEqual(new Set(options.flatMap(o=>o.members.map(l=>l.id))),new Set(levels.map(l=>l.id)));
  for(const option of options)for(const active of option.members){
    for(const target of levels){
      const expected=explorationElevation(target)===explorationElevation(active)?'current':explorationElevation(target)<explorationElevation(active)?'context':'hidden';
      assert.equal(viewLayerRole(levels,{level:active.id,focusStation:active.station},target.id),expected);
    }
  }
});

test('physical heights are retained while half-floors share exploration bands',()=>{
  for(const y of new Set(levels.map(l=>l.y)))for(const explode of [0,0.48,1]){
    const heights=levels.filter(l=>l.y===y).map(l=>displayElevation(levels,l.id,explode));
    assert(heights.every(y=>y===heights[0]));
  }
  assert.equal(viewLayerRole(levels,{level:'metro-intermediate'},'mezzanine'),'hidden');
  assert.equal(viewLayerRole(levels,{level:'underground-hall'},'metro-hall'),'current');
  assert.equal(viewLayerRole(levels,{level:'platform'},'hankyu-hall'),'current');
  assert.equal(viewLayerRole(levels,{level:'bridge'},'hankyu-platform'),'current');
  assert.equal(viewLayerRole(levels,{level:'concourse'},'mezzanine'),'current');
  assert.equal(viewLayerRole(levels,{level:'metro-hall'},'metro-intermediate'),'current');
  assert(displayElevation(levels,'mezzanine',0.48)>displayElevation(levels,'concourse',0.48));
  assert(displayElevation(levels,'metro-intermediate',0.48)<displayElevation(levels,'metro-hall',0.48));
});
