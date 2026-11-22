import * as T from 'three';
import type { Level, LevelId, StationId, StationLayout } from '../../domain/map/model.ts';
import { platformOutline } from '../../domain/map/geometry.ts';
import { displayElevation } from '../../application/exploration/display-elevation.ts';
import { explorationElevation } from '../../application/exploration/exploration-level.ts';
import { allowsGroundLayer, viewLayerRole } from '../../application/exploration/view-layer.ts';
import { facilityCameraCenter } from './facility-focus.ts';
import { cameraOffset } from './view-orientation.ts';
import { geographicRoofHeightAt, geographicRoofPoint } from '../models/stations/roof-profile.ts';
import type { TourChapter } from '../components/tour-caption.ts';

interface Shot {
    chapter: TourChapter;
    station: StationId | null;
    level: LevelId | 'all';
    mode: 'overview' | 'station' | 'transfer';
    explode: number;
    yaw: number;
    pitch: number;
    travel: number;
    hold: number;
    areas?: string[];
    orbit?: number;
    broadsideOffset?: number;
    detailLabels?: 'hold' | 'orbit';
    fitStation?: StationId;
    fitLevel?: LevelId;
    cutProgress?: number;
    ground?: boolean;
    framingScale?: number;
}

type Viewport = Parameters<typeof facilityCameraCenter>[4];
type FramedShot = Shot & { anchor: T.Vector3; width: number; height: number; ground: boolean };
type TourOrigin = { center: T.Vector3; span: number; orientation: T.Vector3; explode: number };
type YawKey = { time: number; yaw: number; speed: number };

const overview: Shot = { chapter: 'overview', station: null, level: 'all', mode: 'overview', explode: 0, yaw: 0, pitch: 32, travel: 3000, hold: 1100 };
const detail = { mode: 'station', pitch: 25, explode: 1.2 } as const;
const jrDetail = { ...detail, station: 'jr-osaka', ground: false } as const;
const westYaw = -90;
const layerFadeDuration = 600;
const entranceDuration = 1100;

const jrArrival: Shot = {
    ...jrDetail, chapter: 'jrBridge', level: 'all', yaw: -112, pitch: 30, travel: 4400, hold: 350, cutProgress: 0,
    areas: ['bridge-public', 'bridge-paid', 'bridge-south'],
    framingScale: 1.15
};

const stops: Shot[] = [
    { ...jrDetail, chapter: 'jrUmekita', level: 'underground-hall', yaw: -100, orbit: 26, travel: 0, hold: 3500,
        areas: ['umekita-public', 'umekita-paid'] },
    { ...jrDetail, chapter: 'jrLayers', level: 'all', yaw: -94, orbit: 16, travel: 2400, hold: 2500, cutProgress: .4,
        areas: ['bridge-public', 'bridge-paid', 'bridge-south', 'central-public', 'central-paid'] },
    { ...jrDetail, chapter: 'jrBridge', level: 'bridge', yaw: -70, orbit: 18, travel: 1900, hold: 2900, cutProgress: .4,
        areas: ['bridge-public', 'bridge-paid', 'bridge-south'] },
    { ...jrDetail, chapter: 'jrCentral', level: 'concourse', yaw: -48, orbit: 14, travel: 1900, hold: 2900,
        areas: ['central-public', 'central-paid', 'south-central-raised'] },
    { ...detail, chapter: 'hankyu', station: 'hankyu-umeda', level: 'hankyu-platform', yaw: -26, orbit: 24, travel: 1800, hold: 3500 },
    { ...detail, chapter: 'midosuji', station: 'metro-umeda', level: 'metro-hall', yaw: 24, orbit: 24, travel: 1700, hold: 2700 },
    { ...detail, chapter: 'tanimachi', station: 'higashi-umeda', level: 't20-hall', yaw: 33, orbit: 24, travel: 1700, hold: 2700 },
    // Carry a single sweep across Hanshin (阪神)'s hall and platform views.
    { ...detail, chapter: 'hanshinHall', station: 'hanshin-umeda', level: 'hanshin-hall', yaw: 3, broadsideOffset: 11, orbit: -10, travel: 1700, hold: 2600 },
    { ...detail, chapter: 'hanshinPlatform', station: 'hanshin-umeda', level: 'hanshin-platform', yaw: 3, broadsideOffset: -8, orbit: -16, travel: 1800, hold: 3300 },
    { ...detail, chapter: 'yotsubashi', station: 'nishi-umeda', level: 'y11-hall', yaw: -24, orbit: -24, travel: 1700, hold: 2700 },
    // Leave Kitashinchi (北新地) on the approach to the opening heading so the sweep can continue through it.
    { ...detail, chapter: 'kitashinchi', station: 'kitashinchi', level: 'kitashinchi-hall', yaw: 17, broadsideOffset: 24, orbit: -18, travel: 1700, hold: 3000 }
];

