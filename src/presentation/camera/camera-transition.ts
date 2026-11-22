import * as T from 'three';

export interface CameraPose {
    center: T.Vector3;
    span: number;
    offset: T.Vector3;
}

/** Ease an orthographic camera move, keeping orientation on the shortest compass arc. */
export function interpolateCameraPose(from: CameraPose, to: CameraPose, progress: number): CameraPose {
    if (progress <= 0) {
        return from;
    }
    if (progress >= 1) {
        return to;
    }
    const mix = progress ** 2 * (3 - 2 * progress);
    const offset = to.offset.clone();
    if (!from.offset.equals(to.offset)) {
        const start = new T.Spherical().setFromVector3(from.offset);
        const end = new T.Spherical().setFromVector3(to.offset);
        const turn = Math.atan2(Math.sin(end.theta - start.theta), Math.cos(end.theta - start.theta));
        offset.setFromSphericalCoords(T.MathUtils.lerp(start.radius, end.radius, mix),
            T.MathUtils.lerp(start.phi, end.phi, mix), start.theta + turn * mix);
    }
    return {
        center: from.center.clone().lerp(to.center, mix),
        span: from.span * (to.span / from.span) ** mix,
        offset
    };
}
