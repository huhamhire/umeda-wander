import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointInPolygon, platformLocalPoint } from '../../src/domain/map/geometry.ts';
import { createGeographicKitashinchi } from '../../src/infrastructure/stations/kitashinchi/geographic.ts';
import { createGeographicNishi } from '../../src/infrastructure/stations/nishi-umeda/geographic.ts';
import * as T from 'three';
import { bindPublicInterfaces } from '../../src/application/stations/public-interface-bindings.ts';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { layout, levels, publicInterfaces, publicInterfaceBindings } from '../../src/infrastructure/district/geographic-map.ts';
import { buildFloorGeometry } from '../../src/presentation/models/floor-geometry.ts';

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

test(
    'all equipment landings lie on their own station floor/platform or a same-height shared public floor',
    () => {
        for (const c of layout.connections) {
            for (const n of [c.from, c.to]) {
                const y = levels.find(l => l.id === n.level)!.y + (n.elevationOffset ?? 0);
                const facing = c.doorFacingRad === undefined
                    ? undefined
                    : c.doorFacingRad + (c.reverseLowerDoor && n === c.from ? Math.PI : 0);
                const door = facing === undefined ? n : {
                    x: n.x + 2 * Math.cos(facing),
                    z: n.z + 2 * Math.sin(facing)
                };
                const floor = layout.areas.some(a => (a.level === n.level || a.kind === 'public' && (c.blockId !== undefined || a.blockId !== undefined)) &&
                    Math.abs(levels.find(l => l.id === a.level)!.y + (a.elevationOffset ?? 0) - y) < .01 &&
                    [door, n].some(p => pointInPolygon(p, a.outline) && !a.holes?.some(h => pointInPolygon(p, h))));
                const platform = layout.platforms.some(p => {
                    const local = platformLocalPoint(p, n);
                    return p.level === n.level && Math.abs(local.x) <= p.length / 2 + .001 && Math.abs(local.z) <= p.width / 2 + .001;
                });
                assert.ok(floor || platform, c.id + ' unsupported ' + n.level);
            }
            if (c.kind === 'elevator') {
                assert.ok(Math.hypot(c.from.x - c.to.x, c.from.z - c.to.z) < .001, c.id + ' inclined shaft');
            }
        }
    }
);
test(
    'every B1 gate exposes a stable outward public interface bound at the shared display elevation',
    () => {
        const ports = publicInterfaces.filter(p => p.elevation === -8);
        assert.equal(ports.length, 16);
        assert.equal(publicInterfaceBindings.length, ports.length);
        assert.equal(new Set(publicInterfaces.map(p => p.id)).size, publicInterfaces.length);
        for (const p of ports) {
            assert.ok(
                layout.areas.some(a => a.level === p.level && a.kind === 'paid' && pointInPolygon(p.inside, a.outline)),
                p.id + ' inside'
            );
            assert.ok(
                !layout.areas.some(a => a.level === p.level && a.kind === 'paid' && pointInPolygon(p.outside, a.outline)),
                p.id + ' outside'
            );
            assert.equal(publicInterfaceBindings.find(b => b.interfaceId === p.id)!.elevation, -8);
        }
        assert.throws(() => bindPublicInterfaces(ports, [], levels), /no same-height landing/);
    }
);
test(
    'shared B1 cuts openings for non-JR public stairs and street lift, with real holes in the mesh',
    () => {
        const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
        for (const id of ['hanshin-umeda-east-public-stairs', 'higashi-umeda-street-lift', 'nishi-umeda-street-lift']) {
            const cut = openings.find(o => o.level === 'district-underground' && o.connectionId === id);
            assert.ok(cut, id);
            const center = cut.outline.reduce(
                (p, q) => ({ x: p.x + q.x / cut.outline.length, z: p.z + q.z / cut.outline.length }),
                { x: 0, z: 0 }
            );
            const area = layout.areas.find(a => a.level === 'district-underground' && pointInPolygon(center, a.outline) && !a.holes?.some(h => pointInPolygon(center, h)));
            assert.ok(area, id + ' aperture outside floor');
            const geometry = buildFloorGeometry(
                area.outline,
                [...area.holes ?? [], ...openings.filter(o => o.level === area.level).map(o => o.outline)],
                .55,
                0
            );
            const mesh = new T.Mesh(geometry, new T.MeshBasicMaterial({ side: T.DoubleSide }));
            mesh.updateMatrixWorld();
            assert.equal(
                new T.Raycaster(new T.Vector3(center.x, 5, center.z), new T.Vector3(0, -1, 0), 0, 10).intersectObject(mesh).length,
                0,
                id + ' sealed hole'
            );
            geometry.dispose();
        }
    }
);
