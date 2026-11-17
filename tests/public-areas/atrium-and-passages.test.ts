import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { planAtriumOpenings } from '../../src/application/connections/atrium-openings.ts';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import { facilities, layout, levels } from '../../src/infrastructure/district/geographic-map.ts';
import { buildFloorGeometry } from '../../src/presentation/models/floor-geometry.ts';
test(
    'North atrium is a shared void with all four bank groups arriving at exterior edges',
    () => {
        const wells = planFloorOpenings(layout.connections, levels, layout.platforms);
        const voids = planAtriumOpenings(layout.atria.filter(a => a.id === 'north-atrium-void'));
        assert.equal(voids.length, 2);
        assert(!voids.some(o => o.level === 'concourse'));
        for (const id of [
            'north-2',
            'north-2-stairs',
            'north-3',
            'north-47',
            'north-48'
        ]) {
            const c = layout.connections.find(c => c.id === id)!;
            assert.equal(c.placement, 'exterior');
            assert(!wells.some(o => o.connectionId === id));
        }
        const floor = layout.areas.find(a => a.id === 'north-2f-public')!;
        const material = new T.MeshBasicMaterial({ side: T.DoubleSide });
        const mesh = (cuts: typeof voids) => {
            const m = new T.Mesh(buildFloorGeometry(floor.outline, cuts.map(o => o.outline), 0.55), material);
            m.updateMatrixWorld();
            return m;
        };
        const voidOutline = voids.find(o => o.level === 'platform')!.outline;
        const center = voidOutline.reduce(
            (p, q) => ({ x: p.x + q.x / voidOutline.length, z: p.z + q.z / voidOutline.length }),
            { x: 0, z: 0 }
        );
        const ray = new T.Raycaster(new T.Vector3(center.x, 20, center.z), new T.Vector3(0, -1, 0));
        assert(ray.intersectObject(mesh([])).length > 0);
        assert.equal(ray.intersectObject(mesh(voids.filter(o => o.level === 'platform'))).length, 0);
    }
);
test(
    'South bridge flights are diagonal exterior connections followed by 50/T to the front 2F passage',
    () => {
        const a = layout.connections.find(c => c.id === 'south-15')!;
        const b = layout.connections.find(c => c.id === 'south-stairs-16')!;
        for (const c of [a, b]) {
            assert.equal(c.placement, 'exterior');
            assert(c.from.x !== c.to.x && c.from.z !== c.to.z);
        }
        const ad = new T.Vector2(a.to.x - a.from.x, a.to.z - a.from.z).normalize();
        const bd = new T.Vector2(b.to.x - b.from.x, b.to.z - b.from.z).normalize();
        assert(ad.dot(bd) > 0.999);
        const front = layout.areas.find(a => a.id === 'south-entrance-deck')!;
        assert.equal(front.level, 'south-deck');
        for (const id of ['south-building-50', 'south-lift-t']) {
            const c = layout.connections.find(c => c.id === id)!;
            assert.equal(c.from.level, 'south-deck');
            assert(pointInPolygon(c.from, front.outline));
        }
    }
);
test(
    'both convenience stores use compact labels and retain separate source floors and paid status',
    () => {
        const stores = facilities.filter(f => f.kind === 'convenience-store');
        assert.equal(stores.length, 2);
        for (const f of stores) {
            assert.equal(f.name, '7-Eleven');
            assert(f.evidence.pages.length > 0);
        }
        const central = stores.find(f => f.level === 'concourse')!;
        const bridge = stores.find(f => f.level === 'bridge')!;
        assert(!layout.areas.some(a => a.level === central.level && a.kind === 'paid' && pointInPolygon(central, a.outline)));
        assert(layout.areas.some(a => a.level === bridge.level && a.kind === 'paid' && pointInPolygon(bridge, a.outline)));
    }
);
