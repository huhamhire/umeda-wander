import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import type {CommercialBuilding,PublicPassage} from '../src/domain/map/model.ts';
import {levels} from '../src/infrastructure/umeda-map.ts';
import {buildCommercialFloor} from '../src/presentation/commercial-building-model.ts';
import {PublicPassageModel} from '../src/presentation/public-passage-model.ts';

const proof={source:'district' as const,pages:[],detail:'test geometry'};
const endpoint=(x:number,z:number)=>({x,z,level:'platform' as const});
test('commercial walls clear the full crossing passage, even without a named endpoint portal',()=>{
  const building:CommercialBuilding={id:'lucua',name:'test',outline:[{x:0,z:0},{x:20,z:0},{x:20,z:20},{x:0,z:20}],floors:[{level:'platform',name:'2F'}],evidence:proof};
  const p:PublicPassage={id:'crossing',name:'cross',kind:'deck',width:4,points:[endpoint(-5,10),endpoint(25,10)],evidence:proof};
  const context={levels,areas:[],passages:[p]},model=buildCommercialFloor(building,building.floors[0]!,[p],context);model.updateMatrixWorld(true);
  for(const x of [0,20])for(const z of [8.2,10,11.8]){
    const hits=new T.Raycaster(new T.Vector3(x,5,z),new T.Vector3(0,-1,0)).intersectObject(model,true);
    assert(!hits.some(h=>h.point.y>0.7));
  }
});

test('T junctions leave gaps in bridge side rails and posts',()=>{
  const trunk:PublicPassage={id:'trunk',name:'trunk',kind:'deck',width:4,points:[endpoint(0,0),endpoint(20,0)],evidence:proof};
  const branch:PublicPassage={id:'branch',name:'branch',kind:'deck',width:4,points:[endpoint(10,0),endpoint(10,10)],evidence:proof};
  const model=new PublicPassageModel(trunk,{levels,areas:[],passages:[trunk,branch]});model.update(()=>0,()=> 'current');
  const guards:T.Object3D[]=[];model.group.traverse(o=>{if(['passage-railing','passage-post'].includes(o.name))guards.push(o);});
  const ray=(x:number)=>new T.Raycaster(new T.Vector3(x,5,2),new T.Vector3(0,-1,0)).intersectObjects(guards);
  assert.equal(ray(10).length,0,'rail blocks the branch throat');assert(ray(2).length>0,'outer edge still needs a guard');
});
