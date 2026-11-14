import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {layerRole} from '../src/application/layer-focus.ts';
import {levels,connections,platforms} from '../src/infrastructure/jr-osaka-map.ts';
import {LayerAppearance} from '../src/presentation/layer-appearance.ts';
import {VerticalConnectionModel} from '../src/presentation/vertical-connection-model.ts';
import {displayElevation} from '../src/application/display-elevation.ts';
import {cameraOffset} from '../src/presentation/view-orientation.ts';

test('focused floors retain all lower levels as context and hide upper levels',()=>{
  for(const focus of levels)for(const target of levels){
    assert.equal(layerRole(levels,focus.id,target.id),target.id===focus.id?'current':target.y<focus.y?'context':'hidden');
    assert.equal(layerRole(levels,'all',target.id),'normal');
  }
});
test('muting a lower layer does not change materials shared with the active layer',()=>{
  const material=new T.MeshStandardMaterial({color:0x23665d});
  const active=new T.Mesh(new T.BoxGeometry(),material),lower=new T.Mesh(new T.BoxGeometry(),material);
  const style=new LayerAppearance(),initial=material.color.getHex();
  style.apply(lower,true);
  assert.notEqual(lower.material,material);assert.equal(active.material.color.getHex(),initial);
  assert.notEqual(lower.material.color.getHex(),initial);
  style.apply(lower,false);assert.equal(lower.material,material);
});
test('lower-floor facilities remain visible when focusing a higher layer',()=>{
  const connection=connections.find(c=>c.id==='central-34')!;
  const model=new VerticalConnectionModel(connection,levels,platforms);
  model.update(id=>displayElevation(levels,id,0.5),'bridge');
  assert(model.group.visible);assert(model.group.getObjectByName('connection-body')?.visible);
  assert(model.group.getObjectByName('lower-landing')?.visible);assert(model.group.getObjectByName('upper-landing')?.visible);
});
test('official-style fixed camera gives tracks a gentle bottom-left to top-right projection',()=>{
  const camera=new T.OrthographicCamera(-100,100,100,-100,0.1,1000);
  camera.position.copy(cameraOffset);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const origin=new T.Vector3().project(camera),along=new T.Vector3(10,0,0).project(camera);
  const dx=along.x-origin.x,dy=along.y-origin.y;
  assert(dx>0&&dy>0);assert(dy/dx>0.2&&dy/dx<0.4);
});
