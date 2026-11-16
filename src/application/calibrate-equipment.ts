import {platformLocalPoint, platformPoint,pointInPolygon} from '../domain/map/geometry.ts';
import type {StationMap} from '../domain/map/model.ts';

/** Preserve the concourse landing; shorten the flight at its platform end only. */
export function calibratePlatformEquipment(station:StationMap):void {
  const anchors=station.facilities.flatMap(f=>{
    const match=station.layout.connections.filter(c=>c.kind===f.kind).flatMap(c=>[c.from,c.to])
      .find(n=>n.level===f.level&&Math.hypot(n.x-f.x,n.z-f.z)<.01&&(n.elevationOffset??0)===(f.elevationOffset??0));
    return match?[{facility:f,node:match}]:[];
  });
  for(const connection of station.layout.connections){
    if(!connection.platformId)continue;
    const platform=station.layout.platforms.find(p=>p.id===connection.platformId)!;
    const moving=connection.from.level===platform.level?connection.from:connection.to;
    const fixed=moving===connection.from?connection.to:connection.from;
    if(connection.kind==='elevator'){
      // A shifted hall cannot turn a lift into a sloping shaft.
      fixed.x=moving.x;fixed.z=moving.z;
      Object.assign(station.nodes.find(n=>n.id===fixed.id)??{},fixed);
      continue;
    }
    const elevation=(n:typeof moving)=>station.levels.find(l=>l.id===n.level)!.y+(n.elevationOffset??0);
    const rise=Math.abs(elevation(moving)-elevation(fixed));
    const run=Math.hypot(moving.x-fixed.x,moving.z-fixed.z),limit=rise/Math.tan(27*Math.PI/180);
    if(rise<.1||run<=limit)continue;
    const local=platformLocalPoint(platform,{x:fixed.x+(moving.x-fixed.x)*limit/run,z:fixed.z+(moving.z-fixed.z)*limit/run});
    Object.assign(moving,platformPoint(platform,
      Math.max(-platform.length/2+1,Math.min(platform.length/2-1,local.x)),
      Math.max(-platform.width/2+1,Math.min(platform.width/2-1,local.z))));
    Object.assign(station.nodes.find(n=>n.id===moving.id)??{},moving);
  }
  const supported=(n:StationMap['nodes'][number],point:typeof n)=>station.layout.areas.some(a=>a.level===n.level&&pointInPolygon(point,a.outline)&&!a.holes?.some(h=>pointInPolygon(point,h)));
  for(const connection of station.layout.connections.filter(c=>!c.platformId)){
    const elevation=(n:typeof connection.from)=>station.levels.find(l=>l.id===n.level)!.y+(n.elevationOffset??0);
    const low=elevation(connection.from)<elevation(connection.to)?connection.from:connection.to,high=low===connection.from?connection.to:connection.from;
    const run=Math.hypot(high.x-low.x,high.z-low.z),rise=Math.abs(elevation(high)-elevation(low));
    if(connection.kind==='elevator'){
      if(run<1e-6)continue;
      if(supported(low,{...low,x:high.x,z:high.z})){low.x=high.x;low.z=high.z;}
      else if(supported(high,{...high,x:low.x,z:low.z})){high.x=low.x;high.z=low.z;}
    }else if(rise>2){
      const limit=rise/Math.tan((connection.kind==='escalator'?27:20)*Math.PI/180);
      if(run<=limit)continue;
      const lower={...low,x:high.x+(low.x-high.x)*limit/run,z:high.z+(low.z-high.z)*limit/run};
      const upper={...high,x:low.x+(high.x-low.x)*limit/run,z:low.z+(high.z-low.z)*limit/run};
      if(supported(low,lower))Object.assign(low,lower);
      else if(supported(high,upper))Object.assign(high,upper);
    }
    for(const n of [low,high])Object.assign(station.nodes.find(p=>p.id===n.id)??{},n);
  }
  for(const {facility,node} of anchors){facility.x=node.x;facility.z=node.z;}
}
