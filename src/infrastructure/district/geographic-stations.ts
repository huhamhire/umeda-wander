import {createGeographicHankyu} from '../stations/hankyu-umeda/geographic.ts';
import {createGeographicMetro} from '../stations/metro-umeda/geographic.ts';
import {createGeographicJrGround} from '../stations/jr-osaka/geographic.ts';

/** Review collection; deliberately not joined to the legacy public passages. */
export function createGeographicStations(){return [createGeographicJrGround(),createGeographicHankyu(),createGeographicMetro()];}
