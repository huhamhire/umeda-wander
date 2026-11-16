import * as T from 'three';
import plan from '../../data/geography/runtime-plan.json' with {type:'json'};
import {buildFloorGeometry} from './floor-geometry.ts';
import type {Point2} from '../domain/map/model.ts';
const project=(p:number[]):Point2=>({x:(p[0]!-135.491)*111320*Math.cos(34.708*Math.PI/180),z:(34.708-p[1]!)*111320});
export function buildGeographicContext(groundOpenings:Point2[][]=[]){
 const roads=new T.Group(),buildings=new T.Group();
 const add=(g:T.Group,rings:Point2[][],color:number,y:number,height=.15)=>{
  if(!rings[0]?.length)return;
  const geometry=buildFloorGeometry(rings[0],rings.slice(1),height,y);
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.95}));g.add(mesh);
 };
 // One opaque ground skin prevents underground geometry leaking through blocks.
 add(roads,[[{x:0,z:0},{x:1010,z:0},{x:1010,z:1225},{x:0,z:1225}],...groundOpenings],0xe8e7dc,-1.7,.2);
 for(const raw of plan.ground){
  const f=raw as unknown as {id:string;properties:Record<string,string>;geometry:{type:string;coordinates:unknown}};
  const t=f.properties,c=f.geometry.coordinates;
  if(f.geometry.type==='LineString'){
   const points=(c as number[][]).map(project),width=plan.widths.find(w=>String(w.id)===f.id.split('/')[1])?.metres??4;
   for(let i=1;i<points.length;i++){
    const a=points[i-1]!,b=points[i]!,length=Math.hypot(b.x-a.x,b.z-a.z);if(!length)continue;
    const dx=-(b.z-a.z)/length*width/2,dz=(b.x-a.x)/length*width/2;
    add(roads,[[{x:a.x+dx,z:a.z+dz},{x:b.x+dx,z:b.z+dz},{x:b.x-dx,z:b.z-dz},{x:a.x-dx,z:a.z-dz}]],0xb9c2be,-1);
   }
  }else{
   const polygons=f.geometry.type==='MultiPolygon'?c as number[][][][]:[c as number[][][]];
   for(const polygon of polygons)add(t.building?buildings:roads,polygon.map(r=>r.map(project)),t.building?0xd6ddce:0xe6dfc5,-1.3,t.building?.3:.15);
  }
 }
 return {roads,buildings};
}
