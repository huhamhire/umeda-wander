import type { Platform, Point2 } from './model.ts';

/** Adjacent corridor slabs share the same mitered section at every turn. */
export function joinedPassageOutlines(points: Point2[], width: number): Point2[][] {
    if (points.length < 2 || !Number.isFinite(width) || width <= 0 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.z))) {
        throw new Error('A passage needs finite points and a positive width');
    }
    const normals = points.slice(1).map((b, i) => {
        const a = points[i]!;
        const length = Math.hypot(b.x - a.x, b.z - a.z);
        if (length < 1e-6) {
            throw new Error('Repeated passage point');
        }
        return { x: -(b.z - a.z) / length, z: (b.x - a.x) / length };
    });
    const sections = points.map((p, i) => {
        const before = normals[Math.max(0, i - 1)]!;
        const after = normals[Math.min(i, normals.length - 1)]!;
        const length = Math.hypot(before.x + after.x, before.z + after.z);
        if (length < 1e-6) {
            throw new Error('A passage cannot reverse at a joint');
        }
        const miter = { x: (before.x + after.x) / length, z: (before.z + after.z) / length };
        const reach = width / 2 / (miter.x * after.x + miter.z * after.z);
        if (reach > width * 2) {
            throw new Error('Passage joint is too acute');
        }
        return [
            { x: p.x + miter.x * reach, z: p.z + miter.z * reach },
            { x: p.x - miter.x * reach, z: p.z - miter.z * reach }
        ];
    });
    return sections.slice(1).map((end, i) => [sections[i]![0]!, end[0]!, end[1]!, sections[i]![1]!]);
}

/**
 * Rotate a plan point around the supplied origin.
 */
export function rotatePoint(point: Point2, origin: Point2, radians: number): Point2 {
    const x = point.x - origin.x;
    const z = point.z - origin.z;
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    return { x: origin.x + x * c - z * s, z: origin.z + x * s + z * c };
}

/**
 * Map platform-local coordinates into the district plane, including the centreline bow.
 */
export function platformPoint(platform: Platform, along: number, across: number): Point2 {
    const p = rotatePoint({ x: along, z: across + platformBow(platform, along) }, { x: 0, z: 0 }, platform.rotationRad);
    return { x: platform.x + p.x, z: platform.z + p.z };
}

/**
 * Project a district point into the platform frame and remove the centreline bow.
 */
export function platformLocalPoint(platform: Platform, point: Point2): Point2 {
    const p = rotatePoint({ x: point.x - platform.x, z: point.z - platform.z }, { x: 0, z: 0 }, -platform.rotationRad);
    return { x: p.x, z: p.z - platformBow(platform, p.x) };
}

/** A constant-width passage between two horizontal landings. */
export function passageOutline(start: Point2, end: Point2, width: number): Point2[] {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    if (!Number.isFinite(length) || length < 1e-6 || !Number.isFinite(width) || width <= 0) {
        throw new Error('A passage requires distinct finite endpoints and a positive width');
    }
    const ox = -dz / length * width / 2;
    const oz = dx / length * width / 2;
    return [
        { x: start.x + ox, z: start.z + oz },
        { x: end.x + ox, z: end.z + oz },
        { x: end.x - ox, z: end.z - oz },
        { x: start.x - ox, z: start.z - oz },
    ];
}

/**
 * Use ray casting to test polygon containment; boundary points count as inside.
 */
export function pointInPolygon(point: Point2, polygon: Point2[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[j]!;
        const b = polygon[i]!;
        const cross = (point.x - a.x) * (b.z - a.z) - (point.z - a.z) * (b.x - a.x);
        if (Math.abs(cross) < 1e-6 && point.x >= Math.min(a.x, b.x) - 1e-6 && point.x <= Math.max(a.x, b.x) + 1e-6 &&
            point.z >= Math.min(a.z, b.z) - 1e-6 && point.z <= Math.max(a.z, b.z) + 1e-6) {
            return true;
        }
        if ((a.z > point.z) !== (b.z > point.z) && point.x < (b.x - a.x) * (point.z - a.z) / (b.z - a.z) + a.x) {
            inside = !inside;
        }
    }
    return inside;
}

/** Snap an exterior approach to a building boundary rather than its centre. */
export function closestPolygonPoint(point: Point2, outline: Point2[]): Point2 {
    if (outline.length < 3) {
        throw new Error('A building outline needs at least three vertices');
    }
    let result = outline[0]!;
    let distance = Infinity;
    for (let i = 0; i < outline.length; i++) {
        const a = outline[i]!;
        const b = outline[(i + 1) % outline.length]!;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
        const candidate = { x: a.x + dx * t, z: a.z + dz * t };
        const d = Math.hypot(candidate.x - point.x, candidate.z - point.z);
        if (d < distance) {
            result = candidate;
            distance = d;
        }
    }
    return result;
}

/** Smooth plan bow; tangent continuation outside the platform avoids end kinks. */
export function platformBow(p: Platform, u: number): number {
    if (!p.planBow) {
        return 0;
    }
    const half = p.length / 2;
    const t = Math.max(-half, Math.min(half, u));
    return p.planBow.offset + p.planBow.sag * (1 - (t / half) ** 2) + (-2 * p.planBow.sag * t / half ** 2) * (u - t);
}

/**
 * Return the centreline tangent at an along-platform coordinate for equipment and rail continuity.
 */
export function platformTangent(p: Platform, u: number): number {
    return p.rotationRad + Math.atan(p.planBow ? -8 * p.planBow.sag * Math.max(-p.length / 2, Math.min(p.length / 2, u)) / p.length ** 2 : 0);
}

/**
 * Sample both platform edges into a closed ring, using more samples for bowed platforms.
 */
export function platformOutline(p: Platform): Point2[] {
    const n = p.planBow ? 40 : 1;
    const edge = (side: number) => Array.from(
        { length: n + 1 },
        (_, i) => platformPoint(p, -p.length / 2 + p.length * i / n, side * p.width / 2)
    );
    return [...edge(-1), ...edge(1).reverse()];
}
