import type {StationId,StationMap} from '../../domain/map/model.ts';
import {calibratePlatformEquipment} from '../../application/calibrate-equipment.ts';
import {restoreMapRails} from '../geography/runtime-rails.ts';
import {createGeographicJr} from '../stations/jr-osaka/geographic-station.ts';
import {createGeographicHankyu} from '../stations/hankyu-umeda/geographic.ts';
import {createGeographicMetro} from '../stations/metro-umeda/geographic.ts';
import {createGeographicHanshin} from '../stations/hanshin-umeda/geographic.ts';
import {createGeographicHigashi} from '../stations/higashi-umeda/geographic.ts';
import {createGeographicNishi} from '../stations/nishi-umeda/geographic.ts';
import {createGeographicKitashinchi} from '../stations/kitashinchi/geographic.ts';

const factories:Record<StationId,()=>StationMap>={
  'jr-osaka':createGeographicJr,'hankyu-umeda':createGeographicHankyu,'metro-umeda':createGeographicMetro,
  'hanshin-umeda':createGeographicHanshin,'higashi-umeda':createGeographicHigashi,
  'nishi-umeda':createGeographicNishi,'kitashinchi':createGeographicKitashinchi,
};
export const geographicStationIds=Object.keys(factories) as StationId[];
/** Independent preview and district assembly use exactly the same final station. */
export function createGeographicStation(id:StationId):StationMap {
  const station=factories[id]();
  calibratePlatformEquipment(station);
  restoreMapRails([station]);
  return station;
}
export function createGeographicStations():StationMap[]{return geographicStationIds.map(createGeographicStation);}
