import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import polygonClipping from 'polygon-clipping';
import { stationReservations } from '../../data/geography/underground/network.ts';
import { kitashinchiInterface } from '../../data/geography/underground/station-interfaces.ts';
import { closestOnLine, localRoadFit } from '../../scripts/geography/local-road-fit.ts';
import { compoundPolygons, fitReference, sourceProjection } from '../../scripts/geography/reference-projection.ts';
import { areaOf, envelope } from '../../scripts/geography/underground-geometry.ts';
test(
    'local road fit aligns explicit anchors and leaves distant geometry untouched',
    () => {
        assert.deepEqual(closestOnLine([5, 4], [[0, 0], [10, 0]]), [5, 0]);
        const fit = localRoadFit(p => p, [{ reference: [0, 0], target: [0, 8] }], 100);
        assert.deepEqual(fit([0, 0]), [0, 8]);
        assert.deepEqual(fit([200, 200]), [200, 200]);
        const { roadControls, project } = sourceProjection();
        for (const c of roadControls) {
            const p = project(c.reference);
            assert.ok(Math.hypot(p[0] - c.target[0], p[1] - c.target[1]) < 1e-6);
        }
        // Sample triangle interiors (avoid exact grid-aligned crease intersections).
        // Every triangle's orientation is also checked when constructing the fit.
        for (let x = 240.137; x <= 700; x += 5) {
            for (let y = 80.231; y <= 660; y += 5) {
                const p = project([x, y]);
                const a = project([x + .01, y]);
                const b = project([x, y + .01]);
                assert.ok((a[0] - p[0]) * (b[1] - p[1]) - (a[1] - p[1]) * (b[0] - p[0]) > 0, `fold at ${x},${y}`);
            }
        }
    }
);
test(
    'LUCUA route retains its western turn and Hanshin follows the road axis',
    () => {
        const { project } = sourceProjection();
        const corner = project([265, 313]);
        const along = project([330, 260]);
        const end = project([235, 300]);
        assert.ok(along[0] > corner[0] + 50 && along[1] < corner[1] - 30, 'run follows LUCUA frontage northeast');
        assert.ok(end[0] < corner[0] - 30 && end[1] < corner[1], 'western turn heads toward Umekita');
        const config = JSON.parse(readFileSync('data/geography/underground/road-anchors.json', 'utf8'));
        assert.ok(
            !config.anchors.some((a: {
                name: string;
            }) => a.name.startsWith('梅北沿路')),
            'do not force the verified walking route onto the western road'
        );
        const west = project([405, 447]);
        const east = project([540, 365]);
        const slope = (east[1] - west[1]) / (east[0] - west[0]);
        assert.ok(slope < -.45 && slope > -.7, 'Hanshin diagonal matches road axis');
        const junction = project([606, 375]);
        assert.ok(Math.hypot(junction[0] - 757.08, junction[1] - 679.74) < 1);
    }
);
test(
    'southern streets retain ordered junctions and the Hilton connection stays south of Hanshin',
    () => {
        const { project } = sourceProjection();
        const west = project([405, 447]);
        const hilton = project([408, 462]);
        assert.ok(hilton[1] > west[1] + 10, 'public connection belongs on the station south side');
        const eastStation = project([540, 365]);
        const entry = project([460, 428]);
        const hub = project([494, 480]);
        const axis: [
            number,
            number
        ] = [eastStation[0] - west[0], eastStation[1] - west[1]];
        const approach: [
            number,
            number
        ] = [hub[0] - entry[0], hub[1] - entry[1]];
        const cosine = Math.abs((axis[0] * approach[0] + axis[1] * approach[1]) / (Math.hypot(...axis) * Math.hypot(...approach)));
        assert.ok(cosine < .035, 'First Life approach meets Hanshin axis within two degrees of perpendicular');
        const middle = project([530, 557]);
        const crossing = project([555, 550]);
        const east = project([600, 557]);
        assert.ok(middle[0] < crossing[0] && crossing[0] < east[0]);
        assert.ok(
            Math.max(middle[1], crossing[1], east[1]) - Math.min(middle[1], crossing[1], east[1]) < 3,
            'DIAMOR junctions follow the east-west street'
        );
        const north = project([535, 510]);
        assert.ok(
            north[0] < crossing[0] && north[1] < crossing[1] - 40,
            'diagonal street approaches from the northwest'
        );
    }
);
test(
    'Kitashinchi shared floor is existing public space inside the station footprint',
    () => {
        const r = sourceProjection();
        const publicArea = polygonClipping.union(...r.parts.map(envelope) as [
            ReturnType<typeof envelope>,
            ...ReturnType<typeof envelope>[]
        ]);
        const band = [[r.projectRing(kitashinchiInterface.publicBand)]];
        const shared = polygonClipping.intersection(publicArea, band, [[r.projectRing(kitashinchiInterface.footprint)]]);
        assert.ok(areaOf(shared) > 100);
        assert.ok(areaOf(polygonClipping.difference(shared, publicArea)) < 1e-6);
        assert.ok(areaOf(polygonClipping.difference(shared, [[r.projectRing(kitashinchiInterface.footprint)]])) < 1e-6);
    }
);
test(
    'offline station reservations retain valid shapes and source metadata',
    () => {
        const ids = new Set<string>();
        for (const part of stationReservations) {
            assert.ok(!ids.has(part.id));
            ids.add(part.id);
            assert.ok(part.source && part.page > 0 && part.note);
            assert.ok(part.sections.every(p => p.every(Number.isFinite) && p[2] > 0));
            assert.ok(areaOf(envelope(part)) > 0);
        }
    }
);
test(
    'reference projection preserves affine geometry and rejects degenerate controls',
    () => {
        const fit = fitReference([
            { reference: [0, 0], target: [10, 20] },
            { reference: [10, 0], target: [30, 20] },
            { reference: [0, 10], target: [10, 50] }
        ]);
        const p = fit.project([5, 5]);
        assert.ok(Math.abs(p[0] - 20) < 1e-8 && Math.abs(p[1] - 35) < 1e-8);
        assert.throws(() => fitReference([{ reference: [0, 0], target: [0, 0] }]));
    }
);
test(
    'PDF extraction preserves source identity, compound islands and detailed boundary vertices',
    () => {
        const source = JSON.parse(readFileSync('data/geography/underground/pdf-outline.json', 'utf8'));
        assert.equal(source.sha256, createHash('sha256').update(readFileSync(source.source)).digest('hex'));
        assert.equal(source.paths.length, 6);
        assert.equal(
            source.paths.reduce(
                (n: number, p: {
                    rings: unknown[];
                }) => n + p.rings.length,
                0
            ),
            41
        );
        const main = source.paths.find((p: {
            commandCount: number;
        }) => p.commandCount === 1357);
        const polygons = compoundPolygons(main.rings);
        assert.ok(polygons.some(p => p.length > 1), 'building islands retained');
        assert.ok(main.rings.flat().length > 2000, 'corners and curve samples retained');
        const { parts, controls, northControls } = sourceProjection();
        assert.ok([...controls, ...northControls].every(c => Number.isFinite(c.residualMetres)));
        for (const part of parts) {
            assert.ok(areaOf(envelope(part)) > 0);
            assert.ok(part.polygons!.flat(2).every(p => p.every(Number.isFinite)));
        }
    }
);
test(
    'compound geometry retains holes and nested islands',
    () => {
        const square = (n: number) => [
            [-n, -n],
            [n, -n],
            [n, n],
            [-n, n],
            [-n, -n]
        ] as [
            number,
            number
        ][];
        const geometry = compoundPolygons([square(5), square(1), square(3)]);
        assert.equal(areaOf(geometry), 100 - 36 + 4);
    }
);
