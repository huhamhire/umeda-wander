import assert from 'node:assert/strict';
import test from 'node:test';
import clipping from 'polygon-clipping';
import * as T from 'three';
import { passageOutline, pointInPolygon } from '../../src/domain/map/geometry.ts';
import type { PlanRegion, Point2 } from '../../src/domain/map/model.ts';
import { elevated, elevatedAreas, exteriorOpenings, layout, levels, publicInterfaces, undergroundPublicAreas } from '../../src/infrastructure/district/geographic-map.ts';
import { deckBoundarySegments } from '../../src/application/public-areas/deck-boundaries.ts';
import { grandGreenSouthBuildings } from '../../src/infrastructure/buildings/grand-green-south/index.ts';
import { buildGeographicBuilding } from '../../src/presentation/models/buildings/geographic-building-model.ts';
import { buildFloorGeometry } from '../../src/presentation/models/floor-geometry.ts';
import { buildGeographicContext } from '../../src/presentation/models/public-areas/geographic-context.ts';
import { SpiralStairModel } from '../../src/presentation/models/public-areas/spiral-stair-model.ts';
import { buildWalkwayCanopy } from '../../src/presentation/models/public-areas/walkway-canopy-model.ts';

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

test('Gate Lantern reaches the South Building 2F threshold through a clear opening with railings along the bridge', () => {
    const west = elevated.blocks.find(block => block.id === 'west-decks')!;
    const approach = west.paths.find(path => path.id === 'gate-lantern-south-building:1313936488')!;
    const spine = west.paths.find(path => path.id === 'umekita-public:1313936486')!;
    const door = elevated.portals.find(portal => portal.id === 'gate-lantern-south-building-2f')!;
    assert.deepEqual(approach.points.at(-1), spine.points[0]);
    const floor = elevatedAreas.find(area => area.blockId === west.id && approach.points.every(point => contains(area, point)))!;
    assert.ok(floor && contains(floor, door.point));
    const building = grandGreenSouthBuildings.find(item => item.id === door.target)!;
    const threshold = approach.points[0]!;
    assert.ok(contains(building.volumes[0]!, threshold));
    const shell = buildGeographicBuilding(building, exteriorOpenings);
    for (const point of [threshold, door.point, approach.points[1]!]) {
        const ray = new T.Raycaster(new T.Vector3(point.x, 8.65, point.z), new T.Vector3(0, 1, 0), 0, 3);
        assert.equal(ray.intersectObject(shell).length, 0);
    }
    const rails = deckBoundarySegments(floor, layout.areas, levels, exteriorOpenings, layout.connections);
    assert.ok(rails.some(({ from }) => from.x > 138 && from.x < 145 && from.z > 588 && from.z < 594));
    assert.ok(rails.some(({ from }) => from.x > 138 && from.x < 145 && from.z > 581 && from.z < 588));
});

