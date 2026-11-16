import {applySouthEntrance} from '../stations/jr-osaka/south-entrance.ts';
import {building as southBuilding} from '../buildings/daimaru/index.ts';
import {platformLocalPoint,platformPoint} from '../../domain/map/geometry.ts';
import {restoreMapRails} from '../geography/runtime-rails.ts';
import {westWalkway} from '../stations/jr-osaka/umekita/west-walkway.ts';
import {createGeographicHankyu} from '../stations/hankyu-umeda/geographic.ts';
import {createGeographicMetro} from '../stations/metro-umeda/geographic.ts';
import {createGeographicJrGround} from '../stations/jr-osaka/geographic.ts';
import {createGeographicUmekita} from '../stations/jr-osaka/umekita/geographic.ts';
import {createGeographicHanshin} from '../stations/hanshin-umeda/geographic.ts';
import {createGeographicHigashi} from '../stations/higashi-umeda/geographic.ts';
import {createGeographicNishi} from '../stations/nishi-umeda/geographic.ts';
import {createGeographicKitashinchi} from '../stations/kitashinchi/geographic.ts';

/** Geographic station assembly. Public-area geometry is owned by separate blocks. */
export function createGeographicStations(){
  const ground=createGeographicJrGround(),underground=createGeographicUmekita();
  applySouthEntrance(ground,southBuilding.entrance!);
  const west=westWalkway(ground,underground);
  const jr={...ground,levels:[...ground.levels,...underground.levels],
    facilities:[...ground.facilities,...underground.facilities],nodes:[...new Map([...ground.nodes,...underground.nodes,...west.nodes].map(n=>[n.id,n])).values()],
    edges:[...ground.edges,...underground.edges],layout:{...ground.layout,
      platforms:[...ground.layout.platforms,...underground.layout.platforms],
      areas:[...ground.layout.areas,...underground.layout.areas,...west.areas],
      connections:[...ground.layout.connections,...underground.layout.connections,...west.connections]}};
  const stations=[jr,createGeographicHankyu(),createGeographicMetro(),createGeographicHanshin(),
    createGeographicHigashi(),createGeographicNishi(),createGeographicKitashinchi()];
  // Preserve upper landing/slab alignment; shorten platform-side runs to a readable slope.
  for(const station of stations)for(const c of station.layout.connections){
    if(!c.platformId||c.kind==='elevator')continue;
    const y=(n:typeof c.from)=>station.levels.find(l=>l.id===n.level)!.y+(n.elevationOffset??0);
    const low=y(c.from)<y(c.to)?c.from:c.to,high=low===c.from?c.to:c.from;
    const rise=Math.abs(y(high)-y(low)),run=Math.hypot(high.x-low.x,high.z-low.z),limit=rise/Math.tan(27*Math.PI/180);
    if(rise<.1||run<=limit)continue;
    const platform=station.layout.platforms.find(p=>p.id===c.platformId)!;
    const local=platformLocalPoint(platform,{x:high.x+(low.x-high.x)*limit/run,z:high.z+(low.z-high.z)*limit/run});
    Object.assign(low,platformPoint(platform,Math.max(-platform.length/2+1,Math.min(platform.length/2-1,local.x)),Math.max(-platform.width/2+1,Math.min(platform.width/2-1,local.z))));
    Object.assign(station.nodes.find(n=>n.id===low.id)??{},low);
  }
  // B1 gate interfaces fitted to the existing shared northern public band.
  for(const [id,dx,dz] of [['kitashinchi',.3,-5.5]] as const){
    const station=stations.find(s=>s.id===id)!,hall=station.levels.find(l=>l.y===-8)!.id;
    for(const area of station.layout.areas.filter(a=>a.level===hall))for(const p of [area.outline,...area.holes??[]].flat()){p.x+=dx;p.z+=dz;}
    const moved=new Set<object>();
    for(const p of [...station.facilities,...station.nodes,...station.layout.connections.flatMap(c=>[c.from,c.to])])if(p.level===hall&&!moved.has(p)){p.x+=dx;p.z+=dz;moved.add(p);}
  }
  restoreMapRails(stations);
  return stations;
}
