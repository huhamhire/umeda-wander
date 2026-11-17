import { createGeographicNishi } from '../../src/infrastructure/stations/nishi-umeda/geographic.ts';
import { createGeographicKitashinchi } from '../../src/infrastructure/stations/kitashinchi/geographic.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGeographicStations } from '../../src/infrastructure/district/geographic-stations.ts';
import { createGeographicUmekita } from '../../src/infrastructure/stations/jr-osaka/umekita/geographic.ts';
import { sampleRailSegment, platformRail } from '../../src/domain/map/rail-geometry.ts';
import { hanshinStation } from '../../src/infrastructure/stations/hanshin-umeda/index.ts';
import { higashiStation } from '../../src/infrastructure/stations/higashi-umeda/index.ts';
import { nishiStation } from '../../src/infrastructure/stations/nishi-umeda/index.ts';
import { kitashinchiStation } from '../../src/infrastructure/stations/kitashinchi/index.ts';
test(
    'seven geographic stations have unique IDs, no stale external Whity polygon, and preserve legacy data',
    () => {
        const legacy = [hanshinStation, higashiStation, nishiStation, kitashinchiStation];
        const before = JSON.stringify(legacy);
        const stations = createGeographicStations();
        assert.equal(stations.length, 7);
        assert.equal(new Set(stations.map(s => s.id)).size, 7);
        assert.equal(JSON.stringify(legacy), before);
        for (const s of stations) {
            assert.equal(new Set(s.levels.map(l => l.id)).size, s.levels.length);
            for (const a of s.layout.areas) {
                for (const p of a.outline) {
                    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.z));
                }
            }
        }
        const t = stations.find(s => s.id === 'higashi-umeda')!;
        const portal = t.layout.areas.find(a => a.id.endsWith('whity-public'))!;
        assert.ok(portal.outline.every(p => p.x > 700 && p.x < 850 && p.z > 700 && p.z < 800));
        stations[3]!.facilities[0]!.x = 0;
        assert.notEqual(createGeographicStations()[3]!.facilities[0]!.x, 0);
    }
);
test(
    'Umekita uses its own geographic axis without stretching JR ground or inventing a public crossing',
    () => {
        const s = createGeographicUmekita();
        assert.equal(s.layout.platforms.length, 2);
        for (const p of s.layout.platforms) {
            assert.ok(p.length > 210 && p.length < 220);
            assert.ok(p.width > 7 && p.width < 10);
            assert.ok(p.x < 220 && p.x > 170);
            assert.ok(Math.abs(p.rotationRad + 62.665 * Math.PI / 180) < 1e-9);
        }
        assert.equal(s.layout.connections.length, 6);
        assert.equal(s.edges.length, 0);
        assert.deepEqual(new Set(s.layout.areas.map(a => a.kind)), new Set(['public', 'paid']));
        assert.ok(!s.layout.areas.some(a => a.id === 'public-b1-connector' || a.id === 'underground-walkway'));
    }
);
test(
    'western geographic tracks extend outwards, attach to platform ends and cross below Y11',
    () => {
        const y = createGeographicNishi();
        const k = createGeographicKitashinchi();
        assert.equal(y.layout.railApproaches!.length, 1);
        assert.equal(k.layout.railApproaches!.length, 2);
        for (const s of [y, k]) {
            for (const a of s.layout.railApproaches!) {
                const p = s.layout.platforms[0]!;
                for (const segment of a.segments) {
                    const samples = sampleRailSegment(a, segment, 80);
                    const u = samples.map(q => (q.point.x - p.x) * Math.cos(p.rotationRad) + (q.point.z - p.z) * Math.sin(p.rotationRad));
                    const sign = u[0]! < 0 ? -1 : 1;
                    for (let i = 1; i < u.length; i++) {
                        assert.ok(sign * (u[i]! - u[i - 1]!) > 0, 'tail must not turn back into platform');
                    }
                    if (segment.platformId) {
                        const rail = platformRail(p, p.tracks.indexOf(segment.track!));
                        const start = a.nodes.find(n => n.id === segment.from)!.point;
                        assert.ok([rail.start, rail.end].some(end => Math.hypot(start.x - end.x, start.z - end.z) < 1e-8));
                    }
                }
            }
        }
        let count = 0;
        const cross = (x: number, z: number, u: number, v: number) => x * v - z * u;
        for (const ya of y.layout.railApproaches!) {
            for (const ka of k.layout.railApproaches!) {
                for (const ys of ya.segments) {
                    for (const ks of ka.segments) {
                        const yp = sampleRailSegment(ya, ys, 80);
                        const kp = sampleRailSegment(ka, ks, 80);
                        for (let i = 1; i < yp.length; i++) {
                            for (let j = 1; j < kp.length; j++) {
                                const a = yp[i - 1]!.point;
                                const b = yp[i]!.point;
                                const c = kp[j - 1]!.point;
                                const d = kp[j]!.point;
                                const det = cross(b.x - a.x, b.z - a.z, d.x - c.x, d.z - c.z);
                                if (Math.abs(det) < 1e-10) {
                                    continue;
                                }
                                const t = cross(c.x - a.x, c.z - a.z, d.x - c.x, d.z - c.z) / det;
                                const u = cross(c.x - a.x, c.z - a.z, b.x - a.x, b.z - a.z) / det;
                                if (t >= 0 && t < 1 && u >= 0 && u < 1) {
                                    count++;
                                }
                            }
                        }
                    }
                }
            }
        }
        assert.equal(count, 4);
        assert.ok(k.levels.find(l => l.id === 'kitashinchi-platform')!.y < y.levels.find(l => l.id === 'y11-platform')!.y);
    }
);