/** Establish the incoming station at a wider scale before moving in for detail. */
function transfer(shot: Shot, travel: number, level: Shot['level'], cutProgress = 1): Shot {
    return {
        ...shot, mode: 'transfer', level, fitLevel: shot.level === 'all' ? undefined : shot.level,
        explode: .22, pitch: 30, orbit: 0, travel, hold: 0, cutProgress
    };
}

/** Keep both underground endpoints visible without bringing the street slab back. */
function transferLevel(from: Shot, to: Shot, levels: Level[]): Shot['level'] {
    const a = levels.find(level => level.id === from.level);
    const b = levels.find(level => level.id === to.level);
    if (!a || !b || a.y >= 0 || b.y >= 0) {
        return 'all';
    }
    return explorationElevation(a) >= explorationElevation(b) ? a.id : b.id;
}

/** Frame each underground orbit relative to a side view of the real platform axis. */
function broadside(shot: Shot, layout: StationLayout, levels: Level[]): Shot {
    const floor = levels.find(level => level.id === shot.level);
    if (!floor || floor.y >= 0) {
        return shot;
    }
    const platform = layout.platforms.filter(item =>
        levels.some(level => item.level === level.id && level.station === shot.station && level.y < 0)
    ).sort((a, b) => b.length - a.length)[0];
    if (!platform) {
        return shot;
    }
    const normal = -T.MathUtils.radToDeg(platform.rotationRad);
    const side = normal + 180 * Math.round((shot.yaw - normal) / 180);
    const yaw = side + (shot.broadsideOffset ?? 0) - (shot.orbit ?? 0) / 2;
    return { ...shot, yaw };
}

/** Fit the named floors and platforms at the shot's own yaw and display elevation. */
function frameShot(shot: Shot, layout: StationLayout, levels: Level[], overviewPoints: T.Vector3[]): FramedShot {
    const points = shot.mode === 'overview' && !shot.fitStation ? overviewPoints : [];
    if (!points.length) {
        const station = shot.fitStation ?? shot.station;
        const fitLevel = shot.fitLevel ?? shot.level;
        const underground = (levels.find(level => level.id === fitLevel)?.y ?? 0) < 0;
        const targetLevels = new Set(levels.filter(level => level.station === station &&
            (fitLevel === 'all' || level.id === fitLevel ||
                underground && viewLayerRole(levels, { level: fitLevel }, level.id) !== 'hidden')).map(level => level.id));
        for (const area of layout.areas) {
            if (targetLevels.has(area.level) && (!shot.areas || shot.areas.includes(area.id))) {
                const y = displayElevation(levels, area.level, shot.explode) + (area.elevationOffset ?? 0);
                points.push(...area.outline.map(point => new T.Vector3(point.x, y, point.z)));
            }
        }
        if (!shot.areas || underground) {
            for (const platform of layout.platforms) {
                if (targetLevels.has(platform.level)) {
                    const y = displayElevation(levels, platform.level, shot.explode);
                    points.push(...platformOutline(platform).map(point => new T.Vector3(point.x, y + 2, point.z)));
                }
            }
        }
        if (shot.mode === 'overview' && station === 'jr-osaka') {
            for (const z of [-36, 36]) {
                for (const x of [-63.5, 63.5]) {
                    const point = geographicRoofPoint(x, z);
                    points.push(new T.Vector3(point.x, 26 + geographicRoofHeightAt(z), point.z));
                }
            }
        }
    }
    const fitted = points.length ? points : overviewPoints;
    const anchor = new T.Box3().setFromPoints(fitted).getCenter(new T.Vector3());
    const yaw = T.MathUtils.degToRad(shot.yaw);
    const pitch = T.MathUtils.degToRad(shot.pitch);
    const right = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const up = new T.Vector3(-Math.sin(yaw) * Math.sin(pitch), Math.cos(pitch), -Math.cos(yaw) * Math.sin(pitch));
    const bounds = new T.Box2();
    for (const point of fitted) {
        bounds.expandByPoint(new T.Vector2(point.dot(right), point.dot(up)));
    }
    const center = bounds.getCenter(new T.Vector2());
    anchor.addScaledVector(right, center.x - anchor.dot(right)).addScaledVector(up, center.y - anchor.dot(up));
    const size = bounds.getSize(new T.Vector2());
    const margin = shot.mode === 'transfer' ? 1.75 : shot.mode === 'overview' && !shot.fitStation ? .96 : 1.15;
    const scale = margin * (shot.framingScale ?? 1);
    const ground = shot.ground ?? allowsGroundLayer(levels, { level: shot.level, focusStation: shot.station });
    return { ...shot, anchor, width: size.x * scale, height: size.y * scale, ground };
}

