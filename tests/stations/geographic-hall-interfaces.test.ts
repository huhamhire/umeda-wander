import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import { createGeographicKitashinchi } from '../../src/infrastructure/stations/kitashinchi/geographic.ts';
import { createGeographicNishi } from '../../src/infrastructure/stations/nishi-umeda/geographic.ts';
test(
    'geographic western gates border paid and public halls with route endpoints on correct sides',
    () => {
        for (const s of [createGeographicKitashinchi(), createGeographicNishi()]) {
            const paid = s.layout.areas.filter(a => a.kind === 'paid');
            const pub = s.layout.areas.filter(a => a.kind === 'public');
            for (const f of s.facilities.filter(f => f.kind === 'gate')) {
                assert.ok(paid.some(a => pointInPolygon(f, a.outline)), f.id + ' paid boundary');
                assert.ok(pub.some(a => pointInPolygon(f, a.outline)), f.id + ' public boundary');
            }
            for (const e of s.edges.filter(e => e.kind === 'gate')) {
                const ends = [e.from, e.to].map(id => s.nodes.find(n => n.id === id)!);
                assert.equal(ends.filter(n => paid.some(a => pointInPolygon(n, a.outline))).length, 1);
                assert.ok(ends.some(n => pub.some(a => pointInPolygon(n, a.outline))));
            }
        }
    }
);
test(
    'Kitashinchi gates face north; Nishi south gate crosses the south end',
    () => {
        const k = createGeographicKitashinchi();
        const n = createGeographicNishi();
        const gates = k.facilities.filter(f => f.kind === 'gate');
        const p = k.layout.platforms[0]!;
        assert.ok(gates.every(f => f.z < p.z));
        assert.ok(gates[0]!.x < gates[1]!.x);
        const south = n.facilities.find(f => f.id === 'nishi-umeda-south-gate')!;
        assert.ok(south.z > n.layout.platforms[0]!.z);
        assert.ok(Math.abs(south.rotationRad! - n.layout.platforms[0]!.rotationRad - Math.PI / 2) < 1e-8);
    }
);
