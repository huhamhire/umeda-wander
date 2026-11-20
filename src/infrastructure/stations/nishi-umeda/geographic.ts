import { createIslandRailApproaches } from '../../island-rail-approaches.ts';
import { axisPlacement } from '../../../domain/map/axis-calibration.ts';
import { createStation } from './index.ts';
import { calibrateNishiStreetExits } from './street-exits.ts';
// Manual endpoint fit to the reviewed road / underground plan, not surveyed coordinates.
export const nishiAxis = {
    negativeEnd: { x: 415, z: 1048 },
    positiveEnd: { x: 423, z: 874 },
    localCenter: 0,
    localLength: 86,
    acrossScale: 1.35
};
/**
 * Create the west-aligned Nishi-Umeda Station (西梅田駅), including its north buffers and southern approach.
 */
export function createGeographicNishi() {
    const station = createStation(axisPlacement(nishiAxis), true);
    calibrateNishiStreetExits(station);
    for (const platform of station.layout.platforms) {
        platform.width *= nishiAxis.acrossScale;
    }
    station.layout.railApproaches = createIslandRailApproaches(station.layout.platforms, { lead: 45, tail: 65 });
    return station;
}