/** Keep angles on their shortest arc and retain the exact held pose at the endpoint. */
function interpolateYaw(from: number, to: number, progress: number): number {
    const turn = T.MathUtils.euclideanModulo(to - from + 180, 360) - 180;
    return progress === 1 ? to : from + turn * progress;
}

/** Ease a timed move or a model visibility transition at both ends. */
function eased(progress: number): number {
    const t = T.MathUtils.clamp(progress, 0, 1);
    return t ** 2 * (3 - 2 * t);
}

/** Ease changes in apparent magnification at the same rate throughout a move. */
function zoomBetween(from: number, to: number, progress: number): number {
    if (progress === 0) {
        return from;
    }
    if (progress === 1) {
        return to;
    }
    return from * (to / from) ** progress;
}

/** Preserve velocity across equal-direction turns; slow to zero only at a reversal. */
function yawSpeed(previous: YawKey, current: YawKey, next: YawKey): number {
    const before = current.time - previous.time;
    const after = next.time - current.time;
    const incoming = (current.yaw - previous.yaw) / before;
    const outgoing = (next.yaw - current.yaw) / after;
    if (incoming * outgoing <= 0) {
        return 0;
    }
    return 3 * (before + after) / ((2 * after + before) / incoming + (after + 2 * before) / outgoing);
}

/** Sample a continuous angular curve independently of zoom, floor cuts and holds. */
function yawAt(keys: readonly YawKey[], time: number): number {
    const index = keys.findIndex(key => key.time > time);
    const from = keys[index - 1]!;
    const to = keys[index]!;
    const duration = to.time - from.time;
    const t = (time - from.time) / duration;
    return T.MathUtils.lerp(from.yaw, to.yaw, eased(t)) +
        duration * t * (1 - t) * ((1 - t) * from.speed - t * to.speed);
}

/** Scripted, repeatable tour that owns its camera without modifying manual map settings. */
export class GuidedTour {
    readonly duration: number;
    private readonly sequence: { from: FramedShot; to: FramedShot; cutAt: number; fade: number; start: number; end: number }[] = [];
    private readonly yawKeys: YawKey[] = [{ time: 0, yaw: overview.yaw, speed: 0 }];
    private readonly startedAt: number;
    private readonly origin?: TourOrigin;

    /** Assemble zoom-out and travel shots between stations, then return to the opening frame. */
    constructor(layout: StationLayout, levels: Level[], overviewPoints: T.Vector3[], now: number, origin?: TourOrigin) {
        this.startedAt = now;
        this.origin = origin;
        const framedStops = stops.map(shot => broadside(shot, layout, levels));
        const umekita = framedStops[0]!;
        const shots: Shot[] = [
            { ...overview, fitStation: 'jr-osaka', yaw: westYaw, travel: 7100, hold: 0 },
            jrArrival,
            { ...umekita, level: 'all', fitLevel: 'underground-hall', travel: 3200, hold: 0 }
        ];
        for (const [index, stop] of framedStops.entries()) {
            const previous = framedStops[index - 1];
            if (previous && previous.station !== stop.station) {
                const level = transferLevel(previous, stop, levels);
                shots.push(transfer({ ...previous, yaw: previous.yaw + (previous.orbit ?? 0) }, 1000, level));
                shots.push(transfer(stop, 2250, level, .4));
            }
            shots.push({ ...stop, detailLabels: 'hold', hold: 420 });
            shots.push({ ...stop, detailLabels: 'orbit', yaw: stop.yaw + (stop.orbit ?? 0), travel: stop.hold - 1120, hold: 700 });
        }
        const last = framedStops.at(-1)!;
        shots.push(transfer({ ...last, yaw: last.yaw + (last.orbit ?? 0) }, 1400, last.level), overview);
        let from = frameShot(overview, layout, levels, overviewPoints);
        let end = 0;
        for (const shot of shots) {
            const to = frameShot(shot, layout, levels, overviewPoints);
            const visibilityChanges = from.level !== to.level || from.ground !== to.ground || (from.mode === 'overview') !== (to.mode === 'overview');
            const fade = visibilityChanges ? layerFadeDuration : 0;
            const cutAt = to.travel * (fade ? to.cutProgress ?? 1 : 1);
            const start = end;
            end += Math.max(to.travel, cutAt + fade) + to.hold;
            this.sequence.push({ from, to, fade, cutAt, start, end });
            const previous = this.yawKeys.at(-1)!;
            const yaw = previous.yaw + T.MathUtils.euclideanModulo(to.yaw - previous.yaw + 180, 360) - 180;
            if (Math.abs(yaw - previous.yaw) > .00001) {
                this.yawKeys.push({ time: start + to.travel, yaw, speed: 0 });
            }
            from = to;
        }
        this.duration = end;
        const closing = this.yawKeys.at(-1)!;
        closing.time = end;
        for (let i = 1; i < this.yawKeys.length - 1; i++) {
            const key = this.yawKeys[i]!;
            key.speed = yawSpeed(this.yawKeys[i - 1]!, key, this.yawKeys[i + 1]!);
        }
        // Use the same velocity on both sides of the loop's opening pose.
        const first = this.yawKeys[0]!;
        const penultimate = this.yawKeys.at(-2)!;
        first.speed = yawSpeed({ ...penultimate, time: penultimate.time - end, yaw: penultimate.yaw - closing.yaw + first.yaw },
            first, this.yawKeys[1]!);
        closing.speed = first.speed;
    }

