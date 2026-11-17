import type { Point } from '../../data/geography/underground/network.ts';

/**
 * Find the nearest point across all segments of a reference polyline for road calibration.
 */
export function closestOnLine(point: Point, line: Point[]): Point {
    let best: Point = line[0]!;
    let distance = Infinity;
    for (let i = 1; i < line.length; i++) {
        const a = line[i - 1]!;
        const b = line[i]!;
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
        const p: Point = [a[0] + dx * t, a[1] + dy * t];
        const d = Math.hypot(p[0] - point[0], p[1] - point[1]);
        if (d < distance) {
            best = p;
            distance = d;
        }
    }
    return best;
}

/** Piecewise affine coordinates: shared triangles keep straight runs from curling. */
export function localRoadFit(base: (p: Point) => Point, anchors: {
    reference: Point;
    target: Point;
}[], radius = 100) {
    if (!anchors.length) {
        return base;
    }
    const nodes = anchors.map(a => {
        return { p: a.reference, d: a.target };
    });
    const minX = Math.min(...nodes.map(n => n.p[0])) - radius;
    const maxX = Math.max(...nodes.map(n => n.p[0])) + radius;
    const minY = Math.min(...nodes.map(n => n.p[1])) - radius;
    const maxY = Math.max(...nodes.map(n => n.p[1])) + radius;
    // Slightly asymmetric guard frame avoids a cocircular rectangle ambiguity.
    for (const p of [[minX, minY], [maxX, minY - 1], [maxX + 1, maxY], [minX - 1, maxY + 1]] as Point[]) {
        nodes.push({ p, d: base(p) });
    }
    const triangles: number[][] = [];
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            for (let k = j + 1; k < nodes.length; k++) {
                const a = nodes[i]!.p;
                const b = nodes[j]!.p;
                const c = nodes[k]!.p;
                const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
                if (Math.abs(d) < 1e-9) {
                    continue;
                }
                const aa = a[0] ** 2 + a[1] ** 2;
                const bb = b[0] ** 2 + b[1] ** 2;
                const cc = c[0] ** 2 + c[1] ** 2;
                const x = (aa * (b[1] - c[1]) + bb * (c[1] - a[1]) + cc * (a[1] - b[1])) / d;
                const y = (aa * (c[0] - b[0]) + bb * (a[0] - c[0]) + cc * (b[0] - a[0])) / d;
                const r = (x - a[0]) ** 2 + (y - a[1]) ** 2;
                if (nodes.some((n, l) => l !== i && l !== j && l !== k && (n.p[0] - x) ** 2 + (n.p[1] - y) ** 2 < r - 1e-7)) {
                    continue;
                }
                const ta = nodes[i]!.d;
                const tb = nodes[j]!.d;
                const tc = nodes[k]!.d;
                if (((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) * ((tb[0] - ta[0]) * (tc[1] - ta[1]) - (tb[1] - ta[1]) * (tc[0] - ta[0])) <= 0) {
                    throw new Error('Reference controls reverse a projection triangle: ' + JSON.stringify([a, b, c]));
                }
                triangles.push([i, j, k]);
            }
        }
    }
    return (p: Point): Point => {
        const original = base(p);
        for (const ids of triangles) {
            const [a, b, c] = ids.map(i => nodes[i]!) as [
                typeof nodes[number],
                typeof nodes[number],
                typeof nodes[number]
            ];
            const den = (b.p[1] - c.p[1]) * (a.p[0] - c.p[0]) + (c.p[0] - b.p[0]) * (a.p[1] - c.p[1]);
            const u = ((b.p[1] - c.p[1]) * (p[0] - c.p[0]) + (c.p[0] - b.p[0]) * (p[1] - c.p[1])) / den;
            const v = ((c.p[1] - a.p[1]) * (p[0] - c.p[0]) + (a.p[0] - c.p[0]) * (p[1] - c.p[1])) / den;
            const w = 1 - u - v;
            if (Math.min(u, v, w) < -1e-8) {
                continue;
            }
            return [u * a.d[0] + v * b.d[0] + w * c.d[0], u * a.d[1] + v * b.d[1] + w * c.d[1]];
        }
        return original;
    };
}
