import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import type { PlanRegion, Point2 } from '../../src/domain/map/model.ts';
import { elevated, elevatedAreas, layout, levels, publicInterfaces, undergroundPublicAreas } from '../../src/infrastructure/district/geographic-map.ts';
import { buildFloorGeometry } from '../../src/presentation/models/floor-geometry.ts';
import { buildGeographicContext } from '../../src/presentation/models/public-areas/geographic-context.ts';
import { SpiralStairModel } from '../../src/presentation/models/public-areas/spiral-stair-model.ts';

/** Check the walkable part of a slab, excluding any holes. */
function contains(area: PlanRegion, point: Point2): boolean {
    return pointInPolygon(point, area.outline) && !area.holes?.some(hole => pointInPolygon(point, hole));
}

test('Gate Lantern joins the B1 gate exterior and the existing park deck around a real ground opening', () => {
    const gate = publicInterfaces.find(item => item.gateId === 'umekita-gate')!;
    const spiral = layout.connections.find(item => item.id === 'gate-lantern-spiral')!;
    const escalator = layout.connections.find(item => item.id === 'gate-lantern-escalator')!;
    const underground = undergroundPublicAreas.find(area => contains(area, gate.outside))!;
    assert.ok(contains(underground, escalator.from));
    assert.ok(contains(underground, { x: 148, z: 603 }));
    const path = elevated.blocks.flatMap(block => block.paths).find(item => item.id === 'gate-lantern-upper-landing')!;
    assert.ok(elevatedAreas.some(area => [path.points[0]!, spiral.to].every(point => contains(area, point))));

    const opening = layout.atria!.find(item => item.id === 'gate-lantern-court')!.openings[0]!;
    const ground = layout.areas.find(item => item.id === 'gate-lantern-ground-court')!;
    const floor = new T.Mesh(buildFloorGeometry(ground.outline, [opening.outline], .55), new T.MeshBasicMaterial({ side: T.DoubleSide }));
    const { center } = spiral.spiral!;
    const down = new T.Vector3(0, -1, 0);
    assert.equal(new T.Raycaster(new T.Vector3(center.x, 3, center.z), down).intersectObject(floor).length, 0);
    assert.ok(new T.Raycaster(new T.Vector3(spiral.from.x, 3, spiral.from.z), down).intersectObject(floor).length);
});

test('the South Building garden opens to the sky and its stairs meet the same B1 public floor as Gate Lantern', () => {
    const garden = layout.atria!.find(item => item.id === 'umekita-sunken-garden')!;
    const hole = garden.openings[0]!.outline;
    const rim = layout.areas.find(item => item.id === 'umekita-sunken-garden-ground-rim')!;
    const court = undergroundPublicAreas.find(area => contains(area, { x: 148, z: 603 }))!;
    const stairs = layout.connections.filter(item => item.id.startsWith('umekita-sunken-garden-'));
    assert.equal(stairs.length, 2);
    assert.ok(stairs.every(stair => stair.from.level === 'district-underground' &&
        contains(court, stair.from) && pointInPolygon(stair.from, hole) &&
        stair.to.level === 'district-ground' && contains(rim, stair.to)));
    const context = buildGeographicContext([hole]);
    const ray = new T.Raycaster(new T.Vector3(140, 3, 585), new T.Vector3(0, -1, 0));
    assert.equal(ray.intersectObject(context.roads).length, 0);
    const slab = new T.Mesh(buildFloorGeometry(rim.outline, rim.holes!, .55));
    assert.equal(ray.intersectObject(slab).length, 0);
});

test('Gate Lantern spiral keeps the upper treads attached when the floors are expanded', () => {
    const spiral = layout.connections.find(item => item.id === 'gate-lantern-spiral')!;
    const model = new SpiralStairModel(spiral, levels);
    const treads = model.group.getObjectByName('spiral-treads') as T.InstancedMesh;
    const matrix = new T.Matrix4();
    model.update(id => id === spiral.to.level ? 8 : 0, 'all');
    treads.getMatrixAt(treads.count - 1, matrix);
    const original = new T.Vector3().setFromMatrixPosition(matrix);
    model.update(id => id === spiral.to.level ? 20 : 0, spiral.from.level);
    assert.ok(model.group.visible);
    treads.getMatrixAt(treads.count - 1, matrix);
    const expanded = new T.Vector3().setFromMatrixPosition(matrix);
    assert.ok(expanded.y - original.y > 11.8);
    assert.equal(expanded.x, original.x);
    assert.equal(expanded.z, original.z);
    model.update(() => 0, 'district-underground');
    assert.equal(model.group.visible, false);
});
