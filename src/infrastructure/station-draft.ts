import type {Evidence,Facility,FloorArea,Level,LevelId,Platform,RouteEdge,RouteNode,StationId,StationLayout,VerticalConnection} from '../domain/map/model.ts';
import {rotatePoint} from '../domain/map/geometry.ts';

export interface StationDraft {
  id:StationId; name:string; levels:Level[]; facilities:Facility[]; nodes:RouteNode[]; edges:RouteEdge[]; layout:StationLayout;
}
/** Local plan coordinates are separate from the schematic district placement. */
export function stationDraft(id:StationId,name:string,source:Evidence['source'],origin:{x:number;z:number},angle:number,acrossSign:1|-1=1,planScale:number|{along:number;across:number}=1){
  const scale=typeof planScale==='number'?{along:planScale,across:planScale}:planScale;
  const draft:StationDraft={id,name,levels:[],facilities:[],nodes:[],edges:[],layout:{areas:[],platforms:[],connections:[]}};
  const proof=(detail:string):Evidence=>({source,pages:[1],detail});
  const point=(x:number,z:number)=>{const p=rotatePoint({x:x*scale.along,z:z*acrossSign*scale.across},{x:0,z:0},angle);return {x:p.x+origin.x,z:p.z+origin.z};};
  const area=(key:string,level:LevelId,label:string,kind:FloorArea['kind'],x:number,z:number,w:number,d:number,height?:number)=>{
    draft.layout.areas.push({id:`${id}-${key}`,level,name:label,kind,outline:[point(x-w/2,z-d/2),point(x+w/2,z-d/2),point(x+w/2,z+d/2),point(x-w/2,z+d/2)],label:true,height,evidence:proof(label)});
  };
  const facility=(key:string,level:LevelId,label:string,kind:Facility['kind'],x:number,z:number,note:string,rotation=0)=>{
    const localAngle=acrossSign===1?rotation:kind==='ticket-machine'?Math.PI-rotation:-rotation;
    const result:Facility={id:`${id}-${key}`,level,name:label,kind,...point(x,z),rotationRad:angle+localAngle,note,evidence:proof(label)};
    draft.facilities.push(result);return result;
  };
  const node=(key:string,level:LevelId,x:number,z:number)=>{const result:RouteNode={id:`${id}-${key}`,level,...point(x,z)};draft.nodes.push(result);return result;};
  const edge=(a:RouteNode,b:RouteNode,kind:RouteEdge['kind']='walk')=>draft.edges.push({from:a.id,to:b.id,kind,cost:Math.max(1,Math.hypot(b.x-a.x,b.z-a.z))});
  const connection=(key:string,kind:VerticalConnection['kind'],from:RouteNode,to:RouteNode,platformId?:string)=>{
    const result:VerticalConnection={id:`${id}-${key}`,kind,from,to,platformId,evidence:proof(key)};
    if(kind==='elevator'&&!platformId)result.doorFacingRad=angle;
    draft.layout.connections.push(result);return result;
  };
  const platform=(key:string,level:LevelId,tracks:number[],x:number,z:number,length:number,width:number,extra:Partial<Platform>={})=>{
    const p:Platform={id:`${id}-${key}`,level,tracks,...point(x,z),length:length*scale.along,width:width*scale.across,rotationRad:angle,evidence:proof(`Platform ${tracks.join('/')}`),...extra};
    if(acrossSign===-1&&p.trackSides)p.trackSides=p.trackSides.map(side=>side===1?-1:1);
    draft.layout.platforms.push(p);return p;
  };
  return {draft,proof,point,area,facility,node,edge,connection,platform};
}
