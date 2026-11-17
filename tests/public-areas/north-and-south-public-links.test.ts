import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { connectionLanes } from '../../src/application/connection-lanes.ts';
import { planFloorOpenings } from '../../src/application/connection-openings.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import { layout, levels } from '../../src/infrastructure/district/geographic-map.ts';
import { buildFloorGeometry } from '../../src/presentation/floor-geometry.ts';
test(
    'both geographic South Gate escalator banks retain paired lanes and cut every overlapping 2F floor',
    () => {
        const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
        for (const id of ['south-building-61', 'south-entrance-east-escalators']) {
            const bank = layout.connections.find(c => c.id === id)!;
            assert.equal(bank.lanes, 2);
            assert.equal(bank.from.level, 'concourse');
            assert.equal(bank.to.level, 'south-deck');
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
