import { test } from 'node:test';
import assert from 'node:assert/strict';
import clipping from 'polygon-clipping';
import * as T from 'three';
import { building as hanshin } from '../../src/infrastructure/buildings/hanshin-dept/index.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { elevated, facilities, layout, levels, exteriorOpenings } from '../../src/infrastructure/district/geographic-map.ts';
import { passageOutline, pointInPolygon } from '../../src/domain/map/geometry.ts';
import { buildGeographicBuilding } from '../../src/presentation/models/buildings/geographic-building-model.ts';
import { buildCommercialConcourse } from '../../src/presentation/models/buildings/commercial-concourse-model.ts';
import { buildingPalette } from '../../src/presentation/appearance/building-palette.ts';
import { jrAxisPoint } from '../../src/infrastructure/stations/jr-osaka/ground-frame.ts';
import { sourceDeckPaths } from '../../src/infrastructure/public-areas/elevated-source.ts';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { VerticalConnectionModel } from '../../src/presentation/models/stations/vertical-connection-model.ts';
import { buildFloorGeometry } from '../../src/presentation/models/floor-geometry.ts';

test('North Gate atrium is open toward the tracks below the upper span', () => {
    const wings = new T.Group();
    for (const id of ['lucua', 'lucua-1100']) {
        wings.add(buildGeographicBuilding(geographicBuildings.find(building => building.id === id)!, exteriorOpenings));
    }
    wings.updateMatrixWorld(true);
    for (const along of [-15, 0, 9]) {
        const south = jrAxisPoint(along, -34);
        const north = jrAxisPoint(along, -56);
        const direction = new T.Vector3(north.x - south.x, 0, north.z - south.z).normalize();
        for (const y of [2, 10, 18, 26]) {
            const ray = new T.Raycaster(new T.Vector3(south.x, y, south.z), direction, 0, 22);
            assert.equal(ray.intersectObject(wings, true).length, 0, `South opening obstructed at y=${y}`);
        }
        const ray = new T.Raycaster(new T.Vector3(south.x, 48, south.z), direction, 0, 22);
        assert(ray.intersectObject(wings, true).length, 'Upper span should still cross the atrium');
    }
});

test(
    'Hanshin has a continuous retail podium and an inset office, without overlapping transfer shafts',
    () => {
        const [ground, upper, office] = hanshin.volumes;
        assert(ground && upper && office);
        assert.equal(ground.top, upper.base);
        assert.equal(upper.top, office.base);
        assert.equal(ground.surface, 'podium');
        assert.equal(upper.surface, 'podium');
        assert.equal(office.surface, 'tower');
        const ring = (p: typeof ground.outline): clipping.Ring => p.map(p => [p.x, p.z]);
        assert.equal(clipping.difference([ring(office.outline)], [ring(upper.outline)]).length, 0);
        assert(office.outline.every(p => pointInPolygon(p, upper.outline)));
        const overRoad = upper.outline.find(p => !pointInPolygon(p, ground.outline));
        assert(overRoad, 'the street-level retreat must remain open');
        const model = buildGeographicBuilding(hanshin, exteriorOpenings);
        model.updateMatrixWorld(true);
        const ray = new T.Raycaster(new T.Vector3(overRoad.x, 1, overRoad.z), new T.Vector3(0, 1, 0), 0, 12);
        assert.equal(ray.intersectObject(model, true).length, 0, 'ground clearance was sealed');
        const color = buildingPalette(hanshin.id, upper.name).wall;
        const section = model.getObjectByName(upper.name)!;
        const body = section.children.find(o => o instanceof T.Mesh) as T.Mesh;
        assert.equal(
            (body.material as T.MeshStandardMaterial).color.getHex(),
            color,
            'elevated retail floors must not inherit tower material'
        );
    }
);
test('Hanshin lower podium clears the full width of the 2F bridge while keeping its upper cover', () => {
    const ring = (points: typeof hanshin.volumes[0]['outline']): clipping.Ring => points.map(p => [p.x, p.z]);
    const podium = [ring(hanshin.volumes[0]!.outline)];
    const slots = exteriorOpenings.filter(o => o.buildingId === hanshin.id && o.suppressRailings === false);
    assert(slots.length);
    for (const path of sourceDeckPaths(['hanshin-approach', 'southeast-extension'])) {
        for (const [i, start] of path.points.slice(0, -1).entries()) {
            const inside = clipping.intersection(podium, [ring(passageOutline(start, path.points[i + 1]!, path.width))]);
            assert.equal(clipping.difference(inside, ...slots.map(slot => [ring(slot.outline)])).length, 0, path.id);
        }
    }
    const model = buildGeographicBuilding(hanshin, exteriorOpenings);
    model.updateMatrixWorld(true);
    for (const { x, z } of [{ x: 683.8, z: 736 }, { x: 719.9, z: 765.1 }, { x: 752.4, z: 795.1 }]) {
        const corridor = new T.Raycaster(new T.Vector3(x, 8, z), new T.Vector3(0, -1, 0), 0, 4);
        const cover = new T.Raycaster(new T.Vector3(x, 8, z), new T.Vector3(0, 1, 0), 0, 3);
        assert.equal(corridor.intersectObject(model, true).length, 0);
        assert(cover.intersectObject(model, true).length > 0);
    }
});

