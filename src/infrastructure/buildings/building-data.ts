import clipping from 'polygon-clipping';
import plan from '../../../data/geography/runtime-plan.json' with {type:'json'};
import parts from '../../../data/geography/building-parts.json' with {type:'json'};
import type {Point2} from '../../domain/map/model.ts';
export interface BuildingVolume {name:string;outline:Point2[];holes:Point2[][];base:number;top:number;source:string;certainty:'osm-height'|'estimate';note:string}
export interface GeographicBuilding {id:string;name:string;volumes:BuildingVolume[]}
const project=(p:number[]):Point2=>({x:(p[0]!-135.491)*111320*Math.cos(34.708*Math.PI/180),z:(34.708-p[1]!)*111320});
export function footprint(id:string){
 const part=parts.find(p=>p.id===id);
 if(part)return {outline:part.coordinates.map(project),holes:[] as Point2[][]};
 const raw=plan.ground.find(f=>f.id==='way/'+id);if(!raw)throw new Error('Missing building '+id);
 const f=raw as unknown as {geometry:{type:string;coordinates:number[][][]}};
 if(f.geometry.type!=='Polygon')throw new Error('Expected single building polygon '+id);
 return {outline:f.geometry.coordinates[0]!.map(project),holes:f.geometry.coordinates.slice(1).map(r=>r.map(project))};
}
export function volume(id:string,name:string,base:number,top:number,certainty:BuildingVolume['certainty']='estimate'):BuildingVolume {
 return {name,...footprint(id),base,top,source:'https://www.openstreetmap.org/way/'+id,certainty,
 note:certainty==='osm-height'?'Height tag in repository OSM snapshot; not independently surveyed.':'Height or part extent estimated from reference silhouettes; not surveyed.'};
}
/** Approximate upper parts are clipped to their own host envelope. */
export function insetPart(host:BuildingVolume,name:string,base:number,top:number,xMin=0,xMax=1,zMin=0,zMax=1):BuildingVolume {
 const xs=host.outline.map(p=>p.x),zs=host.outline.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
 const rect=[{x:minX+(maxX-minX)*xMin,z:minZ+(maxZ-minZ)*zMin},{x:minX+(maxX-minX)*xMax,z:minZ+(maxZ-minZ)*zMin},{x:minX+(maxX-minX)*xMax,z:minZ+(maxZ-minZ)*zMax},{x:minX+(maxX-minX)*xMin,z:minZ+(maxZ-minZ)*zMax}];
 const clipped=clipping.intersection([host.outline.map(p=>[p.x,p.z] as [number,number])],[rect.map(p=>[p.x,p.z] as [number,number])]);
 if(!clipped[0])throw new Error('Empty tower '+name);
 return {...host,name,base,top,certainty:'estimate',note:'Reference-derived upper silhouette clipped to host; height/setback estimated.',
 outline:clipped[0][0]!.map(([x,z])=>({x,z})),holes:[]};
}
