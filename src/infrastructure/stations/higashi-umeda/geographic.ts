import {axisPlacement} from '../../../domain/map/axis-calibration.ts';
import {createStation} from './index.ts';

// Manual endpoint fit to the reviewed road / underground plan, not surveyed coordinates.
export const higashiAxis={negativeEnd:{x:824,z:927},positiveEnd:{x:768,z:762},
  localCenter:0,localLength:86,acrossScale:1};
export function createGeographicHigashi(){return createStation(axisPlacement(higashiAxis),true);}
