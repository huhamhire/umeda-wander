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
  const jr={...ground,levels:[...ground.levels,...underground.levels],
    facilities:[...ground.facilities,...underground.facilities],nodes:[...ground.nodes,...underground.nodes],
    edges:[...ground.edges,...underground.edges],layout:{...ground.layout,
      platforms:[...ground.layout.platforms,...underground.layout.platforms],
      areas:[...ground.layout.areas,...underground.layout.areas],
      connections:[...ground.layout.connections,...underground.layout.connections]}};
  const stations=[jr,createGeographicHankyu(),createGeographicMetro(),createGeographicHanshin(),
    createGeographicHigashi(),createGeographicNishi(),createGeographicKitashinchi()];
  // Keep platform anchors; limit migrated flights to a readable 27-degree slope.
  for(const station of stations)for(const c of station.layout.connections){
    if(!c.platformId||c.kind==='elevator')continue;
    const y=(n:typeof c.from)=>station.levels.find(l=>l.id===n.level)!.y+(n.elevationOffset??0);
    const low=y(c.from)<y(c.to)?c.from:c.to,high=low===c.from?c.to:c.from;
    const rise=Math.abs(y(high)-y(low)),run=Math.hypot(high.x-low.x,high.z-low.z),limit=rise/Math.tan(27*Math.PI/180);
    if(rise<.1||run<=limit)continue;
    high.x=low.x+(high.x-low.x)*limit/run;high.z=low.z+(high.z-low.z)*limit/run;
    Object.assign(station.nodes.find(n=>n.id===high.id)??{},high);
  }
  return stations;
}