test(
    'current geographic Hankyu halls retain arches and leave both walking axes open through the shells',
    () => {
        const halls = layout.concourses;
        assert.equal(halls.length, 2);
        assert(halls.every(h => h.level === 'district-ground'));
        const group = new T.Group();
        for (const id of ['hankyu-dept', 'hankyu-grand']) {
            group.add(buildGeographicBuilding(geographicBuildings.find(b => b.id === id)!, exteriorOpenings));
        }
        for (const hall of halls) {
            const model = buildCommercialConcourse(hall, halls);
            group.add(model);
            assert(model.getObjectByName('floor-grid'));
            if (hall.height > 4) {
                assert(model.getObjectByName('arched-facade'));
                assert(model.getObjectByName('warm-display-window'));
                assert(model.getObjectByName('warm-cornice'));
            }
        }
        group.updateMatrixWorld(true);
        for (const hall of halls) {
            const [a, b] = hall.axis;
            const length = Math.hypot(b.x - a.x, b.z - a.z);
            const direction = new T.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
            const start = new T.Vector3(a.x, 1.8, a.z).addScaledVector(direction, .5);
            const ray = new T.Raycaster(start, direction, 0, length - 1);
            assert.equal(
                ray.intersectObject(group, true).length,
                0,
                hall.id + ' blocked by shell, facade bands or the crossing hall'
            );
        }
    }
);
test(
    'Hankyu tall hall retains a void at both deck heights while the east–west passage stays low',
    () => {
        const [ns, ew] = layout.concourses;
        assert(ns && ew);
        const nsRing: clipping.Polygon = [ns.outline.map(p => [p.x, p.z])];
        const atrium = layout.atria!.find(a => a.id === 'hankyu-concourse-void')!;
        assert.deepEqual(atrium.openings.map(o => o.level), ['district-south-deck', 'district-north-deck']);
        const west = { x: ew.axis[0].x + 30, z: ew.axis[0].z - 1 };
        for (const o of atrium.openings) {
            const opening: clipping.Polygon = [o.outline.map(p => [p.x, p.z])];
            assert.equal(clipping.difference(nsRing, opening).length, 0);
            assert(!pointInPolygon(west, o.outline));
        }
    }
);

test('Hankyu south concourse exposes the stairs and all six escalator lanes through the ground paving', () => {
    const hall = layout.concourses.find(h => h.id === 'hankyu-north-south-concourse')!;
    const bank = layout.connections.find(c => c.id === 'hankyu-concourse-south-escalators')!;
    const openings = planFloorOpenings(layout.connections, levels, layout.platforms).filter(o => o.level === hall.level);
    assert.equal(openings.filter(o => o.connectionId === bank.id).length, 6);
    assert.equal(new VerticalConnectionModel(bank, levels, layout.platforms).group.children.length, 6);
    assert(facilities.some(f => f.connectionId === bank.id && f.level === hall.level));
    const apron = layout.areas.find(a => a.id === 'hankyu-concourse-south-ground')!;
    const cuts = openings.map(o => o.outline);
    const model = new T.Group();
    model.add(buildCommercialConcourse(hall, layout.concourses, cuts), new T.Mesh(buildFloorGeometry(apron.outline, cuts, .55)));
    model.updateMatrixWorld(true);
    for (const [z, blocked] of [[613, false], [610, true], [600, true]] as const) {
        const ray = new T.Raycaster(new T.Vector3(723.2, 1.2, z), new T.Vector3(0, -1, 0), 0, 1);
        assert.equal(ray.intersectObject(model, true).length > 0, blocked);
    }
});

test('Hankyu north bridge continues indoors before the stairs and escalator descend to Sun Plaza', () => {
    const south = elevated.blocks.find(b => b.id === 'south-decks')!;
    const upper = south.paths.filter(p => p.id.startsWith('hankyu-dept-upper-concourse-'));
    const bridge = south.paths.find(p => p.id === 'bridge-north:336421843')!;
    assert.equal(upper.length, 3);
    assert.deepEqual(upper[0]!.points[0], bridge.points.at(-1));
    const connections = layout.connections.filter(c => c.id.startsWith('hankyu-concourse-sun-'));
    assert.deepEqual(connections.map(c => c.kind), ['stairs', 'escalator']);
    const ground = layout.areas.filter(a => a.id.startsWith('hankyu-concourse-sun-ground-'));
    const approaches = layout.areas.filter(a => a.id.startsWith('hankyu-concourse-north-ground-'));
    const deck = layout.areas.filter(a => a.level === 'district-south-deck' && a.blockId === south.id);
    const endpoints = [bridge.points[0]!, ...connections.map(connection => connection.to)];
    assert(deck.some(a => endpoints.every(p => pointInPolygon(p, a.outline) && !a.holes?.some(h => pointInPolygon(p, h)))));
    const cuts = planFloorOpenings(connections, levels, []);
    for (const connection of connections) {
        assert(ground.some(a => pointInPolygon(connection.from, a.outline)));
        assert(cuts.some(c => c.connectionId === connection.id && c.level === connection.to.level));
        assert(facilities.some(f => f.connectionId === connection.id && f.level === connection.from.level));
    }
    assert(ground.some(a => approaches.some(b => clipping.intersection(
        [a.outline.map((p): clipping.Pair => [p.x, p.z])], [b.outline.map((p): clipping.Pair => [p.x, p.z])]
    ).length)));

    const shells = geographicBuildings.filter(b => b.id === 'hankyu-dept' || b.id === 'hankyu-grand')
        .map(b => buildGeographicBuilding(b, exteriorOpenings));
    shells.forEach(model => model.updateMatrixWorld(true));
    for (const path of upper) {
        for (const [i, to] of path.points.slice(1).entries()) {
            const from = path.points[i]!;
            const direction = new T.Vector3(to.x - from.x, 0, to.z - from.z);
            const ray = new T.Raycaster(new T.Vector3(from.x, 5.8, from.z), direction.clone().normalize(), 0, direction.length());
            assert.equal(ray.intersectObjects(shells, true).length, 0, path.id + ' crosses a solid facade');
        }
    }
});
