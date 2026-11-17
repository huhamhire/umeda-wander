import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGeographicUmekita } from '../../src/infrastructure/stations/jr-osaka/umekita/geographic.ts';
import { platformPoint, platformLocalPoint, platformTangent, platformOutline } from '../../src/domain/map/geometry.ts';
test(
    'Umekita bowed platforms preserve local landing coordinates and smooth end tangents',
    () => {
        for (const p of createGeographicUmekita().layout.platforms) {
            assert.equal(platformOutline(p).length, 82);
            for (const u of [
                -p.length / 2,
                -50,
                0,
                50,
                p.length / 2
            ]) {
                for (const v of [-p.width / 2, 0, p.width / 2]) {
                    const q = platformLocalPoint(p, platformPoint(p, u, v));
                    assert.ok(Math.abs(q.x - u) < 1e-8 && Math.abs(q.z - v) < 1e-8);
                }
            }
            assert.ok(platformTangent(p, -p.length / 2) > p.rotationRad);
            assert.ok(platformTangent(p, p.length / 2) < p.rotationRad);
            assert.equal(platformTangent(p, p.length), platformTangent(p, p.length / 2));
        }
    }
);
