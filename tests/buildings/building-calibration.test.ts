import { test } from 'node:test';
import assert from 'node:assert/strict';
import clipping from 'polygon-clipping';
import * as T from 'three';
import profiles from '../../data/geography/buildings/plateau-profiles.json' with { type: 'json' };
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import type { BuildingVolume } from '../../src/infrastructure/buildings/building-data.ts';
import { buildGeographicBuilding } from '../../src/presentation/models/buildings/geographic-building-model.ts';
import { buildingPalette } from '../../src/presentation/appearance/building-palette.ts';
import { LayerAppearance } from '../../src/presentation/appearance/layer-appearance.ts';
import { geographicRoofPlan, geographicRoofPoint, geographicRoofHeightAt } from '../../src/presentation/models/stations/roof-profile.ts';
import { elevatedAreas, exteriorOpenings, publicAccess } from '../../src/infrastructure/district/geographic-map.ts';
import { umedaSkyBuilding } from '../../src/infrastructure/buildings/umeda-sky-building.ts';
import { skyBuildingEntrance, skyBuildingPlaza } from '../../src/infrastructure/public-areas/west-decks/sky-building-plaza.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';

const polygon = (v: Pick<BuildingVolume, 'outline' | 'holes'>): clipping.Polygon => [v.outline, ...v.holes].map(r => r.map(p => [p.x, p.z]));
const area = (geometry: clipping.MultiPolygon) => geometry.reduce(
    (sum, p) => sum + p.reduce(
        (sum, r, i) => sum + (i ? -1 : 1) * Math.abs(r.reduce(
            (sum, a, j) => {
                const b = r[(j + 1) % r.length]!;
                return sum + a[0] * b[1] - a[1] * b[0];
            },
            0
        )) / 2,
        0
    ),
    0
);

