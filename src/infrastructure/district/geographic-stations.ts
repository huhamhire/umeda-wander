import {createGeographicHankyu} from '../stations/hankyu-umeda/geographic.ts';
import {createGeographicMetro} from '../stations/metro-umeda/geographic.ts';
import {createGeographicJrGround} from '../stations/jr-osaka/geographic.ts';
import {createGeographicUmekita} from '../stations/jr-osaka/umekita/geographic.ts';
import {createGeographicHanshin} from '../stations/hanshin-umeda/geographic.ts';
import {createGeographicHigashi} from '../stations/higashi-umeda/geographic.ts';
import {createGeographicNishi} from '../stations/nishi-umeda/geographic.ts';
import {createGeographicKitashinchi} from '../stations/kitashinchi/geographic.ts';

/** Plan review only. No legacy public passages or inferred inter-station routes. */
export function createGeographicStations(){
  const ground=createGeographicJrGround(),underground=createGeographicUmekita();
  const jr={...ground,levels:[...ground.levels,...underground.levels],
    facilities:[...ground.facilities,...underground.facilities],nodes:[...ground.nodes,...underground.nodes],
    edges:[...ground.edges,...underground.edges],layout:{...ground.layout,
      platforms:[...ground.layout.platforms,...underground.layout.platforms],
      areas:[...ground.layout.areas,...underground.layout.areas],
      connections:[...ground.layout.connections,...underground.layout.connections]}};
  return [jr,createGeographicHankyu(),createGeographicMetro(),createGeographicHanshin(),
    createGeographicHigashi(),createGeographicNishi(),createGeographicKitashinchi()];
}
