import type {Platform,RailApproach} from '../../src/domain/map/model.ts';
import {platformRail} from '../../src/domain/map/rail-geometry.ts';
import {railApproachDraft} from '../../src/infrastructure/rail-approach-draft.ts';
import type {Point2} from '../../src/domain/map/model.ts';

export function createMidosujiRailApproaches(platforms:Platform[]):RailApproach[]{
  const {approaches,make,node,segment}=railApproachDraft();
  const metro=platforms.find(p=>p.level==='metro-platform')!;
  const metroRail=make('metro-south','metro-umeda','御堂筋线 · 南侧延伸',0x9aaa99,{x:0,z:0},'metro-platform');
  metroRail.evidence={...metro.evidence,detail:'User area overview: tracks converge beyond the island and bend outward along the road to the south-east. Curve radius and lengths schematic, not surveyed alignment.'};
  const south={x:-Math.cos(metro.rotationRad),z:-Math.sin(metro.rotationRad)};
  const normal={x:-Math.sin(metro.rotationRad),z:Math.cos(metro.rotationRad)};
  const turn=-32*Math.PI/180,radius=45,k=4/3*Math.tan(Math.abs(turn)/4);
  const turned=(v:Point2)=>({x:v.x*Math.cos(turn)-v.z*Math.sin(turn),z:v.x*Math.sin(turn)+v.z*Math.cos(turn)});
  const road=turned(south),endNormal=turned(normal);
  const run=metro.length/2+3.5+26;
  const center={x:metro.x+south.x*run+normal.x*radius,z:metro.z+south.z*run+normal.z*radius};
  for(const [index,track]of metro.tracks.entries()){
    const rail=platformRail(metro,index),start=node(metroRail,`track-${track}`,rail.start,'platform-end');
    const at=(distance:number)=>({x:start.point.x+south.x*distance,z:start.point.z+south.z*distance});
    const side=rail.side*2.2;
    const outPoint={x:center.x-normal.x*(radius-side),z:center.z-normal.z*(radius-side)};
    const out=node(metroRail,`out-${track}`,outPoint,'outlet');
    segment(metroRail,`lead-${track}`,start,out,at(9),{x:outPoint.x-south.x*9,z:outPoint.z-south.z*9},metro.id,track);
    const r=radius-side,bendPoint={x:center.x-endNormal.x*r,z:center.z-endNormal.z*r};
    const bend=node(metroRail,`bend-${track}`,bendPoint,'junction');
    segment(metroRail,`bend-${track}`,out,bend,{x:outPoint.x+south.x*k*r,z:outPoint.z+south.z*k*r},
      {x:bendPoint.x-road.x*k*r,z:bendPoint.z-road.z*k*r});
    const end=node(metroRail,`end-${track}`,{x:bendPoint.x+road.x*14,z:bendPoint.z+road.z*14},'end');
    segment(metroRail,`tail-${track}`,bend,end,{x:bendPoint.x+road.x*14/3,z:bendPoint.z+road.z*14/3},
      {x:end.point.x-road.x*14/3,z:end.point.z-road.z*14/3});
  }
  const metroEnds=metroRail.nodes.filter(n=>n.kind==='end');
  metroRail.labelPoint={x:metroEnds.reduce((sum,n)=>sum+n.point.x,0)/2,z:metroEnds.reduce((sum,n)=>sum+n.point.z,0)/2};
  return approaches;
}
