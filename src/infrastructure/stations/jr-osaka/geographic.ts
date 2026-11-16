import {planGateBoundaries} from '../../../application/gate-boundaries.ts';
import type {Point2,StationMap} from '../../../domain/map/model.ts';
import {jrStation} from './index.ts';

/** Ground-station review slice only. Umekita needs its own frame. */
export function createGeographicJrGround():StationMap {
  const angle=-31.65*Math.PI/180,along=2.5,across=1.6;
  // Remove most of the old westward display stretch, keeping road clearance.
  const westX=(x:number)=>x< -70?-70+(x+70)*.4:x;
  const point=(p:Point2)=>({x:447+westX(p.x)*along*Math.cos(angle)-p.z*across*Math.sin(angle),
    z:610+westX(p.x)*along*Math.sin(angle)+p.z*across*Math.cos(angle)});
  const direction=(a:number)=>angle+Math.atan2(Math.sin(a)*across,Math.cos(a)*along);
  const levels=jrStation.levels.filter(l=>!l.id.startsWith('underground'));
  const levelIds=new Set(levels.map(l=>l.id));
  const nodes=jrStation.nodes.filter(n=>levelIds.has(n.level)).map(n=>({...n,...point(n)}));
  const nodeIds=new Set(nodes.map(n=>n.id));
  const gates=new Map(planGateBoundaries(jrStation.facilities,jrStation.layout.areas).map(g=>[g.gateId,g]));
  return {...jrStation,levels,nodes,
    edges:jrStation.edges.filter(e=>nodeIds.has(e.from)&&nodeIds.has(e.to)),
    facilities:jrStation.facilities.filter(f=>levelIds.has(f.level)).map(f=>({...f,...point(gates.get(f.id)?.center??f),
      rotationRad:direction(f.rotationRad??(f.axis==='z'?Math.PI/2:0))})),
    layout:{
      areas:jrStation.layout.areas.filter(a=>levelIds.has(a.level)).map(a=>({...a,
        outline:a.outline.map(point),holes:a.holes?.map(h=>h.map(point))})),
      platforms:jrStation.layout.platforms.filter(p=>p.level==='platform').map(p=>({...p,...point(p),
        length:p.length*along,width:p.width*across,rotationRad:angle})),
      connections:jrStation.layout.connections.filter(c=>levelIds.has(c.from.level)&&levelIds.has(c.to.level)).map(c=>({...c,
        from:{...c.from,...point(c.from)},to:{...c.to,...point(c.to)},
        doorFacingRad:c.doorFacingRad===undefined?undefined:direction(c.doorFacingRad)})),
      atria:jrStation.layout.atria?.map(a=>({...a,openings:a.openings.filter(o=>levelIds.has(o.level)).map(o=>({...o,outline:o.outline.map(point)}))})),
    }};
}
