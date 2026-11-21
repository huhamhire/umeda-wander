import type { VerticalConnection } from '../../domain/map/model.ts';

export const escalatorOverallWidth = 2.3;
export const escalatorTreadWidth = 1.35;
export const escalatorLaneSpacing = 2.45;
export const escalatorStepCount = 28;
export const equipmentBaseLift = 0.65;
/** Independent, genuinely side-by-side lanes sharing a diagram reference. */
export function connectionLanes(connection: VerticalConnection): VerticalConnection[] {
    const lanes = connection.lanes ?? 1;
    if (lanes === 1) {
        return [connection];
    }
    const dx = connection.to.x - connection.from.x;
    const dz = connection.to.z - connection.from.z;
    const length = Math.hypot(dx, dz);
    if (length < 1e-6) {
        throw new Error('Parallel escalators need a horizontal run');
    }
    return Array.from({ length: lanes }, (_, index) => {
        const side = index - (lanes - 1) / 2;
        const offset = side * (connection.laneSpacing ?? escalatorLaneSpacing);
        const ox = -dz / length * offset;
        const oz = dx / length * offset;
        return {
            ...connection,
            id: `${connection.id}:lane-${index + 1}`,
            lanes: 1,
            from: { ...connection.from, x: connection.from.x + ox, z: connection.from.z + oz },
            to: { ...connection.to, x: connection.to.x + ox, z: connection.to.z + oz }
        };
    });
}
