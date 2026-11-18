/** Metric frame shared by the surface station, adjoining LUCUA (ルクア) frontage and rail corridors. */
export const jrGroundFrame = {
    origin: { x: 447, z: 610 },
    angle: -31.65 * Math.PI / 180,
    along: 2.5,
    across: 1.2,
    acrossOffset: 4,
    platformWidth: .9,
    eastSetback: 12
};

/** Convert metre coordinates along the JR platform axis and toward its south side. */
export function jrAxisPoint(along: number, across: number): { x: number; z: number } {
    const { origin, angle } = jrGroundFrame;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return {
        x: origin.x + along * c - across * s,
        z: origin.z + along * s + across * c
    };
}
