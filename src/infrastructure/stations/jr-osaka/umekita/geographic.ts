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
  // Keep only the station core; the paid west walkway and LUCUA public route
  // need independent endpoints in their respective geographic blocks.
  const connectionIds=new Set(['umekita-94','umekita-95','umekita-96','umekita-97','umekita-ad','umekita-ae']);
  const connections=jrStation.layout.connections.filter(c=>connectionIds.has(c.id)).map(c=>({...c,
    from:{...c.from,...point(c.from)},to:{...c.to,...point(c.to)},
    doorFacingRad:c.doorFacingRad===undefined?undefined:direction(c.doorFacingRad)+platformTangent(bowFrame,localAlong(c.to))-angle}));
  const facilityIds=new Set(['umekita-gate','umekita-platform','machines-umekita','umekita-94-poi','umekita-96-poi']);
  const nodes=[...new Map(connections.flatMap(c=>[c.from,c.to]).map(n=>[n.id,n])).values()];
  return {id:'jr-osaka',name:'JR 梅北地下站台',
    levels:jrStation.levels.filter(l=>l.id.startsWith('underground')).map(l=>({...l})),
    nodes,edges:[],
    facilities:jrStation.facilities.filter(f=>facilityIds.has(f.id)).map(f=>({...f,...point(f),
      rotationRad:direction(f.rotationRad??0)+platformTangent(bowFrame,localAlong(f))-angle})),
    layout:{
      platforms:platforms.map(p=>{const pos=point(p);return {...p,x:pos.x+Math.sin(angle)*platformBow(bowFrame,0),z:pos.z-Math.cos(angle)*platformBow(bowFrame,0),length:p.length*along,width:p.width*across,rotationRad:angle,planBow:{...bowFrame.planBow!}};}),
      areas:jrStation.layout.areas.filter(a=>['umekita-public','umekita-paid'].includes(a.id)).map(a=>({...a,
        outline:a.outline.map(point),holes:a.holes?.map(h=>h.map(point))})),
      connections,
    }};
}
