import { test } from 'node:test';
import assert from 'node:assert/strict';
import clipping from 'polygon-clipping';
import * as T from 'three';
import { building as hanshin } from '../../src/infrastructure/buildings/hanshin-dept/index.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { layout, deckBuildingAreas, exteriorOpenings } from '../../src/infrastructure/district/geographic-map.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import { buildGeographicBuilding } from '../../src/presentation/models/buildings/geographic-building-model.ts';
import { buildCommercialConcourse } from '../../src/presentation/models/buildings/commercial-concourse-model.ts';
import { buildingPalette } from '../../src/presentation/appearance/building-palette.ts';
import { jrAxisPoint } from '../../src/infrastructure/stations/jr-osaka/ground-frame.ts';

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
    'Hankyu tall hall cuts 2F context occupancy while the east–west upper floor remains',
    () => {
        const [ns, ew] = layout.concourses;
        assert(ns && ew);
        const nsRing: clipping.Polygon = [ns.outline.map(p => [p.x, p.z])];
        const occupancies = deckBuildingAreas.filter(a => ['building:hankyu-dept', 'building:hankyu-grand'].includes(a.blockId!));
        for (const floor of occupancies) {
            const geometry: clipping.Polygon = [floor.outline, ...floor.holes ?? []].map(r => r.map(p => [p.x, p.z]));
            assert.equal(clipping.intersection(geometry, nsRing).length, 0, '2F fill sealed the tall hall');
        }
        const west = { x: ew.axis[0].x + 30, z: ew.axis[0].z - 1 };
        assert(
            occupancies.some(a => pointInPolygon(west, a.outline) && !a.holes?.some(h => pointInPolygon(west, h))),
            'east–west concourse should keep its upper floor'
        );
    }
);
