import {createIslandRailApproaches} from '../../island-rail-approaches.ts';
import {axisPlacement} from '../../../domain/map/axis-calibration.ts';
import {createStation} from './index.ts';

// Manual endpoint fit to the reviewed road / underground plan, not surveyed coordinates.
export const kitashinchiAxis={negativeEnd:{x:458,z:1080},positiveEnd:{x:668,z:1090},
  localCenter:0,localLength:100,acrossScale:1.4};
export function createGeographicKitashinchi(){const station=createStation(axisPlacement(kitashinchiAxis),true);
  for(const platform of station.layout.platforms)platform.width*=kitashinchiAxis.acrossScale;
  station.layout.railApproaches=createIslandRailApproaches(station.layout.platforms,{lead:45,tail:65});
  return station;}
