import type { Point2, RailApproach } from '../../src/domain/map/model.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { platformTangent, pointInPolygon } from '../../src/domain/map/geometry.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGeographicStations } from '../../src/infrastructure/district/geographic-stations.ts';
import { sampleRailSegment, platformRail, railApproachFootprints } from '../../src/domain/map/rail-geometry.ts';
import clipping from 'polygon-clipping';
import { nishiAxis } from '../../src/infrastructure/stations/nishi-umeda/geographic.ts';
import { jrAxisPoint, jrGroundFrame } from '../../src/infrastructure/stations/jr-osaka/ground-frame.ts';
import { jrRailCorridors } from '../../src/infrastructure/stations/jr-osaka/rail-corridors.ts';
import { hankyuConcourseAreas } from '../../src/infrastructure/buildings/hankyu-dept/concourse.ts';

const stations = createGeographicStations();

test('the Hankyu 1F public passage passes below the JR eastern rail approaches', () => {
    const [jr] = stations;
    const polygon = (outline: Point2[]): clipping.Polygon => [outline.map(p => [p.x, p.z])];
    const underpass = hankyuConcourseAreas.filter(a => a.id.startsWith('hankyu-concourse-north-ground-'));
    for (const corridor of ['main', 'loop']) {
        const approach = jr!.layout.railApproaches!.find(a => a.id === 'map-rail-jr-osaka-platform-' + corridor + '-1')!;
        assert(jr!.levels.find(l => l.id === approach.level)!.y > 0);
        assert(railApproachFootprints(approach, 1.65).some(outline =>
            underpass.some(a => a.level === 'district-ground' && clipping.intersection(polygon(outline), polygon(a.outline)).length)
        ));
    }
});

test(
    'calibrated rail approaches restore smooth shared merges without sharp doglegs',
    () => {
        for (const station of stations) {
            for (const approach of station.layout.railApproaches ?? []) {
                const platform = station.layout.platforms.find(p => p.level === approach.level)!;
                const axis = { x: Math.cos(platform.rotationRad), z: Math.sin(platform.rotationRad) };
                for (const segment of approach.segments) {
                    const samples = sampleRailSegment(approach, segment, 100);
                    const a = samples[0]!.point;
                    const b = samples.at(-1)!.point;
                    const sign = Math.sign((b.x - a.x) * axis.x + (b.z - a.z) * axis.z);
                    let previous: {
                        x: number;
                        z: number;
                    } | undefined;
                    for (let i = 1; i < samples.length; i++) {
                        const p = samples[i - 1]!.point;
                        const q = samples[i]!.point;
                        const dx = q.x - p.x;
                        const dz = q.z - p.z;
                        const length = Math.hypot(dx, dz);
                        const forward = sign * (dx * axis.x + dz * axis.z) / length;
                        assert.ok(forward > Math.cos(40 * Math.PI / 180), segment.id + ' sideways or reversing');
                        if (previous) {
                            const angle = Math.acos(Math.min(1, Math.max(-1, (previous.x * dx + previous.z * dz) / length)));
                            assert.ok(angle < .04, segment.id + ' abrupt curvature');
                        }
                        previous = { x: dx / length, z: dz / length };
                    }
                    if (segment.platformId) {
                        const p = station.layout.platforms.find(p => p.id === segment.platformId)!;
                        const rail = platformRail(p, p.tracks.indexOf(segment.track!));
                        assert.ok([rail.start, rail.end].some(end => Math.hypot(end.x - a.x, end.z - a.z) < 1e-8));
                        const tangent = platformTangent(p, sign * p.length / 2);
                        const dx = segment.control1.x - a.x;
                        const dz = segment.control1.z - a.z;
                        assert.ok(Math.abs(dx * Math.sin(tangent) - dz * Math.cos(tangent)) < 1e-7);
                    }
                }
            }
        }
    }
);
test(
    'Nishi platform and paid halls move west in the same station frame',
    () => {
        assert.equal(nishiAxis.negativeEnd.x, 415);
        assert.equal(nishiAxis.positiveEnd.x, 423);
        const station = stations.find(s => s.id === 'nishi-umeda')!;
        const paid = station.layout.areas.find(a => a.kind === 'paid')!;
        assert.ok(paid.outline.reduce((s, p) => s + p.x / paid.outline.length, 0) < station.layout.platforms[0]!.x);
    }
);
test(
    'Umekita and Hankyu merge into shared running pairs rather than independent tails',
    () => {
        for (const s of stations) {
            for (const a of s.layout.railApproaches ?? []) {
                if (a.level !== 'underground-platform' && a.level !== 'hankyu-platform') {
                    continue;
                }
                assert.equal(a.nodes.filter(n => n.kind === 'end').length, 2);
                assert.equal(a.segments.filter(seg => a.nodes.find(n => n.id === seg.to)!.kind === 'end').length, 2);
                assert.ok(a.nodes.filter(n => n.kind === 'platform-end').length >= 3);
                for (const node of a.nodes.filter(n => n.kind === 'junction')) {
                    const outgoing = a.segments.find(s => s.from === node.id)!;
                    const ox = outgoing.control1.x - node.point.x;
                    const oz = outgoing.control1.z - node.point.z;
                    for (const incoming of a.segments.filter(s => s.to === node.id)) {
                        const ix = node.point.x - incoming.control2.x;
                        const iz = node.point.z - incoming.control2.z;
                        assert.ok(Math.abs(ix * oz - iz * ox) < 1e-6);
                        assert.ok(ix * ox + iz * oz > 0);
                    }
                }
            }
        }
    }
);
test(
    'JR main bends north at both ends and east loop avoids Hankyu building envelopes',
    () => {
        const jr = stations[0]!;
        const angle = jr.layout.platforms.find(p => p.level === 'platform')!.rotationRad;
        for (const side of [-1, 1]) {
            const main = jr.layout.railApproaches!.find(a => a.id === `map-rail-jr-osaka-platform-main-${side}`)!;
            const tail = main.segments.at(-1)!;
            const a = main.nodes.find(n => n.id === tail.from)!.point;
            const b = main.nodes.find(n => n.id === tail.to)!.point;
            assert.ok(
                side === 1 ? b.z < a.z : (b.z - a.z) / Math.hypot(b.x - a.x, b.z - a.z) < side * Math.sin(angle),
                'main must turn toward geographic north'
            );
            assert.ok(main.name.includes(side === 1 ? '新大阪' : '神户'));
        }
        const loop = jr.layout.railApproaches!.find(a => a.id === 'map-rail-jr-osaka-platform-loop-1')!;
        assert.ok(loop.name.includes('京桥'));
        for (const segment of loop.segments) {
            for (const sample of sampleRailSegment(loop, segment, 200)) {
                for (const side of [-1, 0, 1]) {
                    const point = {
                        x: sample.point.x + sample.normal.x * side * 1.5,
                        z: sample.point.z + sample.normal.z * side * 1.5
                    };
                    for (const building of geographicBuildings.filter(b => b.id === 'hankyu-dept' || b.id === 'hankyu-grand')) {
                        assert.ok(
                            !pointInPolygon(point, building.volumes[0]!.outline),
                            building.id + ' intersects east loop track bed'
                        );
                    }
                }
            }
        }
    }
);
function railPieces(approach: RailApproach): [
    Point2,
    Point2
][] {
    return approach.segments.flatMap(segment => {
        const samples = sampleRailSegment(approach, segment, 120);
        return samples.slice(1).map((sample, index): [
            Point2,
            Point2
        ] => [samples[index]!.point, sample.point]);
    });
}

