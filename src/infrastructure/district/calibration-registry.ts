import type {StationCalibration} from '../../domain/map/spatial-block.ts';
import {osmBuildingEnvelopes} from '../geography/osm-envelope.ts';
import type {OsmPlanFeature} from '../geography/osm-envelope.ts';
import {jrCalibrationSource} from '../stations/jr-osaka/calibration.ts';
import {hankyuCalibrationSource} from '../stations/hankyu-umeda/calibration.ts';
import {metroCalibration} from '../stations/metro-umeda/calibration.ts';

/** Phase-two pilot only. Assembly does not infer walkable links from overlapping plans. */
export function createPilotCalibrations(features:OsmPlanFeature[]):StationCalibration[] {
  return [jrCalibrationSource,hankyuCalibrationSource].map<StationCalibration>(c=>({station:c.station,
    status:'envelope-review' as const,envelopes:osmBuildingEnvelopes(features,c.buildingId),notes:c.notes}))
    .concat([metroCalibration]);
}
