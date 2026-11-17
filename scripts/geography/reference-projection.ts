import { closestOnLine, localRoadFit } from './local-road-fit.ts';
import { readFileSync } from 'node:fs';
import type { NetworkPart, Point } from '../../data/geography/underground/network.ts';

/** Least-squares affine fit; reports residuals rather than claiming survey precision. */
export function fitReference(controls: {
    reference: Point;
    target: Point;
}[]) {
    /**
     * Solve affine least-squares coefficients for one target axis from control points.
     */
    function solve(axis: 0 | 1) {
        const a = Array.from({ length: 3 }, () => [0, 0, 0, 0]);
        for (const c of controls) {
            const v = [...c.reference, 1];
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    a[i]![j]! += v[i]! * v[j]!;
                }
                a[i]![3]! += v[i]! * c.target[axis];
            }
        }
        for (let i = 0; i < 3; i++) {
            let pivot = i;
            for (let j = i + 1; j < 3; j++) {
                if (Math.abs(a[j]![i]!) > Math.abs(a[pivot]![i]!)) {
                    pivot = j;
                }
            }
            [a[i], a[pivot]] = [a[pivot]!, a[i]!];
            const d = a[i]![i]!;
            if (Math.abs(d) < 1e-9) {
                throw new Error('Degenerate reference controls');
            }
            for (let k = i; k < 4; k++) {
                a[i]![k]! /= d;
            }
            for (let j = 0; j < 3; j++) {
                if (j !== i) {
                    const f = a[j]![i]!;
                    for (let k = i; k < 4; k++) {
                        a[j]![k]! -= f * a[i]![k]!;
                    }
                }
            }
        }
        return a.map(r => r[3]!);
    }
    const x = solve(0);
    const y = solve(1);
    const project = ([u, v]: Point): Point => [x[0]! * u + x[1]! * v + x[2]!, y[0]! * u + y[1]! * v + y[2]!];
    return {
        project,
        residuals: controls.map(c => {
            const p = project(c.reference);
            return Math.hypot(p[0] - c.target[0], p[1] - c.target[1]);
        })
    };
}

/** Compound PDF rings: retain building islands rather than filling their interiors. */
export function compoundPolygons(rings: Point[][]): Point[][][] {
    const area = (r: Point[]) => Math.abs(r.reduce(
        (s, p, i) => {
            const q = r[(i + 1) % r.length]!;
            return s + p[0] * q[1] - q[0] * p[1];
        },
        0
    ));
    const inside = (p: Point, r: Point[]) => {
        let yes = false;
        for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
            const a = r[i]!;
            const b = r[j]!;
            if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) {
                yes = !yes;
            }
        }
        return yes;
    };
    const sorted = [...rings].filter(r => area(r) > 1e-8).sort((a, b) => area(b) - area(a));
    const result: Point[][][] = [];
    const entries: {
        ring: Point[];
        depth: number;
        polygon: Point[][];
    }[] = [];
    for (const ring of sorted) {
        const parent = [...entries].reverse().find(e => inside(ring[0]!, e.ring));
        const depth = parent ? parent.depth + 1 : 0;
        const polygon = depth % 2 === 0 ? [ring] : parent!.polygon;
        if (depth % 2 === 0) {
            result.push(polygon);
        }
        else {
            polygon.push(ring);
        }
        entries.push({ ring, depth, polygon });
    }
    return result;
}

/**
 * Project PDF outlines through shared road controls and local road fits while retaining source detail.
 */
