import * as T from 'three';

/** Default north-up oblique view; mouse orbit changes yaw only. */
export const viewRailAngle = -31.65 * Math.PI / 180;
const horizontalDistance = Math.hypot(130, 240);
export const cameraOffset = new T.Vector3(0, 170, horizontalDistance);
/**
 * Rotate the viewing offset around the district vertical axis without changing orthographic scale.
 */
export function rotateView(radians: number): void {
    cameraOffset.applyAxisAngle(new T.Vector3(0, 1, 0), radians);
}

/**
 * Restore the north-facing viewing offset at the shared default elevation.
 */
export function resetView(): void {
    cameraOffset.set(0, 170, horizontalDistance);
}

/**
 * Derive screen-right and screen-up unit vectors from the current camera offset.
 */
export function viewBasis(): {
    right: T.Vector3;
    up: T.Vector3;
} {
    const back = cameraOffset.clone().normalize();
    const right = new T.Vector3(0, 1, 0).cross(back).normalize();
    return { right, up: back.clone().cross(right).normalize() };
}

/**
 * Project a map-plane direction into a screen-space unit vector for cardinal indicators.
 */
export function screenDirection(angleRad: number): T.Vector2 {
    const direction = new T.Vector3(Math.cos(angleRad), 0, Math.sin(angleRad));
    const { right, up } = viewBasis();
    return new T.Vector2(direction.dot(right), -direction.dot(up)).normalize();
}
