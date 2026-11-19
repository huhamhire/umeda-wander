import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { connectionLanes } from '../../src/application/connections/connection-lanes.ts';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { buildGeographicBuilding } from '../../src/presentation/models/buildings/geographic-building-model.ts';
import { exteriorOpenings, layout, levels } from '../../src/infrastructure/district/geographic-map.ts';
import { buildFloorGeometry } from '../../src/presentation/models/floor-geometry.ts';

test('Daimaru 2F forecourt and 3F access corridor stay continuous through the building', () => {
    const building = geographicBuildings.find(b => b.id === 'daimaru')!;
    const e = building.entrance!;
    const c = Math.cos(e.angle);
    const s = Math.sin(e.angle);
    const point = (u: number, v: number) => ({ x: e.center.x + u * c - v * s, z: e.center.z + u * s + v * c });
    const cuts = planFloorOpenings(layout.connections, levels, layout.platforms);
    const model = buildGeographicBuilding(building, exteriorOpenings);
    model.updateMatrixWorld(true);
    for (const [level, height, along, across] of [
        ['south-deck', 4, [0, 0], [-33, -8]],
        ['south-deck', 4, [-23, 23], [-15, -15]],
        ['platform', 8, [0, 0], [-60, -22]]
    ] as const) {
        for (let i = 0; i <= 40; i++) {
            const t = i / 40;
            const p = point(along[0] + (along[1] - along[0]) * t, across[0] + (across[1] - across[0]) * t);
            assert(layout.areas.some(area => area.level === level && area.kind === 'public' && pointInPolygon(p, area.outline)));
            assert(!cuts.some(cut => cut.level === level && pointInPolygon(p, cut.outline)));
        }
        const from = point(along[0], across[0]);
        const to = point(along[1], across[1]);
        const delta = new T.Vector3(to.x - from.x, 0, to.z - from.z);
        const ray = new T.Raycaster(new T.Vector3(from.x, height + 1.5, from.z), delta.clone().normalize(), 0, delta.length());
        assert.equal(ray.intersectObject(model, true).length, 0, level + ' facade blocks the route');
    }
});

test(
    'both geographic South Gate escalator banks retain paired lanes and cut every overlapping 2F floor',
    () => {
        const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
        for (const id of ['south-building-61', 'south-entrance-east-escalators']) {
            const bank = layout.connections.find(c => c.id === id)!;
            assert.equal(bank.lanes, 2);
            assert.equal(bank.from.level, 'concourse');
            assert.equal(bank.to.level, 'south-deck');
            const deck = layout.areas.find(a => a.id === 'south-entrance-deck')!;
            assert.ok(pointInPolygon(bank.to, deck.outline), id + ' misses the upper deck');
            for (const lane of connectionLanes(bank)) {
                const p = { x: lane.to.x + (lane.from.x - lane.to.x) * .25, z: lane.to.z + (lane.from.z - lane.to.z) * .25 };
                const floors = layout.areas.filter(a => levels.find(l => l.id === a.level)!.y === 4 &&
                    pointInPolygon(p, a.outline) && !a.holes?.some(h => pointInPolygon(p, h)));
                assert.ok(floors.length, id + ' missing 2F landing surface');
                for (const area of floors) {
                    const cuts = openings.filter(o => o.level === area.level);
                    assert.ok(cuts.some(o => o.connectionId === id && pointInPolygon(p, o.outline)));
                    const geometry = buildFloorGeometry(area.outline, [...area.holes ?? [], ...cuts.map(o => o.outline)], .55);
                    const material = new T.MeshBasicMaterial({ side: T.DoubleSide });
                    const floor = new T.Mesh(geometry, material);
                    floor.updateMatrixWorld();
                    const ray = new T.Raycaster(new T.Vector3(p.x, 5, p.z), new T.Vector3(0, -1, 0));
                    assert.equal(ray.intersectObject(floor).length, 0, id + ' sealed by ' + area.id);
                    geometry.dispose();
                    material.dispose();
                }
            }
        }
    }
);

test(
    'South Gate portal remains open below its sign',
    () => {
        const b = geographicBuildings.find(b => b.id === 'daimaru')!;
        const e = b.entrance!;
        const c = Math.cos(e.angle);
        const s = Math.sin(e.angle);
        const model = buildGeographicBuilding(b);
        model.updateMatrixWorld(true);
        const start = new T.Vector3(e.center.x + c * 5 - s * 8, 8, e.center.z + s * 5 + c * 8);
        const ray = new T.Raycaster(start, new T.Vector3(s, 0, -c), 0, 18);
        assert.equal(ray.intersectObject(model, true).length, 0, 'solid facade closes the portal');
    }
);
