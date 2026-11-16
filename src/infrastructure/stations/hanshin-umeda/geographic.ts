import {axisPlacement} from '../../../domain/map/axis-calibration.ts';
import {createStation} from './index.ts';

// Manual endpoint fit to the reviewed road / underground plan, not surveyed coordinates.
export const hanshinAxis={negativeEnd:{x:612,z:718},positiveEnd:{x:483,z:794},
  localCenter:0,localLength:92,acrossScale:0.9};
export function createGeographicHanshin(){const station=createStation(axisPlacement(hanshinAxis),true);
  for(const platform of station.layout.platforms)platform.width*=hanshinAxis.acrossScale;
  return station;}
