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
  const main=make('jr-east-main','jr-osaka','JR 本线 · 新大阪 / 京都方向',0x8c9faf,{x:180,z:-20});
  const loop=make('jr-east-loop','jr-osaka','JR 环状线 · 京桥方向',0xb89b87,{x:180,z:31});
  const mainOut=[0,1,2,3].map(i=>node(main,`out-${i}`,{x:96,z:2-i*4},'outlet'));
  const loopOut=[0,1].map(i=>node(loop,`out-${i}`,{x:96,z:21-i*4},'outlet'));
  for(const p of platforms.filter(p=>p.level==='platform'))for(const [index,track]of p.tracks.entries()){
    const a=track<=2?loop:main;
    const start=node(a,`track-${track}`,platformRail(p,index).end,'platform-end');
    const out=track<=2?loopOut[track-1]!:mainOut[Math.min(3,Math.floor((track-3)/2))]!;
    segment(a,`lead-${track}`,start,out,{x:start.point.x+11,z:start.point.z},{x:out.point.x-11,z:out.point.z},p.id,track);
  }
  for(const a of [main,loop])for(const [i,start]of a.nodes.filter(n=>n.kind==='outlet').entries()){
    // OSM 891061374 stays nearly parallel until X≈150, then turns gradually north.
    const end=node(a,`end-${i}`,{x:185,z:start.point.z+(a===main?-5:7)},'end');
    segment(a,`tail-${i}`,start,end,{x:130,z:start.point.z},{x:162,z:start.point.z+(a===main?-2:2)});
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

  // Underground extensions preserve each track and its platform-axis tangent.
  // Their straight short stubs imply neither turnouts nor a surveyed tunnel path.
  for(const side of [-1,1] as const){
    const underground=platforms.filter(p=>p.level==='underground-platform');
    if(!underground.length)continue;
    const a=make(`jr-umekita-${side===1?'north':'south'}`,'jr-osaka',`梅北地下轨道 · ${side===1?'北':'南'}侧延伸`,0x8c9faf,{x:0,z:0},'underground-platform');
    a.evidence={source:'jr',pages:[8],detail:'B2F tracks 21–24; straight short continuation of the existing platform axis, schematic length, tunnel alignment and turnouts not verified'};
    for(const p of underground)for(const [index,track]of p.tracks.entries()){
      const rail=platformRail(p,index),point=side===1?rail.end:rail.start;
      const at=(distance:number)=>({x:point.x+side*Math.cos(p.rotationRad)*distance,z:point.z+side*Math.sin(p.rotationRad)*distance});
      const start=node(a,`track-${track}`,point,'platform-end'),out=node(a,`out-${track}`,at(14),'outlet'),end=node(a,`end-${track}`,at(32),'end');
      segment(a,`lead-${track}`,start,out,at(5),at(9),p.id,track);
      segment(a,`tail-${track}`,out,end,at(20),at(26));
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
