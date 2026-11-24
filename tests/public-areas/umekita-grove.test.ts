import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import { parkTerrainElevation } from '../../src/domain/map/park-terrain.ts';
import { elevated, elevatedAreas, layout } from '../../src/infrastructure/district/geographic-map.ts';
import { buildGeographicContext } from '../../src/presentation/models/public-areas/geographic-context.ts';
import { buildParkLandscape } from '../../src/presentation/models/public-areas/park-landscape-model.ts';

test('Inspiration Path is continuous from Gate Lantern to the north end of Umekita Grove', () => {
    const west = elevated.blocks.find(block => block.id === 'west-decks')!;
    const ids = ['gate-lantern-upper-landing', 'umekita-public:1313936486', 'umekita-grove-deck:1313936489', 'umekita-grove-deck:1313936490'];
    const paths = ids.map(id => west.paths.find(path => path.id === id)!);
    assert.deepEqual(paths[0]!.points[0], paths[1]!.points[0]);
    for (let index = 2; index < paths.length; index++) {
        assert.deepEqual(paths[index - 1]!.points.at(-1), paths[index]!.points[0]);
        assert.equal(paths[index]!.width, 4);
    }
    const end = paths.at(-1)!.points.at(-1)!;
    assert.ok(end.z < 250);
    const spiral = layout.connections.find(connection => connection.id === 'gate-lantern-spiral')!;
    const stairs = layout.connections.find(connection => connection.id === 'umekita-grove-north-stairs')!;
    const landing = west.paths.find(path => path.id === 'umekita-grove-north-landing')!;
    assert.deepEqual(landing.points[0], end);
    assert.equal(stairs.from.level, 'district-ground');
    assert.equal(stairs.to.level, 'district-north-deck');
    const points = [spiral.to, ...paths.flatMap(path => path.points), ...landing.points, stairs.to];
    assert.ok(elevatedAreas.some(area => area.blockId === 'west-decks' &&
        points.every(point => pointInPolygon(point, area.outline) &&
            !area.holes?.some(hole => pointInPolygon(point, hole)))));
});

test('the south side of the road span has a separate stair to the South Park footpath', () => {
    const west = elevated.blocks.find(block => block.id === 'west-decks')!;
    const path = west.paths.find(item => item.id === 'umekita-public:1313936486')!;
    const branch = west.paths.find(item => item.id === 'umekita-south-park-deck-landing')!;
    const lower = layout.connections.find(item => item.id === 'umekita-south-park-stairs-lower')!;
    const upper = layout.connections.find(item => item.id === 'umekita-south-park-stairs-upper')!;
    assert.deepEqual(branch.points[0], path.points.at(-1));
    assert.deepEqual(lower.to, upper.from);
    assert.equal(upper.to.level, 'district-north-deck');
    assert.ok(elevatedAreas.some(area => area.blockId === west.id &&
        [branch.points[0]!, upper.to].every(point => pointInPolygon(point, area.outline))));
    assert.ok(lower.from.z > upper.to.z);
    for (const side of ['north', 'south']) {
        const entrance = layout.connections.find(item => item.id === 'umekita-step-plaza-' + side)!;
        assert.equal(entrance.from.level, 'district-ground');
        assert.equal(entrance.to.level, entrance.from.level);
        assert.ok(entrance.from.elevationOffset! < entrance.to.elevationOffset!);
    }
});

test('Umekita Grove has a visible pond opening and retains the waterfall and park labels', () => {
    const park = layout.parks.find(item => item.id === 'umekita-grove')!;
    assert.equal(park.level, 'district-ground');
    assert.ok(pointInPolygon(park.labelPoint, park.outline));
    const model = buildParkLandscape(park);
    const ground = model.getObjectByName('park-ground')!;
    const pond = model.getObjectByName('pond')!;
    const ray = new T.Raycaster(new T.Vector3(134, 5, 334), new T.Vector3(0, -1, 0));
    assert.equal(ray.intersectObject(ground).length, 0);
    assert.ok(Math.abs(ray.intersectObject(pond)[0]!.point.y - park.landform.pondY) < .01);
    const vergeRay = new T.Raycaster(new T.Vector3(146, 5, 369), new T.Vector3(0, -1, 0));
    assert.ok(vergeRay.intersectObject(ground)[0]!.point.y - park.landform.pondY > 3);
    const context = buildGeographicContext([park.outline]);
    assert.equal(ray.intersectObject(context.roads).length, 0, 'flat context must not cover the low pond');
    const stairs = layout.connections.find(connection => connection.id === 'umekita-grove-north-stairs')!;
    const landingY = parkTerrainElevation(park, stairs.from);
    const landingRay = new T.Raycaster(new T.Vector3(stairs.from.x, 5, stairs.from.z), new T.Vector3(0, -1, 0));
    const paths = model.children.filter(mesh => mesh.name === 'park-path');
    assert.ok(Math.abs(landingRay.intersectObjects(paths)[0]!.point.y - landingY) < .2);
    assert.ok(Math.abs(stairs.from.elevationOffset! + .65 - landingY - .1) < .01);
    assert.ok(model.getObjectByName('waterfall')!.children.length);
    assert.ok((model.getObjectByName('tree-crowns') as T.InstancedMesh).count >= 15);
});
