import { platformPoint } from '../../domain/map/geometry.ts';
import { platformRail, sampleRailSegment } from '../../domain/map/rail-geometry.ts';
import type { Point2, RailApproach, StationLayout } from '../../domain/map/model.ts';

export const loopTrainCars = 8;
export const loopTrainCarPitch = 20;
export const loopTrainLength = loopTrainCars * loopTrainCarPitch;
const firstEntry = 3000;
const interval = 60000;
const arrival = 18000;
const departure = arrival + 12000;
const clear = departure + 18000;

/** Follow only the outward segments connected to the requested platform road. */
function outwardRoad(approach: RailApproach, platformId: string): Point2[] {
    const first = approach.segments.find(segment => segment.platformId === platformId && segment.track === 2);
    if (!first) {
        return [];
    }
    const points = sampleRailSegment(approach, first, 96).map(sample => sample.point);
    let node = first.to;
    for (let i = 1; i < approach.segments.length; i++) {
        const next = approach.segments.find(segment => segment.from === node);
        if (!next) {
            break;
        }
        points.push(...sampleRailSegment(approach, next, 96).slice(1).map(sample => sample.point));
        node = next.to;
    }
    return approach.nodes.some(end => end.id === node && end.kind === 'end') ? points : [];
}

/** Build an arc-length path from the live west approach across platform 2 to the east approach. */
export function osakaLoopTrainPath(layout: StationLayout) {
    const platform = layout.platforms.find(item => item.level === 'platform' && item.tracks.includes(2));
    const west = layout.railApproaches?.find(approach => approach.id === 'map-rail-jr-osaka-platform-loop--1');
    const east = layout.railApproaches?.find(approach => approach.id === 'map-rail-jr-osaka-platform-loop-1');
    if (!platform || !west || !east) {
        return;
    }
    const entry = outwardRoad(west, platform.id).reverse();
    const exit = outwardRoad(east, platform.id);
    if (!entry.length || !exit.length || platform.length < loopTrainLength) {
        return;
    }
    const rail = platformRail(platform, platform.tracks.indexOf(2));
    const platformPoints = Array.from({ length: 81 }, (_, i) =>
        platformPoint(platform, rail.center + rail.length * (i / 80 - .5), rail.across));
    const points = [...entry, ...platformPoints.slice(1), ...exit.slice(1)];
    const distances = [0];
    for (let i = 1; i < points.length; i++) {
        const from = points[i - 1]!;
        const to = points[i]!;
        distances.push(distances[i - 1]! + Math.hypot(to.x - from.x, to.z - from.z));
    }
    return {
        points, distances,
        length: distances.at(-1)!,
        stop: distances[entry.length - 1 + 40]! + loopTrainLength / 2,
        platformId: platform.id
    };
}

export type LoopPath = NonNullable<ReturnType<typeof osakaLoopTrainPath>>;

/** Sample by travelled distance; extrapolate end tangents as cars enter and leave the clipped area. */
export function loopTrainPoint(path: LoopPath, distance: number): Point2 {
    let low = 0;
    let high = path.distances.length - 1;
    while (high - low > 1) {
        const middle = (low + high) >> 1;
        if (path.distances[middle]! <= distance) {
            low = middle;
        } else {
            high = middle;
        }
    }
    const a = path.points[low]!;
    const b = path.points[high]!;
    const mix = (distance - path.distances[low]!) / (path.distances[high]! - path.distances[low]!);
    return { x: a.x + (b.x - a.x) * mix, z: a.z + (b.z - a.z) * mix };
}

/** Cruise at entry speed, decelerating over the last part of the approach. */
function approachProgress(t: number): number {
    const braking = .32;
    const brakingTime = Math.max(0, t - (1 - braking));
    return (t - brakingTime ** 2 / (2 * braking)) / (1 - braking / 2);
}

/** Return the lead nose distance and next redraw delay on a page-local sixty-second cadence. */
export function loopTrainFrame(path: LoopPath, elapsed: number, reducedMotion: boolean) {
    if (elapsed < firstEntry) {
        return { wait: firstEntry - elapsed };
    }
    const cycle = (elapsed - firstEntry) % interval;
    if (cycle >= clear) {
        return { wait: interval - cycle };
    }
    if (reducedMotion) {
        return { head: path.stop, wait: clear - cycle };
    }
    if (cycle < arrival) {
        return { head: path.stop * approachProgress(cycle / arrival), wait: 0 };
    }
    if (cycle < departure) {
        return { head: path.stop, wait: departure - cycle };
    }
    const exit = path.length + loopTrainLength;
    const progress = 1 - approachProgress(1 - (cycle - departure) / (clear - departure));
    return { head: path.stop + (exit - path.stop) * progress, wait: 0 };
}
