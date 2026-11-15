import type {Level,LevelId,VerticalConnection} from '../domain/map/model.ts';
import {viewLayerRole} from './view-layer.ts';

/** Keep every segment of a continuous shaft once one served floor is exposed. */
export function visibleElevatorConnections(connections:VerticalConnection[],levels:Level[],focus:LevelId|'all'):Set<string>{
  const lifts=connections.filter(c=>c.kind==='elevator');
  const visible=new Set(lifts.filter(c=>[c.from,c.to].some(p=>viewLayerRole(levels,{level:focus},p.level)!=='hidden')).map(c=>c.id));
  let changed=true;
  while(changed){
    changed=false;
    for(const c of lifts){
      if(visible.has(c.id))continue;
      if(lifts.some(other=>visible.has(other.id)&&[c.from,c.to].some(p=>[other.from,other.to].some(q=>
        p.level===q.level&&Math.hypot(p.x-q.x,p.z-q.z)<0.01&&Math.abs((p.elevationOffset??0)-(q.elevationOffset??0))<0.01)))){
        visible.add(c.id);changed=true;
      }
    }
  }
  return visible;
}
