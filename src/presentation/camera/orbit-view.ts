import * as T from 'three';
import { cameraPitchDegrees } from './pitch-limits.ts';

/** Project an orbit ray onto a fixed horizontal elevation without consulting visible meshes. */
export function orbitPointOnPlane(ray: T.Ray, elevation: number): T.Vector3 | null {
    const plane = new T.Plane(new T.Vector3(0, 1, 0), -elevation);
    return ray.intersectPlane(plane, new T.Vector3());
}

/**
 * Build the viewing-basis quaternion from the camera offset.
 */
function orientation(offset: T.Vector3): T.Quaternion {
    const back = offset.clone().normalize();
    const right = new T.Vector3(0, 1, 0).cross(back).normalize();
    const up = back.clone().cross(right);
    return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right, up, back));
}

/** Rotate the camera and its look-at target rigidly about a world point.
 * The orthographic span is deliberately outside this function and stays fixed. */
export function orbitAboutPoint(offset: T.Vector3, center: T.Vector3, pivot: T.Vector3, yawRadians: number, pitchRadians: number): void {
    const previous = orientation(offset);
    const distance = offset.length();
    const yaw = Math.atan2(offset.x, offset.z) - yawRadians;
    const pitch = T.MathUtils.clamp(
        Math.asin(offset.y / distance) + pitchRadians,
        T.MathUtils.degToRad(cameraPitchDegrees.min),
        T.MathUtils.degToRad(cameraPitchDegrees.max)
    );
    offset.set(
        Math.sin(yaw) * Math.cos(pitch) * distance,
        Math.sin(pitch) * distance,
        Math.cos(yaw) * Math.cos(pitch) * distance
    );
    const rotation = orientation(offset).multiply(previous.invert());
    center.sub(pivot).applyQuaternion(rotation).add(pivot);
}
