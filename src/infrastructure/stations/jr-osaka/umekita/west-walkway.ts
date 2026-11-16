import type {StationMap,Point2,RouteNode,VerticalConnection,FloorArea} from '../../../../domain/map/model.ts';
import {platformPoint,passageOutline} from '../../../../domain/map/geometry.ts';
import {jrStation} from '../index.ts';
/** Paid west link joins independently calibrated JR and Umekita frames. */
export function westWalkway(ground:StationMap,umekita:StationMap){
 const centroid=(points:Point2[])=>points.reduce((s,p)=>({x:s.x+p.x/points.length,z:s.z+p.z/points.length}),{x:0,z:0});
 const start=centroid(ground.layout.areas.find(a=>a.id==='west-paid')!.outline);
 const island=umekita.layout.platforms.find(p=>p.id==='p21-22')!;
 // The arrival bay sits outside the eastern platform/track envelope, not between the islands.
 const end=platformPoint(island,-15,12),arrivalLow=platformPoint(island,-15,27),lift=platformPoint(island,-7,12);
 const arrivalBay=[[-24,8],[-1,8],[-1,33],[-24,33]].map(([u,v])=>platformPoint(island,u!,v!));
 const length=Math.hypot(end.x-start.x,end.z-start.z),direction={x:(end.x-start.x)/length,z:(end.z-start.z)/length};
 const at=(p:Point2,d:number)=>({x:p.x+direction.x*d,z:p.z+direction.z*d});
 const node=(id:string,level:RouteNode['level'],p:Point2):RouteNode=>({id,level,...p});
 const a=node('west-lower','concourse',start),b=node('walkway-start','underground-platform',at(start,26));
 const c=node('walkway-end','underground-platform',arrivalLow),d=node('umekita-arrival','underground-hall',end);
 const proof=jrStation.layout.connections.find(c=>c.id==='west-92')!.evidence;
 const connection=(id:string,kind:VerticalConnection['kind'],from:RouteNode,to:RouteNode):VerticalConnection=>({id,kind,from,to,evidence:jrStation.layout.connections.find(c=>c.id===id)?.evidence??proof,doorFacingRad:Math.atan2(direction.z,direction.x)});
 const lateral={x:-direction.z*5,z:direction.x*5};
 const shift=(p:Point2)=>({x:p.x+lateral.x,z:p.z+lateral.z});
 const ab=node('ab-1','concourse',shift(start)),abLow=node('ab-b2','underground-platform',shift(start));
 const ac=node('ac-b1','underground-hall',lift),acLow=node('ac-b2','underground-platform',lift);
 const connections=[connection('west-92','escalator',a,b),connection('umekita-93','escalator',c,d),connection('walkway-ab','elevator',ab,abLow),connection('walkway-ac','elevator',ac,acLow)];
 for(const c of connections.filter(c=>c.kind==='escalator')){c.lanes=2;c.laneSpacing=5.6;}
 connections.find(c=>c.id==='walkway-ac')!.doorFacingRad=island.rotationRad+Math.PI/2;
 const stairs=connections.filter(c=>c.kind==='escalator').map(c=>({...c,id:c.id+'-stairs',kind:'stairs' as const,lanes:undefined,width:2.8,stairLandingLength:2,
  from:{...c.from,id:c.from.id+'-stairs'},to:{...c.to,id:c.to.id+'-stairs'}}));
 connections.push(...stairs);
 const area=(id:string,level:RouteNode['level'],outline:Point2[]):FloorArea=>({id,level,outline,kind:'paid',name:'西口—梅北 闸内联络通道',label:false,evidence:proof});
 const pad=(p:Point2)=>[{x:p.x-8,z:p.z-8},{x:p.x+8,z:p.z-8},{x:p.x+8,z:p.z+8},{x:p.x-8,z:p.z+8}];
 return {connections,nodes:connections.flatMap(c=>[c.from,c.to]),areas:[area('underground-walkway','underground-platform',passageOutline(start,arrivalLow,9)),area('walkway-ab-b2-bay','underground-platform',pad(abLow)),area('walkway-ac-b2-bay','underground-platform',arrivalBay)]};
}
