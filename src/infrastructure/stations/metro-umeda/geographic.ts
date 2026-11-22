import { axisPlacement } from '../../../domain/map/axis-calibration.ts';
import { rotatePoint } from '../../../domain/map/geometry.ts';
import { createStation, northPaidBounds } from './index.ts';
import { southConcourse } from './south-concourse.ts';
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
 * Create the Midosuji Line (御堂筋線) platforms, halls and intermediate level with a calibrated JR-side interface.
 */
export function createGeographicMetro() {
    return createStation(axisPlacement(metroAxis));
}

/** Project a local Midosuji Line (御堂筋線) plan outline in the calibrated station frame. */
export function metroPlanOutline(local: [number, number][]) {
    const { origin, angle, planScale } = axisPlacement(metroAxis);
    return local.map(([along, across]) => {
        const point = rotatePoint({ x: along * planScale.along, z: across * planScale.across }, { x: 0, z: 0 }, angle);
        return { x: origin.x + point.x, z: origin.z + point.z };
    });
}

/** Keep the B1 regional projection outside the paid E/J approach north of the south gate. */
export function metroSouthShaftClearance() {
    const { stairEdge, shaftNorth, halfWidth } = southConcourse;
    return { outline: metroPlanOutline([
        [stairEdge - .5, -halfWidth], [shaftNorth, -halfWidth], [shaftNorth, halfWidth], [stairEdge - .5, halfWidth]
    ]) };
}

/** Remove the B1 projection spur beside the paid west wall while leaving the 3A junction open. */
export function metroNorthWallClearance() {
    const west = -northPaidBounds.halfWidth;
    return { outline: metroPlanOutline([[43, -23], [55.5, -22], [56, west], [43, west]]) };
}
