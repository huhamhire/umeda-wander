import type {Platform,RailApproach} from '../domain/map/model.ts';
import {platformRail} from '../domain/map/rail-geometry.ts';
import {railApproachDraft} from './rail-approach-draft.ts';
import {rotatePoint} from '../domain/map/geometry.ts';

export function createIslandRailApproaches(platforms:Platform[]):RailApproach[]{
  const {approaches,make,node,segment}=railApproachDraft();
  // Island tracks converge to independent parallel running roads. Y11 ends at
  // the north buffers; only its southern end continues. Kitashinchi runs through.
  for(const [level,id,station,name,color,side,endX]of [
    ['y11-platform','y11-south','nishi-umeda','四桥线 · 肥后桥方向',0x328bb7,-1,118],
    ['kitashinchi-platform','kitashinchi-west','kitashinchi','JR 东西线 · 尼崎方向',0xd28faf,-1,125],
    ['kitashinchi-platform','kitashinchi-east','kitashinchi','JR 东西线 · 京桥方向',0xd28faf,1,125],
  ] as const){
    const p=platforms.find(p=>p.level===level);if(!p)continue;
    const at=(along:number,across:number)=>{
      const q=rotatePoint({x:along,z:across},{x:0,z:0},p.rotationRad);return {x:q.x+p.x,z:q.z+p.z};
    };
    const a=make(id,station,name,color,at(side*endX,0),level);
    a.evidence={...p.evidence,detail:`${p.evidence.detail}; short running-pair continuation along the supplied district road/rail axis. Turnouts and gradients not surveyed.`};
    const direction={x:Math.cos(p.rotationRad)*side,z:Math.sin(p.rotationRad)*side};
    for(const [index,track]of p.tracks.entries()){
      const rail=platformRail(p,index),start=node(a,`track-${track}`,side===-1?rail.start:rail.end,'platform-end');
      const across=rail.side*2.2,out=node(a,`out-${track}`,at(side*85,across),'outlet');
      segment(a,`lead-${track}`,start,out,
        {x:start.point.x+direction.x*11,z:start.point.z+direction.z*11},
        {x:out.point.x-direction.x*11,z:out.point.z-direction.z*11},p.id,track);
      const end=node(a,`end-${track}`,at(side*endX,across),'end');
      const run=(endX-85)/3;
      segment(a,`tail-${track}`,out,end,{x:out.point.x+direction.x*run,z:out.point.z+direction.z*run},
        {x:end.point.x-direction.x*run,z:end.point.z-direction.z*run});
    }
  }
  return approaches;
}
