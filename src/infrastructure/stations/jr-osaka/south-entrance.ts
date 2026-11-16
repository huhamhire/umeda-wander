import type {StationMap,Point2,VerticalConnection} from '../../../domain/map/model.ts';
import type {BuildingEntrance} from '../../buildings/building-data.ts';
/** JR public entrance landings share the commercial facade's explicit entrance interface. */
export function applySouthEntrance(station:StationMap,e:BuildingEntrance):void {
 const c=Math.cos(e.angle),s=Math.sin(e.angle),point=(u:number,v:number):Point2=>({x:e.center.x+u*c-v*s,z:e.center.z+u*s+v*c});
 const proof={source:'district' as const,pages:[],detail:'User south entrance facade photo: recessed two-level portal with flanking paired escalators. Local geometry and floor heights schematic.'};
 station.layout.areas=station.layout.areas.filter(a=>!['south-building-2f','south-gate-west-escalator-ground'].includes(a.id));
 station.layout.areas.push({id:'south-entrance-ground',level:'concourse',name:'大阪站南侧入口',kind:'public',label:false,elevationOffset:1.3,evidence:proof,
  outline:[[-24,-14],[24,-14],[24,7],[-24,7]].map(([u,v])=>point(u!,v!))},
 {id:'south-entrance-deck',level:'south-deck',name:'南侧二层退避回廊',kind:'public',label:false,evidence:proof,
  outline:[[-24,-14],[24,-14],[24,3],[10,3],[10,-7],[-10,-7],[-10,3],[-24,3]].map(([u,v])=>point(u!,v!))});
 const existing=station.layout.connections.find(c=>c.id==='south-building-61')!;
 const move=(n:typeof existing.from,u:number,v:number)=>{Object.assign(n,point(u,v));Object.assign(station.nodes.find(p=>p.id===n.id)??{},n);};
 move(existing.from,-15,2);move(existing.to,-15,-3);existing.lanes=2;
 const east:VerticalConnection={...existing,id:'south-entrance-east-escalators',evidence:proof,
  from:{...existing.from,id:'south-entrance-east-low',...point(15,2)},to:{...existing.to,id:'south-entrance-east-high',...point(15,-3)}};
 station.layout.connections.push(east);station.nodes.push(east.from,east.to);
 const lift=station.layout.connections.find(c=>c.id==='south-lift-u')!;move(lift.from,-20,-10);move(lift.to,-20,-10);
}
