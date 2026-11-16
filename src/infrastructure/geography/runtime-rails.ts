import {jrRailCorridors} from '../stations/jr-osaka/rail-corridors.ts';
import subway from '../../../data/geography/railways/subways.json' with {type:'json'};
import raw from '../../../data/geography/railways/features.json' with {type:'json'};
import type {StationMap,RailApproach,Point2} from '../../domain/map/model.ts';
import {platformRail} from '../../domain/map/rail-geometry.ts';
import {platformTangent} from '../../domain/map/geometry.ts';
import {toGeographicPlan} from '../../domain/map/spatial-block.ts';
import {geographicFrame} from './frame.ts';
export const osmRunningLines=[...raw,...subway];
/** Source lines constrain the broad corridor only; calibrated platform endpoints own the geometry. */
export function restoreMapRails(stations:StationMap[]):void {
 for(const station of stations){
  const approaches:RailApproach[]=[];
  for(const level of new Set(station.layout.platforms.map(p=>p.level))){
   const platforms=station.layout.platforms.filter(p=>p.level===level&&p.tracks.length);
   if(!platforms.length)continue;
   const origin=platforms.reduce((s,p)=>({x:s.x+p.x/platforms.length,z:s.z+p.z/platforms.length}),{x:0,z:0});
   const group=(track:number)=>level==='platform'?(track<=2?'loop':'main'):level==='hankyu-platform'?(track<=3?'kyoto':track<=6?'takarazuka':'kobe'):'pair';
   const tracks=platforms.flatMap(p=>p.tracks.map((track,index)=>({p,track,index,group:group(track)})));
   for(const key of new Set(tracks.map(t=>t.group)))for(const side of [-1,1]){
    // Extend bowed platforms on their actual end tangent, without steering back to the chord.
    const endAngle=platforms.reduce((s,p)=>s+platformTangent(p,side*p.length/2)/platforms.length,0);
    const axis={x:Math.cos(endAngle),z:Math.sin(endAngle)},normal={x:-axis.z,z:axis.x};
    const project=(p:Point2)=>({u:(p.x-origin.x)*axis.x+(p.z-origin.z)*axis.z,v:(p.x-origin.x)*normal.x+(p.z-origin.z)*normal.z});
    const point=(u:number,v:number)=>({x:origin.x+u*axis.x+v*normal.x,z:origin.z+u*axis.z+v*normal.z});
    const roots=tracks.filter(t=>t.group===key&&!(t.p.terminal&&(t.p.terminalEnd==='end'?side===1:side===-1))).map(t=>{
     const rail=platformRail(t.p,t.index),root=side===1?rail.end:rail.start;return {...t,root,...project(root)};
    }).sort((a,b)=>a.v-b.v);
    if(!roots.length)continue;
    const across=roots.reduce((s,r)=>s+r.v/roots.length,0),distance=level==='platform'?150:100;
    const desired=Math.max(...roots.map(r=>side*r.u))+distance;
    const id=`map-rail-${station.id}-${level}-${key}-${side}`;
    const approach:RailApproach={id,station:station.id,level,name:key==='loop'?'JR 环状线':key==='main'?'JR 本线':key==='kobe'?'神户线':key==='kyoto'?'京都线':key==='takarazuka'?'宝塚线':'轨道延伸',
      color:0x87958d,labelPoint:point(side*desired,across),nodes:[],segments:[],
      evidence:{source:'district',pages:[],urls:[],detail:'Illustrative running corridor fitted from calibrated platform ends; OSM is a broad direction reference only. Grouped schematic merges share junctions and tails; exact switch positions are not surveyed.'}};
    const addNode=(id:string,p:Point2,kind:RailApproach['nodes'][number]['kind'])=>{const n={id,point:p,kind};approach.nodes.push(n);return n;};
    const reference=osmRunningLines.filter(f=>{
      const t=f.tags as unknown as Record<string,string>,name=t.name??'',op=t.operator??'';
      return level==='platform'?(key==='loop'?/大阪環状/.test(name):/東海道/.test(name)):level==='underground-platform'?/梅田貨物/.test(name):level==='hankyu-platform'?name.includes(key==='kobe'?'神戸':key==='kyoto'?'京都':'宝塚'):level==='hanshin-platform'?/阪神/.test(name+op):level==='kitashinchi-platform'?/東西/.test(name):level==='metro-platform'?/御堂筋/.test(name):level==='t20-platform'?/谷町/.test(name):/四つ橋/.test(name);
    });
    const candidates=reference.flatMap(f=>f.coordinates.map((p,index)=>({f,index,q:project(toGeographicPlan({lon:p[0]!,lat:p[1]!},geographicFrame))})))
      .filter(c=>side*c.q.u>desired-100&&side*c.q.u<desired+100)
      .sort((a,b)=>Math.abs(side*a.q.u-desired)+Math.abs(a.q.v-across)-Math.abs(side*b.q.u-desired)-Math.abs(b.q.v-across));
    if(candidates[0])approach.evidence.urls=['https://www.openstreetmap.org/way/'+candidates[0].f.id];
    let turn=0;
    if(level==='platform'&&candidates[0]){
      const {f,index}=candidates[0],before=f.coordinates[Math.max(0,index-1)]!,after=f.coordinates[Math.min(f.coordinates.length-1,index+1)]!;
      const a=toGeographicPlan({lon:before[0]!,lat:before[1]!},geographicFrame),b=toGeographicPlan({lon:after[0]!,lat:after[1]!},geographicFrame);
      let dx=b.x-a.x,dz=b.z-a.z;if((dx*axis.x+dz*axis.z)*side<0){dx=-dx;dz=-dz;}
      turn=Math.max(-25*Math.PI/180,Math.min(25*Math.PI/180,Math.atan2(side*(axis.x*dz-axis.z*dx),side*(axis.x*dx+axis.z*dz))));
    }
    if(level==='platform'&&key==='main')turn=-side*jrRailCorridors.mainNorthTurn;
    if(level==='platform'&&key==='loop'&&side===1)turn=jrRailCorridors.eastLoopTurn;
    if(level==='platform')approach.name=key==='main'?(side===1?'JR 本线 · 新大阪 / 京都方向':'JR 本线 · 尼崎 / 神户方向'):(side===1?'JR 环状线 · 京桥方向':'JR 环状线 · 福岛 / 西九条方向');
    if(level==='underground-platform')approach.name=side===1?'梅北 · 新大阪 / 京都方向':'梅北 · 关西机场 / 和歌山方向';
    // Shared throats follow the old layout's grouped topology, in the new metre frame.
    const outletCount=key==='main'?4:2;
    let outletAcross=Array.from({length:outletCount},(_,i)=>{
      const subset=roots.filter((_,j)=>Math.min(outletCount-1,Math.floor(j*outletCount/roots.length))===i);
      if(level==='platform'&&key==='main')return across+(i-(outletCount-1)/2)*4.4;
      if(level==='platform')return subset.length?subset.reduce((s,r)=>s+r.v/subset.length,0):across;
      return across+(i-(outletCount-1)/2)*4.4;
    });
    const targetFor=(i:number)=>Math.min(outletCount-1,Math.floor(i*outletCount/roots.length));
    const spread=Math.max(...roots.map((r,i)=>Math.abs(r.v-outletAcross[targetFor(i)]!)));
    const mergeRun=Math.max(level==='platform'?90:65,spread*5);
    let mergeU=Math.max(...roots.map(r=>side*r.u))+mergeRun;
    if(level==='platform'&&key==='loop'&&side===1){
      const guide=project(jrRailCorridors.eastLoopThroat),span=roots.at(-1)!.v-roots[0]!.v;
      mergeU=guide.u;outletAcross=outletAcross.map((_,i)=>guide.v+(i-.5)*Math.min(4.4,span));
    }
    const outlets=outletAcross.map((v,i)=>addNode(id+'-merge-'+i,point(side*mergeU,v),'junction'));
    roots.forEach((r,i)=>{
      const root=addNode(id+'-track-'+r.p.id+'-'+r.track,r.root,'platform-end'),out=outlets[targetFor(i)]!;
      const heading=platformTangent(r.p,side*r.p.length/2),handle=(mergeU-side*r.u)/3;
      approach.segments.push({id:root.id+'-merge',from:root.id,to:out.id,platformId:r.p.id,track:r.track,
        control1:{x:r.root.x+side*Math.cos(heading)*handle,z:r.root.z+side*Math.sin(heading)*handle},
        control2:{x:out.point.x-side*axis.x*handle,z:out.point.z-side*axis.z*handle}});
    });
    // Common-radius turns keep paired running roads parallel and avoid an S-shaped offset.
    const axisOut={x:axis.x*side,z:axis.z*side},left={x:-axisOut.z,z:axisOut.x};
    const sign=Math.sign(turn)||1,radius=220;
    const tailAcross=outletAcross.reduce((sum,v)=>sum+v/outletAcross.length,0);
    const center=point(side*mergeU,tailAcross);
    const arcCenter={x:center.x+left.x*radius*sign,z:center.z+left.z*radius*sign};
    const rotate=(v:Point2,a:number)=>({x:v.x*Math.cos(a)-v.z*Math.sin(a),z:v.x*Math.sin(a)+v.z*Math.cos(a)});
    const road=rotate(axisOut,turn);
    for(const [i,out]of outlets.entries()){
      let start=out;
      if(Math.abs(turn)>.01){
        const vector={x:out.point.x-arcCenter.x,z:out.point.z-arcCenter.z},delta=rotate(vector,turn),r=Math.hypot(vector.x,vector.z),handle=4/3*Math.tan(Math.abs(turn)/4)*r;
        const bend=addNode(out.id+'-bend',{x:arcCenter.x+delta.x,z:arcCenter.z+delta.z},'outlet');
        approach.segments.push({id:out.id+'-curve',from:out.id,to:bend.id,control1:{x:out.point.x+axisOut.x*handle,z:out.point.z+axisOut.z*handle},control2:{x:bend.point.x-road.x*handle,z:bend.point.z-road.z*handle}});start=bend;
      }
      const tail=70,end=addNode(out.id+'-end',{x:start.point.x+road.x*tail,z:start.point.z+road.z*tail},'end');
      approach.segments.push({id:out.id+'-tail',from:start.id,to:end.id,
        control1:{x:start.point.x+road.x*tail/3,z:start.point.z+road.z*tail/3},
        control2:{x:end.point.x-road.x*tail/3,z:end.point.z-road.z*tail/3}});
    }
    const ends=approach.nodes.filter(n=>n.kind==='end');
    approach.labelPoint=ends.reduce((sum,n)=>({x:sum.x+n.point.x/ends.length,z:sum.z+n.point.z/ends.length}),{x:0,z:0});
    approaches.push(approach);
   }
  }
  station.layout.railApproaches=approaches;
 }
}
