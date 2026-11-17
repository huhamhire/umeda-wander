import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import { grandFrontPlazaAccess, layout, levels, undergroundPublicAreas } from '../../src/infrastructure/district/geographic-map.ts';
import { buildGeographicContext } from '../../src/presentation/models/public-areas/geographic-context.ts';
test(
    'JR-facing Grand Front plaza banks retain sourced 1F–B1 relationships and supported public landings',
    () => {
        const equipment = grandFrontPlazaAccess.connections;
        assert.equal(equipment.filter(c => c.kind === 'escalator').length, 2);
        const stair = equipment.find(c => c.kind === 'stairs')!;
        assert.equal(stair.width, 6);
        for (const c of equipment) {
            assert.equal(c.blockId, 'north-atrium-b1');
            assert.equal(c.from.level, 'district-underground');
            assert.equal(c.to.level, 'district-ground');
            assert.ok(c.evidence.urls?.some(url => url.includes('/floor/umekita/b1f')));
            const run = Math.hypot(c.from.x - c.to.x, c.from.z - c.to.z);
            const slope = Math.atan2(8, run) * 180 / Math.PI;
            assert.ok(slope > 18 && slope < 31, 'do not stretch a shallow flight across the plaza');
            assert.ok(undergroundPublicAreas.some(a => pointInPolygon(c.from, a.outline) &&
                !a.holes?.some(h => pointInPolygon(c.from, h))));
            assert.ok(!layout.areas.some(a => a.kind === 'paid' && levels.find(l => l.id === a.level)!.y === -8 &&
                pointInPolygon(c.from, a.outline)));
        }
    }
);
test(
    'sunken plaza stairs and escalators open the opaque ground skin and surface paving',
    () => {
        const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
        const context = buildGeographicContext(openings.filter(o => levels.find(l => l.id === o.level)!.y === 0).map(o => o.outline));
        context.roads.updateMatrixWorld(true);
        for (const c of grandFrontPlazaAccess.connections) {
            const opening = openings.find(o => o.connectionId === c.id && o.level === 'district-ground')!;
            assert.ok(opening);
            const p = opening.outline.reduce(
                (p, q) => ({ x: p.x + q.x / opening.outline.length, z: p.z + q.z / opening.outline.length }),
                { x: 0, z: 0 }
            );
            const ray = new T.Raycaster(new T.Vector3(p.x, 3, p.z), new T.Vector3(0, -1, 0), 0, 8);
            assert.equal(ray.intersectObject(context.roads, true).length, 0, c.id + ' ground reseals the opening');
        }
        for (const group of Object.values(context)) {
            group.traverse(o => {
                if (o instanceof T.Mesh) {
                    o.geometry.dispose();
                }
            });
        }
    }
);
