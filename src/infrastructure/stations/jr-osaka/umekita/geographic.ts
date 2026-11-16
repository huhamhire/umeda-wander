import {planGateBoundaries} from '../../../../application/gate-boundaries.ts';
import type {Point2,StationMap} from '../../../../domain/map/model.ts';
import {platformBow,platformTangent} from '../../../../domain/map/geometry.ts';
import {jrStation} from '../index.ts';

// OSM ways 695972638/695972639 in the repository snapshot; see calibration notes.
// OSM outline fit: about 12 m bow over 215 m; not the transverse bounding-box width.
export const umekitaFit={center:{x:196.35,z:585.92},angle:-62.665*Math.PI/180,
  along:2.5,across:1.17};
export function createGeographicUmekita():StationMap {
  const platforms=jrStation.layout.platforms.filter(p=>p.level==='underground-platform');
  const oldAngle=platforms[0]!.rotationRad;
  const oldCenter={x:platforms.reduce((s,p)=>s+p.x,0)/2,z:platforms.reduce((s,p)=>s+p.z,0)/2};
  const {center,angle,along,across}=umekitaFit;
  const bowFrame={length:215,rotationRad:angle,planBow:{sag:12,offset:-6}} as typeof platforms[number];
  const localAlong=(p:Point2)=>((p.x-oldCenter.x)*Math.cos(oldAngle)+(p.z-oldCenter.z)*Math.sin(oldAngle))*along;
  const point=(p:Point2)=>{
    const dx=p.x-oldCenter.x,dz=p.z-oldCenter.z;
    const u=(dx*Math.cos(oldAngle)+dz*Math.sin(oldAngle))*along;
    const v=(-dx*Math.sin(oldAngle)+dz*Math.cos(oldAngle))*across+platformBow(bowFrame,u);
    return {x:center.x+u*Math.cos(angle)-v*Math.sin(angle),z:center.z+u*Math.sin(angle)+v*Math.cos(angle)};
  };
  const direction=(a:number)=>angle+Math.atan2(Math.sin(a-oldAngle)*across,Math.cos(a-oldAngle)*along);
  const ring=(points:Point2[])=>points.flatMap((a,i)=>{
    const b=points[(i+1)%points.length]!,steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2));
    return Array.from({length:steps},(_,j)=>point({x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps}));
  });
  const heading=(f:Point2,a:number)=>{const p=point(f),q=point({x:f.x+Math.cos(a)*.01,z:f.z+Math.sin(a)*.01});return Math.atan2(q.z-p.z,q.x-p.x);};
  // Keep only the station core; the paid west walkway and LUCUA public route
  // need independent endpoints in their respective geographic blocks.
  const connectionIds=new Set(['umekita-94','umekita-95','umekita-96','umekita-97','umekita-ad','umekita-ae']);
  const connections=jrStation.layout.connections.filter(c=>connectionIds.has(c.id)).map(c=>({...c,
    from:{...c.from,...point(c.from)},to:{...c.to,...point(c.to)},
    doorFacingRad:c.doorFacingRad===undefined?undefined:direction(c.doorFacingRad)+platformTangent(bowFrame,localAlong(c.to))-angle}));
  const facilityIds=new Set(['umekita-gate','umekita-platform','machines-umekita','umekita-94-poi','umekita-96-poi']);
  const nodes=[...new Map(connections.flatMap(c=>[c.from,c.to]).map(n=>[n.id,n])).values()];
  const gates=new Map(planGateBoundaries(jrStation.facilities,jrStation.layout.areas).map(g=>[g.gateId,g]));
  return {id:'jr-osaka',name:'JR 梅北地下站台',
    levels:jrStation.levels.filter(l=>l.id.startsWith('underground')).map(l=>({...l})),
    nodes,edges:[],
    facilities:jrStation.facilities.filter(f=>facilityIds.has(f.id)).map(f=>({...f,...point(gates.get(f.id)?.center??f),
      rotationRad:heading(f,f.rotationRad??(f.axis==='z'?Math.PI/2:0))})),
    layout:{
      platforms:platforms.map(p=>{const pos=point(p);return {...p,x:pos.x+Math.sin(angle)*platformBow(bowFrame,0),z:pos.z-Math.cos(angle)*platformBow(bowFrame,0),length:p.length*along,width:p.width*across,rotationRad:angle,planBow:{...bowFrame.planBow!}};}),
      areas:jrStation.layout.areas.filter(a=>['umekita-public','umekita-paid'].includes(a.id)).map(a=>({...a,
        outline:ring(a.outline),holes:a.holes?.map(ring)})),
      connections,
    }};
}
