import * as T from 'three';
import type { createRoutePlayback, RoutePlaybackSample } from '../../application/navigation/route-playback.ts';
import { facilityCameraCenter } from './facility-focus.ts';
import { cameraOffset } from './view-orientation.ts';

type PlaybackPath = NonNullable<ReturnType<typeof createRoutePlayback>>;
type CameraFrame = { center: T.Vector3; span: number };
type Viewport = Parameters<typeof facilityCameraCenter>[4];

const approachSeconds = .85;
const playbackPitch = T.MathUtils.degToRad(28);
const descentTurnRate = 1.65;
const descentLookAheadSeconds = 2.2;
const descentYawRange = Math.PI / 6;

/** Return the signed shortest rotation from the current yaw to a desired bearing. */
function yawDifference(target: number, current: number): number {
    return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

/** Interpolate the already drawn route while temporarily driving the camera. */
export class RoutePlaybackView {
    sample: RoutePlaybackSample;
    status: 'playing' | 'paused' | 'finished' = 'playing';
    private distance = 0;
    private lastFrame?: number;
    private approachTime = 0;
    private approachDuration = approachSeconds;
    private origin: CameraFrame;
    private yawStart = 0;
    private pitchStart = 0;
    private yawTarget = 0;
    private readonly path: PlaybackPath;
    private readonly speed: number;

    /** Hold the initial point until the camera reaches the local playback framing. */
    constructor(path: PlaybackPath, frame: CameraFrame) {
        this.path = path;
        this.sample = path.at(0);
        this.speed = path.length / T.MathUtils.clamp(path.length / 12, 4, 55);
        this.origin = frame;
        this.resume(frame);
    }

    /** Retain progress and ease in again from the camera the user last positioned. */
    resume(frame: CameraFrame): void {
        this.origin = frame;
        this.status = 'playing';
        this.lastFrame = undefined;
        this.approachTime = 0;
        this.yawStart = Math.atan2(cameraOffset.x, cameraOffset.z);
        this.pitchStart = Math.atan2(cameraOffset.y, Math.hypot(cameraOffset.x, cameraOffset.z));
        this.yawTarget = this.yawStart;
        this.approachDuration = approachSeconds;
        const descentTurn = this.descentTurn(this.yawStart, this.speed);
        if (descentTurn !== undefined) {
            this.yawTarget += descentTurn;
            // Smoothstep peaks at 1.5 times the average speed.
            this.approachDuration = Math.max(approachSeconds, 1.5 * Math.abs(descentTurn) / descentTurnRate);
            return;
        }
        const turn = this.turnFrom(this.yawStart);
        if (Math.abs(turn) > Math.PI / 2) {
            this.yawTarget += Math.sign(turn) * Math.min(Math.PI / 8, Math.abs(turn) - Math.PI / 2);
        }
    }

    /** Turn only as far as the nearest downhill viewing angle in the allowed range. */
    private descentTurn(yaw: number, lookAhead: number): number | undefined {
        const flight = this.path.descentAhead(this.distance, lookAhead);
        if (!flight) {
            return undefined;
        }
        const bearing = Math.atan2(flight.to.x - flight.from.x, flight.to.z - flight.from.z);
        const delta = yawDifference(bearing, yaw);
        return delta - T.MathUtils.clamp(delta, -descentYawRange, descentYawRange);
    }

    /** Ignore short turns and vertical lifts when deciding whether a wider heading change will help. */
    private turnFrom(yaw: number): number {
        const ahead = this.path.at(this.distance + 18);
        const dx = ahead.x - this.sample.x;
        const dz = ahead.z - this.sample.z;
        if (this.sample.from.level !== this.sample.to.level || Math.hypot(dx, dz) < 9) {
            return 0;
        }
        return yawDifference(Math.atan2(-dx, -dz), yaw);
    }

    /** Advance the route and return a framing centered in the part of the viewport clear of navigation panels. */
    advance(
        now: number, reducedMotion: boolean, width: number, height: number, usable: Viewport,
        position: (sample: RoutePlaybackSample) => T.Vector3, previous?: CameraFrame
    ): CameraFrame {
        const seconds = Math.min(.1, Math.max(0, (now - (this.lastFrame ?? now)) / 1000));
        this.lastFrame = now;
        const approaching = this.approachTime < this.approachDuration;
        const currentYaw = Math.atan2(cameraOffset.x, cameraOffset.z);
        let yaw = currentYaw;
        let mix = 1;
        if (approaching) {
            this.approachTime = reducedMotion ? this.approachDuration : Math.min(this.approachDuration, this.approachTime + seconds);
            const progress = this.approachTime / this.approachDuration;
            mix = progress * progress * (3 - 2 * progress);
            yaw = T.MathUtils.lerp(this.yawStart, this.yawTarget, mix);
        } else {
            this.distance = Math.min(this.path.length, this.distance + this.speed * seconds);
            this.sample = this.path.at(this.distance);
            const descentTurn = reducedMotion ? undefined : this.descentTurn(yaw, this.speed * descentLookAheadSeconds);
            if (descentTurn !== undefined) {
                const maxTurn = descentTurnRate * seconds;
                yaw += T.MathUtils.clamp(descentTurn, -maxTurn, maxTurn);
            } else if (!reducedMotion) {
                const turn = this.turnFrom(yaw);
                const excess = Math.max(0, Math.abs(turn) - Math.PI * .53);
                yaw += Math.sign(turn) * Math.min(excess, .42 * seconds);
            }
            if (this.distance >= this.path.length) {
                this.status = 'finished';
            }
        }
        if (!reducedMotion) {
            const pitch = T.MathUtils.lerp(this.pitchStart, playbackPitch, mix);
            const radius = cameraOffset.length();
            const horizontal = Math.cos(pitch) * radius;
            cameraOffset.set(Math.sin(yaw) * horizontal, Math.sin(pitch) * radius, Math.cos(yaw) * horizontal);
        }
        const localSpan = T.MathUtils.clamp(48 * height / Math.max(1, usable.width), 78, 125);
        const span = T.MathUtils.lerp(this.origin.span, localSpan, mix);
        const center = facilityCameraCenter(position(this.sample), span, width, height, usable);
        if (approaching) {
            center.lerpVectors(this.origin.center, center, mix);
        } else if (previous && !reducedMotion && this.status !== 'finished') {
            center.lerpVectors(previous.center, center, 1 - Math.exp(-seconds * 13));
        }
        return { center, span };
    }
}