    /** Evolve pose and floor spacing together; reduced motion advances at settled shots. */
    advance(now: number, reducedMotion: boolean, width: number, height: number, usable: Viewport) {
        const sinceStart = Math.max(0, now - this.startedAt);
        const entrance = this.origin && !reducedMotion ? entranceDuration : 0;
        const elapsed = sinceStart % this.duration;
        const { from, to, fade, cutAt, start, end } = this.sequence.find(shot => shot.end > elapsed)!;
        const time = elapsed - start;
        const progress = to.travel ? T.MathUtils.clamp(time / to.travel, 0, 1) : 1;
        const mix = reducedMotion ? 1 : eased(progress);
        const cutting = time >= cutAt;
        const shot = reducedMotion || cutting ? to : from;
        const arriving = entrance > sinceStart;
        const entranceMix = arriving ? eased(sinceStart / entrance) : 1;
        let yaw = reducedMotion ? to.yaw : yawAt(this.yawKeys, elapsed);
        let pitch = T.MathUtils.lerp(from.pitch, to.pitch, mix);
        if (arriving && this.origin) {
            const initial = this.origin.orientation;
            yaw = interpolateYaw(T.MathUtils.radToDeg(Math.atan2(initial.x, initial.z)), yaw, entranceMix);
            pitch = T.MathUtils.lerp(T.MathUtils.radToDeg(Math.atan2(initial.y, Math.hypot(initial.x, initial.z))), pitch, entranceMix);
        }
        yaw = T.MathUtils.degToRad(yaw);
        pitch = T.MathUtils.degToRad(pitch);
        const radius = cameraOffset.length();
        cameraOffset.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(radius);
        const spanFor = (frame: FramedShot) => Math.max(74, frame.width * height / usable.width, frame.height * height / usable.height);
        // On the first lap, move directly from the live view to the west-side station framing.
        const origin = !reducedMotion && sinceStart < this.sequence[0]!.end ? this.origin : undefined;
        const targetSpan = spanFor(to);
        const span = zoomBetween(origin?.span ?? spanFor(from), targetSpan, mix);
        const center = origin
            ? origin.center.clone().lerp(facilityCameraCenter(to.anchor, targetSpan, width, height, usable), mix)
            : facilityCameraCenter(from.anchor.clone().lerp(to.anchor, mix), span, width, height, usable);
        const opacity = arriving ? entranceMix : !reducedMotion && fade > 0 && cutting ? eased((time - cutAt) / fade) : 1;
        const moving = !reducedMotion && (progress < 1 || opacity < 1);
        return {
            chapter: shot.chapter,
            center, span, yaw, pitch, opacity, wait: end - elapsed,
            moving, turning: !reducedMotion,
            showLabels: to.detailLabels === 'orbit' || to.detailLabels === 'hold' && !moving,
            station: shot.mode === 'station' ? shot.station : null, level: shot.level,
            overview: shot.mode === 'overview', ground: shot.ground,
            explode: T.MathUtils.lerp(this.origin?.explode ?? 0, T.MathUtils.lerp(from.explode, to.explode, mix), entranceMix)
        };
    }
}