export function sourceProjection() {
    const source = JSON.parse(readFileSync('data/geography/underground/pdf-outline.json', 'utf8')) as {
        pageSize: Point;
        paths: {
            rings: Point[][];
            commandCount: number;
        }[];
    };
    const calibration = JSON.parse(readFileSync('data/geography/underground/reference-controls.json', 'utf8')) as {
        controls: {
            id: string;
            reference: Point;
        }[];
        northControls: {
            id: string;
            reference: Point;
        }[];
    };
    const features = JSON.parse(readFileSync('data/geography/features.json', 'utf8')) as {
        id: string;
        coordinates: Point[];
    }[];
    const locate = (c: {
        id: string;
        reference: Point;
    }) => {
        const f = features.find(f => f.id === c.id);
        if (!f) {
            throw new Error(`Missing control building ${c.id}`);
        }
        const ring = f.coordinates.map(([lon, lat]): Point => [(lon - 135.491) * 111320 * Math.cos(34.708 * Math.PI / 180), (34.708 - lat) * 111320]);
        let area = 0;
        let x = 0;
        let y = 0;
        for (let i = 0; i < ring.length - 1; i++) {
            const p = ring[i]!;
            const q = ring[i + 1]!;
            const cross = p[0] * q[1] - q[0] * p[1];
            area += cross;
            x += (p[0] + q[0]) * cross;
            y += (p[1] + q[1]) * cross;
        }
        return { ...c, target: [x / (3 * area), y / (3 * area)] as Point };
    };
    const controls = calibration.controls.map(locate);
    const northControls = calibration.northControls.map(locate);
    const fit = fitReference(controls);
    const northFit = fitReference(northControls);
    const baseProject = (p: Point): Point => {
        const t = Math.max(0, Math.min(1, (p[1] - 300) / 140));
        const w = t * t * (3 - 2 * t);
        const a = northFit.project(p);
        const b = fit.project(p);
        return [a[0] * (1 - w) + b[0] * w, a[1] * (1 - w) + b[1] * w];
    };
    const roadConfig = JSON.parse(readFileSync('data/geography/underground/road-anchors.json', 'utf8')) as {
        anchors: {
            name: string;
            reference: Point;
            roadId?: string;
            buildingId?: string;
            targetHint?: Point;
            targetMetres?: Point;
        }[];
    };
    const roadControls = roadConfig.anchors.map(a => {
        const road = features.find(f => f.id === (a.roadId ?? a.buildingId));
        if (!road) {
            throw new Error(`Missing road ${a.roadId}`);
        }
        const line = road.coordinates.map(([lon, lat]): Point => [(lon - 135.491) * 111320 * Math.cos(34.708 * Math.PI / 180), (34.708 - lat) * 111320]);
        const before = baseProject(a.reference);
        const target = a.targetMetres ?? closestOnLine(a.targetHint ?? before, line);
        return {
            ...a,
            target,
            before,
            displacementMetres: Math.hypot(target[0] - before[0], target[1] - before[1])
        };
    });
    const project = localRoadFit(baseProject, roadControls);
    // Subdivide long edges before the smooth regional fit to avoid corner-only warping.
    const projectRing = (ring: Point[]) => ring.flatMap((p, i) => {
        const q = ring[(i + 1) % ring.length]!;
        const count = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 2));
        return Array.from(
            { length: count },
            (_, j) => project([p[0] + (q[0] - p[0]) * j / count, p[1] + (q[1] - p[1]) * j / count])
        );
    });
    const parts: NetworkPart[] = source.paths.map((path, i) => ({
        id: `pdf-public-space-${i}`,
        name: '地区图地下公共空间',
        block: 'district-reference',
        source: 'references/district/underground-walkway-map.pdf',
        page: 1,
        evidence: 'underground-level-unresolved',
        sections: [],
        polygons: compoundPolygons(path.rings).map(p => p.map(projectRing)),
        label: [-100, -100],
        note: '直接提取 PDF 黄色填充的原始矢量边界；保留凹凸、曲线及孔洞。仿射配准为示意，不代表实测开挖线或全部属于 B1。'
    }));
    return {
        parts,
        roadControls,
        projectRing,
        controls: controls.map((c, i) => ({ ...c, residualMetres: fit.residuals[i] })),
        northControls: northControls.map((c, i) => ({ ...c, residualMetres: northFit.residuals[i] })),
        project
    };
}
