import clipping from 'polygon-clipping';
import type {FloorArea,PlanRegion,Point2} from '../domain/map/model.ts';
import type {BasementOccupancy} from '../domain/map/public-area.ts';
import {pointInPolygon} from '../domain/map/geometry.ts';

const geometry=(a:PlanRegion)=>[a.outline,...a.holes??[]].map(r=>r.map(p=>[p.x,p.z] as [number,number]));
const area=(ring:Point2[])=>Math.abs(ring.reduce((s,p,i)=>{const q=ring[(i+1)%ring.length]!;return s+p.x*q.z-q.x*p.z;},0))/2;
/** Approximate interior label anchor; stays in the filled region rather than a hole/adjacent corridor. */
function labelPoint(region:PlanRegion):Point2 {
  const xs=region.outline.map(p=>p.x),zs=region.outline.map(p=>p.z),minX=Math.min(...xs),minZ=Math.min(...zs),w=Math.max(...xs)-minX,h=Math.max(...zs)-minZ;
  let best=region.outline[0]!,score=-1;
  for(let i=1;i<18;i++)for(let j=1;j<18;j++){
    const p={x:minX+w*i/18,z:minZ+h*j/18};
    if(!pointInPolygon(p,region.outline)||region.holes?.some(r=>pointInPolygon(p,r)))continue;
    let clearance=Infinity;
    for(const ring of [region.outline,...region.holes??[]])for(let k=0;k<ring.length;k++){
      const a=ring[k]!,b=ring[(k+1)%ring.length]!,dx=b.x-a.x,dz=b.z-a.z;
      const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));
      clearance=Math.min(clearance,Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t));
    }
    if(clearance>score){best=p;score=clearance;}
  }
  return best;
}
/** Keep the complete label rectangle inside its own clipped island. */
function labelWidth(region:PlanRegion,p:Point2,angle:number):number {
  const co=Math.cos(angle),si=Math.sin(angle);
  const fits=(width:number)=>[-.5,-.25,0,.25,.5].every(x=>[-.1875,0,.1875].every(z=>{
    const q={x:p.x+width*(x*co-z*si),z:p.z+width*(x*si+z*co)};
    return pointInPolygon(q,region.outline)&&!region.holes?.some(h=>pointInPolygon(q,h));
  }));
  let low=0,high=30;
  for(let i=0;i<15;i++){const mid=(low+high)/2;if(fits(mid))low=mid;else high=mid;}
  return low*.9;
}
/** Building fill yields to the reviewed public excavation and station interiors. */
export function buildBasementOccupancies(definitions:BasementOccupancy[],publicAreas:FloorArea[],stationInteriors:FloorArea[]){
  const cuts=[...publicAreas.filter(a=>!a.elevationOffset),...stationInteriors].map(geometry);
  const occupied:clipping.MultiPolygon=[];
  const areas:FloorArea[]=[],contacts:{buildingId:string;surfaceIds:string[];status:'geometric-contact'|'needs-review'}[]=[];
  for(const definition of definitions){
    const raw=geometry(definition.region);
    const clipped=clipping.difference(raw,...cuts,...occupied.map(p=>[p]));
    const sorted=clipped.map(p=>({outline:p[0]!.map(([x,z])=>({x,z})),holes:p.slice(1).map(r=>r.map(([x,z])=>({x,z})))}))
      .filter(r=>area(r.outline)>1).sort((a,b)=>area(b.outline)-area(a.outline));
    let angle=0,length=0;
    for(let i=0;i<definition.region.outline.length;i++){
      const a=definition.region.outline[i]!,b=definition.region.outline[(i+1)%definition.region.outline.length]!,d=Math.hypot(b.x-a.x,b.z-a.z);
      if(d>length){length=d;angle=Math.atan2(b.z-a.z,b.x-a.x);}
    }
    if(Math.cos(angle)<0)angle+=Math.PI;
    for(const [i,region] of sorted.entries()){
      const anchor=labelPoint(region),width=labelWidth(region,anchor,angle);
      areas.push({id:'basement-'+definition.id+'-'+i,name:definition.name,blockId:'building:'+definition.id,
        kind:'commercial',level:'district-underground',...region,height:.3,label:i===0&&width>=8,labelStyle:'floor',labelAngleRad:angle,
        labelAnchor:anchor,labelWidth:width,evidence:definition.evidence});
    }
    const surfaceIds=publicAreas.filter(a=>!a.elevationOffset&&clipping.intersection(raw,geometry(a)).length>0).map(a=>a.id);
    contacts.push({buildingId:definition.id,surfaceIds,status:surfaceIds.length?'geometric-contact':'needs-review'});
    occupied.push(...clipped);
  }
  return {areas,contacts};
}
