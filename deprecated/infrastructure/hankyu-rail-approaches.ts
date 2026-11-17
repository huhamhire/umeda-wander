import type {Platform,RailApproach} from '../../src/domain/map/model.ts';
import {platformRail} from '../../src/domain/map/rail-geometry.ts';
import {railApproachDraft} from '../../src/infrastructure/rail-approach-draft.ts';
import {rotatePoint} from '../../src/domain/map/geometry.ts';
import {districtPlacements} from '../../src/infrastructure/district-placement.ts';

export function createHankyuRailApproaches(platforms:Platform[]):RailApproach[]{
  const {approaches,make,node,segment}=railApproachDraft();
  const h=districtPlacements.hankyu;
  const point=(x:number,z:number)=>{const p=rotatePoint({x:x*h.planScale,z:z*h.planScale},{x:0,z:0},h.angle);return {x:p.x+h.origin.x,z:p.z+h.origin.z};};
  for(const [line,first,last,center,color]of [['京都线',1,3,22,0x7ba989],['宝冢线',4,6,0,0xc7a573],['神户线',7,9,-22,0x83a5bf]] as const){
    const a=make(`hankyu-${first}-${last}`,'hankyu-umeda',line,color,point(133,center-3));
    const outlets=[node(a,'out-a',point(96,center+1.8),'outlet'),node(a,'out-b',point(96,center-1.8),'outlet')];
    for(const p of platforms.filter(p=>p.level==='hankyu-platform'))for(const [index,track]of p.tracks.entries()){
      if(track<first||track>last)continue;
      const rail=platformRail(p,index),root=node(a,`track-${track}`,rail.end,'platform-end');
      // Each middle platform road splits before joining the pair; shared tails render once.
      const direction={x:Math.cos(h.angle),z:Math.sin(h.angle)};
      if(track===first+1){
        const branch=node(a,'middle-junction',{x:root.point.x+direction.x*8,z:root.point.z+direction.z*8},'junction');
        segment(a,`lead-${track}`,root,branch,{x:root.point.x+direction.x*3,z:root.point.z+direction.z*3},{x:branch.point.x-direction.x*3,z:branch.point.z-direction.z*3},p.id,track);
        for(const [i,out]of outlets.entries())segment(a,`merge-${track}-${i}`,branch,out,
          {x:branch.point.x+direction.x*7,z:branch.point.z+direction.z*7},
          {x:out.point.x-direction.x*9,z:out.point.z-direction.z*9});
      }else{
        const out=outlets[track===first?0:1]!;
        segment(a,`lead-${track}`,root,out,{x:root.point.x+direction.x*10,z:root.point.z+direction.z*10},
          {x:out.point.x-direction.x*10,z:out.point.z-direction.z*10},p.id,track);
      }
    }
    for(const [i,start]of outlets.entries()){
      const z=center+(i===0?1.8:-1.8),end=node(a,`end-${i}`,point(132,z-3),'end');
      segment(a,`tail-${i}`,start,end,point(108,z),point(121,z+1));
    }
  }
  return approaches;
}
