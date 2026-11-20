import { axisPlacement } from '../../../domain/map/axis-calibration.ts';
import { createStation } from './index.ts';
import { calibrateHigashiStreetExits } from './street-exits.ts';
import { calibrateHigashiBuildingExits } from './building-exits.ts';
// Manual endpoint fit to the reviewed road / underground plan, not surveyed coordinates.
export const higashiAxis = {
    negativeEnd: { x: 824, z: 927 },
    positiveEnd: { x: 768, z: 762 },
    localCenter: 0,
    localLength: 86,
    acrossScale: 1
};
/**
 * Create the side platforms of Higashi-Umeda (東梅田駅) and their independent gate relationships on the calibrated axis.
 */
export function createGeographicHigashi() {
    const station = createStation(axisPlacement(higashiAxis), true);
    calibrateHigashiStreetExits(station);
    calibrateHigashiBuildingExits(station);
    return station;
}
