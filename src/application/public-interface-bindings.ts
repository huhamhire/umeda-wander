import {pointInPolygon} from '../domain/map/geometry.ts';
import type {FloorArea,Level,Point2} from '../domain/map/model.ts';
import type {StationPublicInterface} from '../domain/map/spatial-block.ts';

export interface PublicInterfaceBinding {interfaceId:string;surfaceId:string;elevation:number;point:Point2}
/** Resolve explicitly declared gate seams to an existing same-height public face. */
export function bindPublicInterfaces(interfaces:StationPublicInterface[],areas:FloorArea[],levels:Level[]):PublicInterfaceBinding[]{
  return interfaces.map(port=>{
    const samples=[-.5,-.25,0,.25,.5].map(t=>({
      x:port.outside.x+(port.boundary[1].x-port.boundary[0].x)*t,
      z:port.outside.z+(port.boundary[1].z-port.boundary[0].z)*t,
    }));
    const face=areas.find(a=>a.kind==='public'&&Math.abs((levels.find(l=>l.id===a.level)!.y+(a.elevationOffset??0))-port.elevation)<.01&&
      samples.every(p=>pointInPolygon(p,a.outline)&&!a.holes?.some(h=>pointInPolygon(p,h))));
    if(!face)throw new Error(`Public interface has no same-height landing: ${port.id}`);
    return {interfaceId:port.id,surfaceId:face.id,elevation:port.elevation,point:{...port.outside}};
  });
}
