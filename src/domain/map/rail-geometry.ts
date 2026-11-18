import type { Platform, Point2, RailApproach, RailSegment } from './model.ts';
import { platformPoint } from './geometry.ts';

/** Shared by the platform rails and their external continuation. */
export function platformRail(platform: Platform, index: number) {
    const side = platform.trackSides?.[index] ?? (platform.tracks.length === 1 || index === 0 ? 1 : -1);
    const across = side * (platform.width / 2 + 1.65);
    const length = platform.terminal ? platform.length - 3 : platform.length + 7;
    const center = platform.terminal ? (platform.terminalEnd === 'end' ? -1.5 : 1.5) : 0;
    return {
        side,
        across,
        length,
        center,
        start: platformPoint(platform, center - length / 2, across),
        end: platformPoint(platform, center + length / 2, across)
    };
}

/** Analytic tangents keep paired rails continuous through shared junction nodes. */
export function sampleRailSegment(approach: RailApproach, segment: RailSegment, steps = 24) {
    const a = approach.nodes.find(n => n.id === segment.from)!.point;
    const b = approach.nodes.find(n => n.id === segment.to)!.point;
    const c = segment.control1;
    const d = segment.control2;
    return Array.from(
        { length: steps + 1 },
        (_, i) => {
            const t = i / steps;
            const u = 1 - t;
            const point = {
                x: u * u * u * a.x + 3 * u * u * t * c.x + 3 * u * t * t * d.x + t * t * t * b.x,
                z: u * u * u * a.z + 3 * u * u * t * c.z + 3 * u * t * t * d.z + t * t * t * b.z
            };
            const dx = 3 * u * u * (c.x - a.x) + 6 * u * t * (d.x - c.x) + 3 * t * t * (b.x - d.x);
            const dz = 3 * u * u * (c.z - a.z) + 6 * u * t * (d.z - c.z) + 3 * t * t * (b.z - d.z);
            const length = Math.hypot(dx, dz);
            if (length < 1e-8) {
                throw new Error(`Degenerate rail tangent: ${segment.id}`);
            }
            return { point, normal: { x: -dz / length, z: dx / length } };
        }
    );
}

/**
 * Offset a centreline sample along its normal to obtain rails or ballast edges.
 */
export function offsetRailSample(sample: {
    point: Point2;
    normal: Point2;
}, offset: number): Point2 {
    return { x: sample.point.x + sample.normal.x * offset, z: sample.point.z + sample.normal.z * offset };
}

/** Preserve the rendered ballast envelope when reserving space beside a rail approach. */
export function railApproachFootprints(approach: RailApproach, halfWidth = 1.25): Point2[][] {
    return approach.segments.map(segment => {
        const samples = sampleRailSegment(approach, segment);
        return [
            ...samples.map(sample => offsetRailSample(sample, halfWidth)),
            ...samples.slice().reverse().map(sample => offsetRailSample(sample, -halfWidth))
        ];
    });
}
