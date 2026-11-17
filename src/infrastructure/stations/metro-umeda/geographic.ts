import { axisPlacement } from '../../../domain/map/axis-calibration.ts';
import { createStation } from './index.ts';
// Working platform axis inside the previously reviewed road corridor.
// Keep the island narrower than the hall reservation; endpoints remain estimates.
export const metroAxis = {
    negativeEnd: { x: 667, z: 658 },
    positiveEnd: { x: 589, z: 465 },
    localCenter: 0,
    localLength: 122,
    acrossScale: 1.4
};
/**
 * Create the Midosuji platforms, halls and intermediate level with a calibrated JR-side interface.
 */
export function createGeographicMetro() {
    return createStation(axisPlacement(metroAxis));
}
