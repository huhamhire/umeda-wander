import type { Level, VerticalConnection } from '../../domain/map/model.ts';
import { explorationElevation } from '../exploration/exploration-level.ts';
import { routeConnectionKey, type RoutePathPoint } from './route-path.ts';

export type RoutePlaybackStatus = 'ready' | 'playing' | 'paused' | 'finished';

interface PlaybackSegment {
    from: RoutePathPoint;
    to: RoutePathPoint;
    start: number;
    end: number;
    level: Level;
    ceiling: number;
}

export interface RoutePlaybackSample {
    from: RoutePathPoint;
    to: RoutePathPoint;
    fraction: number;
    x: number;
    z: number;
    level: Level;
    ceiling: number;
}

/** Use physical distance along the selected preview, independent of frame rate or exploded display height. */
export function createRoutePlayback(
    nodes: readonly RoutePathPoint[], levels: readonly Level[], connections: readonly VerticalConnection[] = []
) {
    const byLevel = new Map(levels.map(level => [level.id, level]));
    const flightKeys = new Set(connections.filter(connection => connection.kind === 'stairs' || connection.kind === 'escalator')
        .map(connection => routeConnectionKey(connection.from.id, connection.to.id)));
    const segments: PlaybackSegment[] = [];
    const descents: PlaybackSegment[] = [];
    let length = 0;
    for (let i = 1; i < nodes.length; i++) {
        const from = nodes[i - 1]!;
        const to = nodes[i]!;
        const fromLevel = byLevel.get(from.level);
        const toLevel = byLevel.get(to.level);
        if (!fromLevel || !toLevel) {
            return undefined;
        }
        const dy = toLevel.y + (to.elevationOffset ?? 0) - fromLevel.y - (from.elevationOffset ?? 0);
        const run = Math.hypot(to.x - from.x, to.z - from.z);
        const span = Math.hypot(run, dy);
        if (span < 1e-6) {
            continue;
        }
        const level = explorationElevation(fromLevel) > explorationElevation(toLevel) ? fromLevel : toLevel;
        const segment = { from, to, start: length, end: length + span, level, ceiling: Math.max(fromLevel.y, toLevel.y) };
        segments.push(segment);
        if (dy < -1e-6 && run > 1e-6 && flightKeys.has(routeConnectionKey(from.id, to.id))) {
            descents.push(segment);
        }
        length += span;
    }
    const final = nodes.at(-1);
    if (!length || !final) {
        return undefined;
    }
    const lastLevel = byLevel.get(final.level)!;
    /** Keep both floors visible during a transfer, then switch to the arrival floor at the endpoint. */
    const at = (distance: number): RoutePlaybackSample => {
        if (distance >= length) {
            return { from: final, to: final, fraction: 0, x: final.x, z: final.z, level: lastLevel, ceiling: lastLevel.y };
        }
        const segment = segments.find(segment => segment.end > distance)!;
        const { from, to, start, end, level, ceiling } = segment;
        const fraction = Math.max(0, (distance - start) / (end - start));
        return { from, to, fraction, x: from.x + (to.x - from.x) * fraction, z: from.z + (to.z - from.z) * fraction, level, ceiling };
    };
    /** Find the current or next descending flight within the camera's approach distance. */
    const descentAhead = (distance: number, lookAhead: number) =>
        descents.find(segment => segment.end >= distance && segment.start <= distance + lookAhead);
    return { length, at, descentAhead };
}
