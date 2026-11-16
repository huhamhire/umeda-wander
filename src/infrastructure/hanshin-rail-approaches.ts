import type {Platform,RailApproach} from '../domain/map/model.ts';
import {platformRail} from '../domain/map/rail-geometry.ts';
import {railApproachDraft} from './rail-approach-draft.ts';
import {rotatePoint} from '../domain/map/geometry.ts';
import {districtPlacements} from './district-placement.ts';

export function createHanshinRailApproaches(platforms:Platform[]):RailApproach[]{
  const {approaches,make,node,segment}=railApproachDraft();
  const hs=districtPlacements.hanshin;
  const hsPoint=(x:number,z:number)=>{const p=rotatePoint({x:x*hs.planScale.along,z:z*hs.planScale.across},{x:0,z:0},hs.angle);return {x:p.x+hs.origin.x,z:p.z+hs.origin.z};};
  const hsRail=make('hanshin-west','hanshin-umeda','阪神本线 · 神户三宫方向',0x7fa6bd,hsPoint(102,0),'hanshin-platform');
  hsRail.evidence={source:'hanshin',pages:[1],urls:['https://www.hanshin.co.jp/uploads/guidemap/umeda.pdf'],detail:'Four terminal tracks continue west and merge into two illustrative running lines. Switch locations are not surveyed.'};
  const hsOut=[node(hsRail,'out-north',hsPoint(78,2.1),'outlet'),node(hsRail,'out-south',hsPoint(78,-2.1),'outlet')];
  for(const p of platforms.filter(p=>p.level==='hanshin-platform'))for(const [index,track]of p.tracks.entries()){
    const start=node(hsRail,`track-${track}`,platformRail(p,index).end,'platform-end'),out=hsOut[track<3?0:1]!;
    const along={x:Math.cos(hs.angle),z:Math.sin(hs.angle)};
    segment(hsRail,`lead-${track}`,start,out,{x:start.point.x+along.x*11,z:start.point.z+along.z*11},
      {x:out.point.x-along.x*11,z:out.point.z-along.z*11},p.id,track);
  }
  for(const [i,out]of hsOut.entries()){
    const z=i===0?2.1:-2.1,end=node(hsRail,`end-${i}`,hsPoint(104,z),'end');
    segment(hsRail,`tail-${i}`,out,end,hsPoint(87,z),hsPoint(95,z));
  }
  return approaches;
}
