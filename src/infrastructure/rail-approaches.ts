import type {Platform,Point2,RailApproach,RailNode,RailSegment} from '../domain/map/model.ts';
import {platformRail} from '../domain/map/rail-geometry.ts';
import {rotatePoint} from '../domain/map/geometry.ts';
import {districtPlacements} from './district-placement.ts';

/** Station throats are illustrative; short tail curvature follows public OSM ways. */
export function createRailApproaches(platforms:Platform[]):RailApproach[]{
  const approaches:RailApproach[]=[];
  const make=(id:string,station:RailApproach['station'],name:string,color:number,labelPoint:Point2,level:RailApproach['level']=station==='jr-osaka'?'platform':'hankyu-platform'):RailApproach=>{
    const a:RailApproach={id,station,level,name,color,nodes:[],segments:[],labelPoint,
      evidence:{source:station==='jr-osaka'?'jr':'hankyu',pages:[station==='jr-osaka'?3:1],detail:'Station-exit bundle and merge schematic; tail direction cross-checked with OSM, not a complete turnout/interlocking diagram'}};
    approaches.push(a);return a;
  };
  const node=(a:RailApproach,key:string,point:Point2,kind:RailNode['kind'])=>{const n={id:`${a.id}-${key}`,point,kind};a.nodes.push(n);return n;};
  const segment=(a:RailApproach,key:string,from:RailNode,to:RailNode,c1:Point2,c2:Point2,platformId?:string,track?:number)=>{
    const s:RailSegment={id:`${a.id}-${key}`,from:from.id,to:to.id,control1:c1,control2:c2,platformId,track};a.segments.push(s);
  };
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
