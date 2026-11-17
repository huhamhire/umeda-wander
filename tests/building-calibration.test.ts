import {test} from 'node:test';
import assert from 'node:assert/strict';
import clipping from 'polygon-clipping';
import * as T from 'three';
import profiles from '../data/geography/buildings/plateau-profiles.json' with {type: 'json'};
import {geographicBuildings} from '../src/infrastructure/buildings/index.ts';
import type {BuildingVolume} from '../src/infrastructure/buildings/building-data.ts';
import {buildGeographicBuilding} from '../src/presentation/models/geographic-building-model.ts';
import {buildingPalette} from '../src/presentation/models/building-palette.ts';
import {geographicRoofPlan, geographicRoofPoint, geographicRoofHeightAt} from '../src/presentation/roof-profile.ts';
import {exteriorOpenings, deckBuildingAreas} from '../src/infrastructure/district/geographic-map.ts';

const polygon = (v: Pick<BuildingVolume, 'outline' | 'holes'>): clipping.Polygon =>
  [v.outline, ...v.holes].map(r => r.map(p => [p.x, p.z]));
const area = (geometry: clipping.MultiPolygon) => geometry.reduce((sum, p) => sum + p.reduce((sum, r, i) =>
  sum + (i ? -1 : 1) * Math.abs(r.reduce((sum, a, j) => {
    const b = r[(j + 1) % r.length]!;
    return sum + a[0] * b[1] - a[1] * b[0];
  }, 0)) / 2, 0), 0);

test('audited open-model profiles use LOD2 roof geometry and retain survey provenance', () => {
  assert(profiles.sourceBuildings.every(b => b.surveyYear === '2017'));
  assert(profiles.sourceBuildings.every(b => !b.id.includes('hanshin') && !b.id.includes('jp')));
  const hankyu = geographicBuildings.find(b => b.id === 'hankyu-dept')!;
  assert.equal(Math.max(...hankyu.volumes.map(v => v.top)), 186.95);
  const upper = hankyu.volumes.filter(v => v.top > 100);
  assert(upper.length > 0 && upper.every(v => v.certainty === 'plateau-lod2'));
  assert(upper.some(v => v.outline.length > 5), 'the tower must retain source chamfers rather than a rectangular crop');
});

test('upper building assemblies stay attached and JP has a continuous core', () => {
  for (const building of geographicBuildings) {
    for (const v of building.volumes.filter(v => v.base > 0)) {
      const lower = building.volumes.filter(w => w !== v && w.base < v.base && w.top >= v.base - .01);
      assert(lower.length, building.id + '/' + v.name + ' has no lower mass');
      const support = clipping.union(polygon(lower[0]!), ...lower.slice(1).map(polygon));
      const ratio = area(clipping.intersection(polygon(v), support)) / area([polygon(v)]);
      const revised = ['jp-tower', 'hankyu-dept', 'hanshin-dept', 'hankyu-sanbangai'].includes(building.id);
      assert(ratio > (v.support === 'over-road' ? .5 : revised ? .95 : .7), building.id + '/' + v.name + ' has insufficient overlap');
    }
  }
  const jp = geographicBuildings.find(b => b.id === 'jp-tower')!;
  assert(jp.volumes.some(v => v.base === 32 && v.top === 188), 'a continuous core must support the stepped parts');
  const hanshin = geographicBuildings.find(b => b.id === 'hanshin-dept')!;
  const tower = hanshin.volumes.find(v => v.top > 100)!;
  assert(area([polygon(tower)]) > 4000, 'forcing the tower into the ground L must not shrink it into a thin slab');
  assert.equal(hanshin.volumes.filter(v => v.top > 100).length, 1, 'North is the separate Hankyu complex');
});

test('Sanbangai shell keeps public hall mouths open and adds no duplicate deck occupancy', () => {
  const building = geographicBuildings.find(b => b.id === 'hankyu-sanbangai')!;
  assert(!deckBuildingAreas.some(a => a.id.includes('hankyu-sanbangai')));
  const model = buildGeographicBuilding(building, exteriorOpenings);
  model.updateMatrixWorld(true);
  let checked = 0;
  for (const door of exteriorOpenings.filter(d => d.buildingId === building.id)) {
    const intersection = clipping.intersection([door.outline.map(p => [p.x, p.z] as [number, number])], polygon(building.volumes[0]!));
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
});

test('geographic roof uses the calibrated plan size, centre and north-high profile', () => {
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
});

test('Hankyu flavour stays pale and RESPIRE does not recolour the Yodobashi podium', () => {
  const theme = buildingPalette('hankyu-dept', '裙楼');
  assert.deepEqual(theme, buildingPalette('hankyu-sanbangai', '裙楼'));
  assert.deepEqual(theme, buildingPalette('hankyu-grand', '塔楼'));
  assert.deepEqual(theme, buildingPalette('yodobashi', 'Hotel Hankyu RESPIRE'));
  assert.notDeepEqual(theme, buildingPalette('yodobashi', 'Yodobashi 弧形裙楼'));
  for (const color of Object.values(theme)) {
    const channels = [color >> 16 & 255, color >> 8 & 255, color & 255];
    assert(Math.min(...channels) >= 200, 'white model accent became a dark facade');
  }
});
