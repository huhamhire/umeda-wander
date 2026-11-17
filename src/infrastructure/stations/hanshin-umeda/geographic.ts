import { axisPlacement } from '../../../domain/map/axis-calibration.ts';
import { createStation } from './index.ts';
// Manual endpoint fit to the reviewed road / underground plan, not surveyed coordinates.
export const hanshinAxis = {
    negativeEnd: { x: 612, z: 718 },
    positiveEnd: { x: 483, z: 794 },
    localCenter: 0,
    localLength: 92,
    acrossScale: 0.9
};
/**
 * Create the Hanshin map and align paid boundaries, platform widths and public interfaces.
 */
export function createGeographicHanshin() {
    const station = createStation(axisPlacement(hanshinAxis), true);
    for (const platform of station.layout.platforms) {
        platform.width *= hanshinAxis.acrossScale;
    }
    // District plan: east exit rises northward into the Whity / M16 forecourt.
    const target = { x: 659, z: 681 };
    for (const c of station.layout.connections.filter(c => c.id.includes('east-public-'))) {
        Object.assign(c.to, target);
        Object.assign(station.nodes.find(n => n.id === c.to.id)!, target);
    }
    const landing = station.layout.areas.find(a => a.id === 'hanshin-umeda-east-upper-public')!;
    landing.outline = [{ x: 649, z: 673 }, { x: 669, z: 673 }, { x: 669, z: 689 }, { x: 649, z: 689 }];
    return station;
}