test('the South Building garden opens to the sky and its stairs meet the same B1 public floor as Gate Lantern', () => {
    const garden = layout.atria!.find(item => item.id === 'umekita-sunken-garden')!;
    const hole = garden.openings[0]!.outline;
    const rim = layout.areas.find(item => item.id === 'umekita-sunken-garden-ground-rim')!;
    const court = undergroundPublicAreas.find(area => contains(area, { x: 148, z: 603 }))!;
    const stairs = layout.connections.filter(item => item.id.startsWith('umekita-sunken-garden-'));
    assert.equal(hole.length, 3);
    assert.ok(!exteriorOpenings.some(opening => opening.evidence === garden.evidence));
    assert.equal(stairs.length, 2);
    assert.ok(stairs.every(stair => stair.from.level === 'district-underground' &&
        contains(court, stair.from) && pointInPolygon(stair.from, hole) &&
        stair.to.level === 'district-ground' && contains(rim, stair.to)));
    const context = buildGeographicContext([hole]);
    const ray = new T.Raycaster(new T.Vector3(108, 3, 581), new T.Vector3(0, -1, 0));
    assert.equal(ray.intersectObject(context.roads).length, 0);
    const slab = new T.Mesh(buildFloorGeometry(rim.outline, rim.holes!, .55));
    assert.equal(ray.intersectObject(slab).length, 0);
    const branch = elevated.blocks.flatMap(block => block.paths).find(path => path.id === 'gate-lantern-south-building:1313936488')!;
    assert.ok(hole.every(point => point.x < branch.points[0]!.x));
    const sky = new T.Raycaster(new T.Vector3(108, 1, 581), new T.Vector3(0, 1, 0));
    assert.equal(sky.intersectObjects(grandGreenSouthBuildings.map(building => buildGeographicBuilding(building, exteriorOpenings))).length, 0);
    const ring = (points: Point2[]): clipping.Polygon => [points.map(({ x, z }) => [x, z])];
    for (const building of grandGreenSouthBuildings) {
        const footprint = ring(building.volumes[0]!.outline);
        assert.equal(clipping.intersection(footprint, ring(rim.outline)).length, 0);
        for (const stair of stairs) {
            const length = Math.hypot(stair.to.x - stair.from.x, stair.to.z - stair.from.z);
            const dx = (stair.to.x - stair.from.x) / length * 1.6;
            const dz = (stair.to.z - stair.from.z) / length * 1.6;
            const envelope = passageOutline(
                { x: stair.from.x - dx, z: stair.from.z - dz },
                { x: stair.to.x + dx, z: stair.to.z + dz },
                stair.width!
            );
            assert.equal(clipping.intersection(footprint, ring(envelope)).length, 0, stair.id + ' touches ' + building.id);
        }
    }
});

test('the two South Building Valley bridges sit on separate floors and reach both podium interiors', () => {
    for (const [floor, elevation] of [['2f', 8], ['3f', 14]] as const) {
        const id = 'grand-green-south-valley-' + floor;
        const block = elevated.blocks.find(item => item.paths.some(path => path.id === id))!;
        const path = block.paths.find(item => item.id === id)!;
        assert.equal(levels.find(level => level.id === block.level)!.y, elevation);
        const deck = elevatedAreas.find(area => area.blockId === block.id && path.points.every(point => contains(area, point)))!;
        assert.ok(deck);
        const canopy = layout.canopies!.find(item => item.id === id + '-roof')!;
        const enclosure = buildWalkwayCanopy(canopy);
        const glass = enclosure.getObjectByName('walkway-side-glazing') as T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>;
        assert.equal(glass.material.transparent, true);
        assert.equal(glass.material.depthWrite, false);
        const [a, b] = canopy.points;
        const along = new T.Vector3(b!.x - a!.x, 0, b!.z - a!.z).normalize();
        const across = new T.Vector3(-along.z, 0, along.x);
        const center = new T.Vector3().lerpVectors(
            new T.Vector3(a!.x, 1.8, a!.z),
            new T.Vector3(b!.x, 1.8, b!.z),
            .4
        );
        const crossRay = new T.Raycaster(center.addScaledVector(across, -canopy.width), across);
        assert.equal(crossRay.intersectObject(glass).length, 2);
        const passageRay = new T.Raycaster(new T.Vector3(path.points[0]!.x, 1.8, path.points[0]!.z), along);
        assert.equal(passageRay.intersectObject(enclosure).length, 0);
        const rails = deckBoundarySegments(deck, layout.areas, levels, exteriorOpenings, layout.connections, layout.canopies);
        const walls = passageOutline(a!, b!, canopy.width + .15);
        assert.ok(rails.every(({ from, to }) => !pointInPolygon({ x: (from.x + to.x) / 2, z: (from.z + to.z) / 2 }, walls)));
        for (const [suffix, threshold] of [['park', path.points[0]!], ['gate', path.points.at(-1)!]] as const) {
            const portal = elevated.portals.find(item => item.id === id + '-' + suffix)!;
            const building = grandGreenSouthBuildings.find(item => item.id === portal.target)!;
            assert.ok(contains(building.volumes[0]!, threshold));
            const ray = new T.Raycaster(new T.Vector3(threshold.x, elevation + .65, threshold.z), new T.Vector3(0, 1, 0), 0, 3);
            assert.equal(ray.intersectObject(buildGeographicBuilding(building, exteriorOpenings)).length, 0);
        }
    }
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
