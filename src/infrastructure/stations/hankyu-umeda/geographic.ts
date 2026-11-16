import {axisPlacement} from '../../../domain/map/axis-calibration.ts';
import {createStation} from './index.ts';

// Working endpoint fit inside OSM station 139168082. Metres in the ground frame.
// The endpoint positions are manual estimates, not OSM platform measurements.
// Move about 40 m north along the station axis, including the southern halls.
export const hankyuAxis={negativeEnd:{x:696,z:370},positiveEnd:{x:655,z:175},
  localCenter:12,localLength:110,acrossScale:1.08};
export function createGeographicHankyu(){return createStation(axisPlacement(hankyuAxis));}
