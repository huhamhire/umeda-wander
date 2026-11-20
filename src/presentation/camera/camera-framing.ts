import * as T from 'three';
import type { Level, LevelId, StationId, StationLayout } from '../../domain/map/model.ts';
import { platformPoint } from '../../domain/map/geometry.ts';

/** Clamp automatic framing to the vertical fit and its supported range of zoom. */
export function clampCameraZoom(zoom: number, minimum: number): number {
    return T.MathUtils.clamp(zoom, minimum, Math.max(16, minimum * 16));
}

/** Give wide, shallow views more room to zoom out while keeping the current and starting spans reachable. */
export function manualZoomSpan(span: number, factor: number, reference: number, baseSpan: number, minimumZoom: number): number {
    const verticalLimit = baseSpan / minimumZoom;
    // A width-based fit can make the map tiny on a narrow screen. Allow at most one extra doubling of span.
    const wideLimit = Math.min(baseSpan, verticalLimit * 2);
    const closest = baseSpan / Math.max(16, minimumZoom * 16);
    return T.MathUtils.clamp(
        span / factor,
        Math.min(closest, span, reference),
        Math.max(verticalLimit, wideLimit, span, reference)
    );
}

/** Fit the full station envelope, so changing a floor cut never moves the camera. */
export function cameraEnvelope(
    layout: StationLayout,
    levels: Level[],
    state: {
        level: LevelId | 'all';
        focusStation?: StationId | null;
    },
    elevation: (id: LevelId) => number
): T.Vector3[] {
    const points: T.Vector3[] = [];
    const matches = (id: LevelId) => !state.focusStation || levels.find(l => l.id === id)?.station === state.focusStation;
    for (const area of layout.areas) {
        if (!matches(area.level)) {
            continue;
        }
        for (const p of area.outline) {
            points.push(new T.Vector3(p.x, elevation(area.level) + (area.elevationOffset ?? 0) + (area.height ?? 0.55), p.z));
        }
    }
    for (const platform of layout.platforms) {
        if (!matches(platform.level)) {
            continue;
        }
        for (const sx of [-1, 1]) {
            for (const sz of [-1, 1]) {
                const p = platformPoint(platform, sx * (platform.length / 2 + 5), sz * (platform.width / 2 + 4));
                points.push(new T.Vector3(p.x, elevation(platform.level) + 4, p.z));
            }
        }
    }
    for (const c of layout.connections) {
        if (!matches(c.from.level) && !matches(c.to.level)) {
            continue;
        }
        for (const p of [c.from, c.to]) {
            for (const dx of [-3, 3]) {
                for (const dz of [-3, 3]) {
                    points.push(new T.Vector3(
                        p.x + dx,
                        elevation(p.level) + (p.elevationOffset ?? 0) + (c.kind === 'elevator' ? 4 : 3),
                        p.z + dz
                    ));
                }
            }
        }
    }
    for (const approach of layout.railApproaches ?? []) {
        if (!matches(approach.level)) {
            continue;
        }
        for (const node of approach.nodes) {
            points.push(new T.Vector3(node.point.x, elevation(approach.level) + 1, node.point.z));
        }
        points.push(new T.Vector3(approach.labelPoint.x, elevation(approach.level) + 3, approach.labelPoint.z));
    }
    for (const guide of layout.guides ?? []) {
        for (const p of guide.points) {
            if (matches(p.level)) {
                points.push(new T.Vector3(p.x, elevation(p.level) + 3, p.z));
            }
        }
    }
    for (const passage of layout.passages ?? []) {
        if (state.focusStation && !passage.points.some(p => p.station === state.focusStation)) {
            continue;
        }
        for (const p of passage.points) {
            points.push(new T.Vector3(p.x, elevation(p.level) + (p.elevationOffset ?? 0) + 3, p.z));
        }
    }
    return !points.length && state.focusStation ? cameraEnvelope(layout, levels, { ...state, focusStation: null }, elevation) : points;
}