test('the Sky Building shell preserves the roof opening, the suspended bridge and the public court', () => {
    const model = buildGeographicBuilding(umedaSkyBuilding);
    const down = new T.Vector3(0, -1, 0);
    const roof = model.getObjectByName('lod2-roof')!;
    const glass = model.getObjectByName('lod2-glazing') as T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>;
    const center = new T.Raycaster(new T.Vector3(-79, 180, 301), down);
    const ring = new T.Raycaster(new T.Vector3(-97, 180, 301), down, 0, 15);
    assert.equal(center.intersectObject(roof).length, 0);
    assert.ok(ring.intersectObject(roof).length, 'the ring must surround the open shaft');
    const centralHits = center.intersectObject(model);
    assert.ok(centralHits.some(hit => Math.abs(hit.point.y - 87.1) < .2));
    assert.ok(centralHits.every(hit => hit.point.y > 75), 'the 1F courtyard stays open beneath the bridges');
    assert.ok(glass.material.transparent);
    const tube = new T.Raycaster(new T.Vector3(-86, 170, 302), down, 0, 35);
    assert.ok(tube.intersectObject(glass).length);
    assert.ok(pointInPolygon(skyBuildingEntrance, skyBuildingPlaza.outline));
});
test(
    'audited open-model profiles use LOD2 roof geometry and retain survey provenance',
    () => {
        assert(profiles.sourceBuildings.every(b => b.surveyYear === '2017'));
        assert(profiles.sourceBuildings.every(b => !b.id.includes('hanshin') && !b.id.includes('jp')));
        const hankyu = geographicBuildings.find(b => b.id === 'hankyu-dept')!;
        assert.equal(Math.max(...hankyu.volumes.map(v => v.top)), 186.95);
        const upper = hankyu.volumes.filter(v => v.top > 100);
        assert(upper.length > 0 && upper.every(v => v.certainty === 'plateau-lod2'));
        assert(
            upper.some(v => v.outline.length > 5),
            'the tower must retain source chamfers rather than a rectangular crop'
        );
    }
);
test(
    'upper building assemblies stay attached and JP has a continuous core',
    () => {
        for (const building of geographicBuildings) {
            for (const v of building.volumes.filter(v => v.base > 0)) {
                if (v.support === 'over-atrium') {
                    // The North Gate wings are separate hosts. The raised Green Place section abuts its own wing.
                    const wings = building.id.startsWith('lucua')
                        ? geographicBuildings.filter(b => b.id.startsWith('lucua'))
                        : [building];
                    for (const wing of wings) {
                        const neighbors = wing.volumes.filter(w => w !== v && w.base <= v.base && w.top >= v.base - .01);
                        const host = clipping.union(polygon(neighbors[0]!), ...neighbors.slice(1).map(polygon));
                        assert(clipping.intersection(polygon(v), host).length || wing.volumes.some(w =>
                            w.base <= v.top && w.top >= v.base && w.outline.some(point => v.outline.some(p =>
                                Math.hypot(p.x - point.x, p.z - point.z) < .01))));
                    }
                    continue;
                }
                const lower = building.volumes.filter(w => w !== v && w.base < v.base && w.top >= v.base - .01);
                assert(lower.length, building.id + '/' + v.name + ' has no lower mass');
                const support = clipping.union(polygon(lower[0]!), ...lower.slice(1).map(polygon));
                const ratio = area(clipping.intersection(polygon(v), support)) / area([polygon(v)]);
                const revised = ['jp-tower', 'hankyu-dept', 'hanshin-dept', 'hankyu-sanbangai'].includes(building.id);
                assert(
                    ratio > (v.support === 'over-road' ? .5 : revised ? .95 : .7),
                    building.id + '/' + v.name + ' has insufficient overlap'
                );
            }
        }
        const jp = geographicBuildings.find(b => b.id === 'jp-tower')!;
        assert(
            jp.volumes.some(v => v.base === 32 && v.top === 188),
            'a continuous core must support the stepped parts'
        );
        const hanshin = geographicBuildings.find(b => b.id === 'hanshin-dept')!;
        const tower = hanshin.volumes.find(v => v.top > 100)!;
        assert(
            area([polygon(tower)]) > 4000,
            'forcing the tower into the ground L must not shrink it into a thin slab'
        );
        assert.equal(hanshin.volumes.filter(v => v.top > 100).length, 1, 'North is the separate Hankyu complex');
    }
);
test(
    'Sanbangai shell keeps public hall mouths open',
    () => {
        const building = geographicBuildings.find(b => b.id === 'hankyu-sanbangai')!;
        const model = buildGeographicBuilding(building, exteriorOpenings);
        model.updateMatrixWorld(true);
        let checked = 0;
        for (const door of exteriorOpenings.filter(d => d.buildingId === building.id)) {
            const intersection = clipping.intersection(
                [door.outline.map(p => [p.x, p.z] as [
                    number,
                    number
                ])],
                polygon(building.volumes[0]!)
            );
            if (!intersection.length) {
                continue;
            }
            const r = intersection[0]![0]!;
            const x = r.reduce((sum, p) => sum + p[0] / r.length, 0);
            const z = r.reduce((sum, p) => sum + p[1] / r.length, 0);
            const ray = new T.Raycaster(new T.Vector3(x, door.base + .5, z), new T.Vector3(0, 1, 0), 0, door.top - door.base - 1);
            assert.equal(ray.intersectObject(model, true).length, 0, 'a roof band reseals a public hall opening');
            checked++;
        }
        assert(checked > 0);
    }
);
test('Green Place leaves the ground exit landings and west public deck clear', () => {
    const building = geographicBuildings.find(b => b.id === 'umekita-green-place')!;
    const model = buildGeographicBuilding(building, exteriorOpenings);
    model.updateMatrixWorld(true);
    const access = publicAccess.connections.filter(c => c.id.startsWith('public-umekita-ground-'));
    assert.equal(access.length, 3);
    for (const { id, to } of access) {
        const ray = new T.Raycaster(new T.Vector3(to.x + 20, 1.2, to.z), new T.Vector3(-1, 0, 0), 0, 20);
        assert.equal(ray.intersectObject(model, true).length, 0, `Green Place obstructs the approach to ${id}`);
    }
    const decks = elevatedAreas.filter(a => a.blockId === 'west-decks');
    assert.ok(decks.length);
    for (const deck of decks) {
        for (const wing of building.volumes.filter(v => v.base < 12.5 && v.top >= 8)) {
            assert.equal(clipping.intersection(polygon(wing), polygon({ ...deck, holes: deck.holes ?? [] })).length, 0);
        }
    }
    const wing = building.volumes[0]!;
    const solid = new T.Raycaster(new T.Vector3(224, 18, 510), new T.Vector3(0, -1, 0), 0, 6);
    assert(solid.intersectObject(model, true).some(hit => hit.object.parent?.name === wing.name));
});
test(
    'geographic roof uses the calibrated plan size, centre and north-high profile',
    () => {
        assert.equal(geographicRoofPlan.lod, 1, 'do not claim a detailed LOD2 roof');
        const west = geographicRoofPoint(-63, 0);
        const east = geographicRoofPoint(63, 0);
        const north = geographicRoofPoint(0, -36);
        const south = geographicRoofPoint(0, 36);
        assert(Math.abs(Math.hypot(east.x - west.x, east.z - west.z) - 180) < 1e-8);
        assert(Math.abs(Math.hypot(south.x - north.x, south.z - north.z) - 100) < 1e-8);
        assert.deepEqual(geographicRoofPoint(0, 0), geographicRoofPlan.center);
        assert(north.z < south.z);
        for (let z = -36; z < 36; z++) {
            assert(geographicRoofHeightAt(z) > geographicRoofHeightAt(z + 1));
        }
    }
);
test(
    'Hankyu flavour stays pale and RESPIRE does not recolour the Yodobashi podium',
    () => {
        const theme = buildingPalette('hankyu-dept', '裙楼');
        assert.deepEqual(theme, buildingPalette('hankyu-sanbangai', '裙楼'));
        assert.deepEqual(theme, buildingPalette('hankyu-grand', '塔楼'));
        assert.deepEqual(theme, buildingPalette('yodobashi', 'Hotel Hankyu RESPIRE'));
        assert.notDeepEqual(theme, buildingPalette('yodobashi', 'Yodobashi 弧形裙楼'));
        for (const color of Object.values(theme)) {
            const channels = [color >> 16 & 255, color >> 8 & 255, color & 255];
            assert(Math.min(...channels) >= 200, 'white model accent became a dark facade');
        }
    }
);

test('night mode recolors podium, tower and facade trim without replacing geometry', () => {
    const building = geographicBuildings.find(b => b.id === 'hankyu-dept')!;
    const model = buildGeographicBuilding(building);
    const meshes: T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>[] = [];
    model.traverse(object => {
        if (object instanceof T.Mesh && object.material instanceof T.MeshStandardMaterial) {
            meshes.push(object);
        }
    });
    const originals = meshes.map(mesh => ({ geometry: mesh.geometry, material: mesh.material }));
    const palette = buildingPalette(building.id, building.name, true);
    const style = new LayerAppearance();
    style.setDarkTheme(true);
    style.apply(model, false);
    const colors = new Set(meshes.map(mesh => mesh.material.color.getHex()));
    for (const color of Object.values(palette)) {
        assert(colors.has(color));
    }
    assert.notDeepEqual(palette, buildingPalette('daimaru', '', true));
    style.setDarkTheme(false);
    style.apply(model, false);
    meshes.forEach((mesh, index) => {
        assert.equal(mesh.geometry, originals[index]!.geometry);
        assert.equal(mesh.material, originals[index]!.material);
    });
});
