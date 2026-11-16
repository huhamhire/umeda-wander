import type {Platform,RailApproach} from '../domain/map/model.ts';
import {platformRail} from '../domain/map/rail-geometry.ts';
import {railApproachDraft} from './rail-approach-draft.ts';

export function createJrRailApproaches(platforms:Platform[]):RailApproach[]{
  const {approaches,make,node,segment}=railApproachDraft();
  const main=make('jr-east-main','jr-osaka','JR 本线 · 新大阪 / 京都方向',0x8c9faf,{x:180,z:-6});
  const loop=make('jr-east-loop','jr-osaka','JR 环状线 · 京桥方向',0xb89b87,{x:180,z:31});
  const mainOut=[0,1,2,3].map(i=>node(main,`out-${i}`,{x:140,z:13-i*3},'outlet'));
  const loopOut=[0,1].map(i=>node(loop,`out-${i}`,{x:116,z:21-i*4},'outlet'));
  for(const p of platforms.filter(p=>p.level==='platform'))for(const [index,track]of p.tracks.entries()){
    const a=track<=2?loop:main;
    const start=node(a,`track-${track}`,platformRail(p,index).end,'platform-end');
    const out=track<=2?loopOut[track-1]!:mainOut[Math.min(3,Math.floor((track-3)/2))]!;
    const handle=(out.point.x-start.point.x)/3;
    segment(a,`lead-${track}`,start,out,{x:start.point.x+handle,z:start.point.z},{x:out.point.x-handle,z:out.point.z},p.id,track);
  }
  for(const a of [main,loop])for(const [i,start]of a.nodes.filter(n=>n.kind==='outlet').entries()){
    // OSM 891061374 stays nearly parallel until X≈150, then turns gradually north.
    const end=node(a,`end-${i}`,{x:185,z:start.point.z+(a===main?-5:7)},'end');
    const handle=(end.point.x-start.point.x)/3;
    segment(a,`tail-${i}`,start,end,{x:start.point.x+handle,z:start.point.z},{x:end.point.x-handle,z:start.point.z+(a===main?-2:2)});
  }

  const westMain=make('jr-west-main','jr-osaka','JR 本线 · 尼崎 / 神户方向',0x8c9faf,{x:-210,z:-6});
  const westLoop=make('jr-west-loop','jr-osaka','JR 环状线 · 福岛 / 西九条方向',0xb89b87,{x:-210,z:33});
  const westMainOut=[0,1,2,3].map(i=>node(westMain,`out-${i}`,{x:-145,z:2-i*4},'outlet'));
  const westLoopOut=[0,1].map(i=>node(westLoop,`out-${i}`,{x:-145,z:19-i*4},'outlet'));
  for(const a of [westMain,westLoop])a.evidence={source:'jr',pages:[3],detail:'West-end merge schematic; overall curvature checked against OSM west-side main/loop ways, track-to-running-line mapping simplified, not verified interlocking routes'};
  for(const p of platforms.filter(p=>p.level==='platform'))for(const [index,track]of p.tracks.entries()){
    const a=track<=2?westLoop:westMain;
    const start=node(a,`track-${track}`,platformRail(p,index).start,'platform-end');
    const out=track<=2?westLoopOut[track-1]!:westMainOut[Math.min(3,Math.floor((track-3)/2))]!;
    segment(a,`lead-${track}`,start,out,{x:start.point.x-13,z:start.point.z},{x:out.point.x+13,z:out.point.z},p.id,track);
  }
  for(const a of [westMain,westLoop])for(const [i,start]of a.nodes.filter(n=>n.kind==='outlet').entries()){
    const end=node(a,`end-${i}`,{x:-215,z:start.point.z+(a===westMain?9:6)},'end');
    segment(a,`tail-${i}`,start,end,{x:-167,z:start.point.z},{x:-194,z:start.point.z+(a===westMain?3:1)});
  }

  // Four station roads merge into a shared running pair at each end.
  // Northern curves share a center, keeping the two roads parallel through the bend.
  for(const side of [-1,1] as const){
    const underground=platforms.filter(p=>p.level==='underground-platform');
    if(!underground.length)continue;
    const axisAngle=underground[0]!.rotationRad,roadAngle=(-7.3-58.35)*Math.PI/180;
    const axis={x:Math.cos(axisAngle),z:Math.sin(axisAngle)},road={x:Math.cos(roadAngle),z:Math.sin(roadAngle)};
    const normal={x:-axis.z,z:axis.x};
    const roots=underground.flatMap(p=>p.tracks.map((_,i)=>side===1?platformRail(p,i).end:platformRail(p,i).start));
    const mergeRun=24;
    const origin=roots.reduce((sum,p)=>({x:sum.x+p.x/roots.length,z:sum.z+p.z/roots.length}),{x:axis.x*side*mergeRun,z:axis.z*side*mergeRun});
    const center={x:origin.x+axis.z*70,z:origin.z-axis.x*70},turn=roadAngle-axisAngle;
    const bendHandle=4/3*Math.tan(Math.abs(turn)/4);
    const a=make(`jr-umekita-${side===1?'north':'south'}`,'jr-osaka',`梅北地下轨道 · ${side===1?'北':'南'}侧延伸`,0x8c9faf,{x:0,z:0},'underground-platform');
    a.evidence={source:'jr',pages:[8],detail:'Tracks 21–24 merge to two running roads at each end per user requirement. North follows the road west of Grand Front. Pairing, switch locations and circular curve are schematic, not verified interlocking or surveyed tunnel geometry.'};
    const outlets=[1,-1].map((across,i)=>node(a,`out-${i===0?'a':'b'}`,{x:origin.x+normal.x*across*2,z:origin.z+normal.z*across*2},'outlet'));
    for(const p of underground)for(const [index,track]of p.tracks.entries()){
      const point=side===1?platformRail(p,index).end:platformRail(p,index).start;
      const start=node(a,`track-${track}`,point,'platform-end'),out=outlets[track<=22?0:1]!;
      segment(a,`lead-${track}`,start,out,{x:point.x+axis.x*side*mergeRun/3,z:point.z+axis.z*side*mergeRun/3},
        {x:out.point.x-axis.x*side*mergeRun/3,z:out.point.z-axis.z*side*mergeRun/3},p.id,track);
    }
    for(const [index,out]of outlets.entries()){
      const key=index===0?'a':'b';
      if(side===1){
        const dx=out.point.x-center.x,dz=out.point.z-center.z,radius=Math.hypot(dx,dz);
        const arcEnd=node(a,`bend-${key}`,{x:center.x+dx*Math.cos(turn)-dz*Math.sin(turn),z:center.z+dx*Math.sin(turn)+dz*Math.cos(turn)},'junction');
        segment(a,`bend-${key}`,out,arcEnd,
          {x:out.point.x+axis.x*bendHandle*radius,z:out.point.z+axis.z*bendHandle*radius},
          {x:arcEnd.point.x-road.x*bendHandle*radius,z:arcEnd.point.z-road.z*bendHandle*radius});
        const end=node(a,`end-${key}`,{x:arcEnd.point.x+road.x*12,z:arcEnd.point.z+road.z*12},'end');
        segment(a,`tail-${key}`,arcEnd,end,{x:arcEnd.point.x+road.x*4,z:arcEnd.point.z+road.z*4},{x:end.point.x-road.x*4,z:end.point.z-road.z*4});
      }else{
        const end=node(a,`end-${key}`,{x:out.point.x-axis.x*20,z:out.point.z-axis.z*20},'end');
        segment(a,`tail-${key}`,out,end,{x:out.point.x-axis.x*7,z:out.point.z-axis.z*7},{x:end.point.x+axis.x*7,z:end.point.z+axis.z*7});
      }
    }
    const ends=a.nodes.filter(n=>n.kind==='end');
    a.labelPoint={x:ends.reduce((sum,n)=>sum+n.point.x,0)/ends.length,z:ends.reduce((sum,n)=>sum+n.point.z,0)/ends.length-8};
  }

  return approaches;
}