function crossing(a: Point2, b: Point2, c: Point2, d: Point2): boolean {
    const side = (p: Point2, q: Point2, r: Point2) => (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
    return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
}

function pointSegmentDistance(p: Point2, a: Point2, b: Point2): number {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}
test(
    'JR loop remains on its side of the main corridor at both station ends',
    () => {
        const jr = stations[0]!;
        for (const side of [-1, 1]) {
            const main = jr.layout.railApproaches!.find(a => a.id === `map-rail-jr-osaka-platform-main-${side}`)!;
            const loop = jr.layout.railApproaches!.find(a => a.id === `map-rail-jr-osaka-platform-loop-${side}`)!;
            const mainPieces = railPieces(main);
            for (const [a, b] of railPieces(loop)) {
                assert.ok(!mainPieces.some(([c, d]) => crossing(a, b, c, d)), `${side}: loop cuts through mainline fan`);
                // Each rendered ballast strip is 2.5 m wide; different bundles need a visible gap.
                for (const [c, d] of mainPieces) {
                    const clearance = Math.min(
                        pointSegmentDistance(a, c, d),
                        pointSegmentDistance(b, c, d),
                        pointSegmentDistance(c, a, b),
                        pointSegmentDistance(d, a, b)
                    );
                    assert.ok(clearance > 3.4, `${side}: loop/main ballast strips overlap or nearly touch`);
                }
            }
        }
    }
);
test(
    'west loop pair narrows and approaches the mainline bundle before continuing',
    () => {
        const jr = stations[0]!;
        const angle = jr.layout.platforms.find(p => p.level === 'platform')!.rotationRad;
        const across = (p: Point2) => -p.x * Math.sin(angle) + p.z * Math.cos(angle);
        const main = jr.layout.railApproaches!.find(a => a.id === 'map-rail-jr-osaka-platform-main--1')!;
        const loop = jr.layout.railApproaches!.find(a => a.id === 'map-rail-jr-osaka-platform-loop--1')!;
        const positions = (a: RailApproach, kind: string) => a.nodes.filter(n => n.kind === kind).map(n => across(n.point));
        const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
        const rootGap = mean(positions(loop, 'platform-end')) - mean(positions(main, 'platform-end'));
        const throatGap = mean(positions(loop, 'junction')) - mean(positions(main, 'junction'));
        const loopRoots = positions(loop, 'platform-end');
        const loopThroat = positions(loop, 'junction');
        assert.ok(throatGap > 0 && throatGap < rootGap * .6, 'separate western corridors do not draw closer');
        assert.ok(
            Math.max(...loopThroat) - Math.min(...loopThroat) < (Math.max(...loopRoots) - Math.min(...loopRoots)) * .5,
            'loop roads remain platform-width apart'
        );
        for (const approach of [main, loop]) {
            for (const segment of approach.segments.filter(s => s.platformId)) {
                const samples = sampleRailSegment(approach, segment, 100);
                const first = samples[0]!.point;
                const last = samples.at(-1)!.point;
                const run = (first.x - last.x) * Math.cos(angle) + (first.z - last.z) * Math.sin(angle);
                assert.ok(run > 185, segment.id + ' compresses the west fan');
                let previousTurn = 0;
                for (const { normal } of samples) {
                    const forward = -normal.z * Math.cos(angle) + normal.x * Math.sin(angle);
                    const turn = Math.atan2(normal.z * Math.sin(angle) + normal.x * Math.cos(angle), forward);
                    assert.ok(turn >= previousTurn - 1e-7, segment.id + ' reverses its westward curve');
                    previousTurn = turn;
                }
                assert.ok(Math.abs(previousTurn - jrRailCorridors.mainNorthTurn) < 1e-7, segment.id + ' misses the common departure tangent');
            }
        }
    }
);

test('JR east runtime track beds stay clear of the actual Hankyu halls and landmark shells', () => {
    const [jr, hankyu] = stations;
    const ring = (points: Point2[]): clipping.Ring => points.map(p => [p.x, p.z]);
    const obstacles = [
        ...hankyu!.layout.areas.map(a => ({ name: a.id, outline: a.outline })),
        ...geographicBuildings.filter(b => ['hankyu-sanbangai', 'hankyu-dept', 'hankyu-grand', 'hep-five', 'hep-navio'].includes(b.id))
            .flatMap(b => b.volumes.map(v => ({ name: b.id + '/' + v.name, outline: v.outline })))
    ];
    for (const approach of jr!.layout.railApproaches!.filter(a => a.level === 'platform' && !a.id.endsWith('--1'))) {
        for (const obstacle of obstacles) {
            const halfWidth = obstacle.name.startsWith('hankyu-dept/') ? 4.25 : 2.75;
            for (const bed of railApproachFootprints(approach, halfWidth)) {
                assert.equal(clipping.intersection([ring(bed)], [ring(obstacle.outline)]).length, 0, `${approach.id}: ${obstacle.name}`);
            }
        }
    }
});

test('JR eastern apron retains six running roads with a gentle departure rather than a crosswise throat', () => {
    const station = stations[0]!;
    const eastern = station.layout.railApproaches!.filter(a => a.level === 'platform' && !a.id.endsWith('--1'));
    assert.equal(eastern.flatMap(a => a.nodes.filter(n => n.kind === 'end')).length, 6);
    const axis = station.layout.platforms.find(p => p.level === 'platform')!.rotationRad;
    for (const approach of eastern) {
        for (const segment of approach.segments) {
            const samples = sampleRailSegment(approach, segment, 120);
            for (let i = 1; i < samples.length; i++) {
                const p = samples[i - 1]!.point;
                const q = samples[i]!.point;
                const heading = Math.atan2(q.z - p.z, q.x - p.x);
                assert(Math.abs(heading - axis) < 15 * Math.PI / 180, segment.id + ' bends too far from the departure axis');
            }
        }
    }
});

test('the east loop outer road turns in before Hankyu department store (阪急うめだ本店)', () => {
    const jr = stations[0]!;
    const loop = jr.layout.railApproaches!.find(a => a.id === 'map-rail-jr-osaka-platform-loop-1')!;
    const outer = loop.segments.find(s => s.track === 1)!;
    const inner = loop.segments.find(s => s.track === 2)!;
    const e = jrAxisPoint(200, 0);
    const { angle } = jrGroundFrame;
    const beforeFrontage = sampleRailSegment(loop, outer, 200).reduce((closest, sample) => {
        const alongDistance = (p: Point2) => Math.abs((p.x - e.x) * Math.cos(angle) + (p.z - e.z) * Math.sin(angle));
        return alongDistance(sample.point) < alongDistance(closest.point) ? sample : closest;
    });
    const lateral = (p: Point2) => -(p.x - e.x) * Math.sin(angle) + (p.z - e.z) * Math.cos(angle);
    assert.ok(lateral(beforeFrontage.point) < 41.5);
    const innerPieces = railPieces({ ...loop, segments: [inner, ...loop.segments.filter(s => s.from === inner.to)] });
    const outerPieces = railPieces({ ...loop, segments: [outer, ...loop.segments.filter(s => s.from === outer.to)] });
    for (const [a, b] of outerPieces) {
        assert.ok(innerPieces.every(([c, d]) => !crossing(a, b, c, d) && pointSegmentDistance(a, c, d) > 4));
    }
});
