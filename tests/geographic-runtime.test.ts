import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import * as T from 'three';
import { planFloorOpenings } from '../src/application/connection-openings.ts';
import { planGateBoundaries } from '../src/application/gate-boundaries.ts';
import { pointInPolygon } from '../src/domain/map/geometry.ts';
import { geographicBuildings } from '../src/infrastructure/buildings/index.ts';
import { edges, facilities, geographicOsmData, layout, levels, nodes } from '../src/infrastructure/district/geographic-map.ts';
import { buildFloorGeometry } from '../src/presentation/floor-geometry.ts';
import { buildGeographicContext } from '../src/presentation/geographic-context.ts';
import { buildGeographicBuilding } from '../src/presentation/models/geographic-building-model.ts';
import { stationPalettes } from '../src/presentation/station-palette.ts';
import { VerticalConnectionModel } from '../src/presentation/vertical-connection-model.ts';
test('runtime geographic scene has finite ground, floors, openings and all cross-floor models', () => {
  assert.equal(layout.geographic, true);
  const context = buildGeographicContext();
  for (const group of Object.values(context)) {
    assert.ok(group.children.length);
    group.traverse(o => {
      const mesh = o as import('three').Mesh;
      if (mesh.geometry)
        for (const v of mesh.geometry.getAttribute('position').array)
          assert.ok(Number.isFinite(v));
    });
  }
  const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
  for (const area of layout.areas) {
    const g = buildFloorGeometry(area.outline, [...area.holes ?? [], ...openings.filter(o => o.level === area.level).map(o => o.outline)], .55);
    for (const v of g.getAttribute('position')?.array ?? [])
      assert.ok(Number.isFinite(v));
  }
  for (const c of layout.connections)
    assert.doesNotThrow(() => new VerticalConnectionModel(c, levels, layout.platforms), c.id);
  const ids = new Set(nodes.map(n => n.id));
  for (const e of edges)
    assert.ok(ids.has(e.from) && ids.has(e.to));
  assert.equal(new Set(facilities.map(f => f.id)).size, facilities.length);
  assert.ok(geographicOsmData().ground.length);
});
test('geographic runtime builds the actual station scene including gate fences', async () => {
  await mkdir('build/tests', { recursive: true });
  await build({ entryPoints: ['src/presentation/map-scene.ts'], bundle: true, platform: 'node', format: 'esm', packages: 'external', outfile: 'build/tests/map-scene.mjs' });
  const { MapScene } = await import(pathToFileURL(resolve('build/tests/map-scene.mjs')).href);
  const scene = Object.create(MapScene.prototype);
  const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
  Object.assign(scene, { layout, levels, facilities, openings, gateBoundaries: planGateBoundaries(facilities, layout.areas),
    scene: new T.Scene(), base: new T.Group(), roof: new T.Group(), groups: new Map(), materials: new Map(),
    commercialMassing: [], geographicBuildingFloors: [], publicPassages: [], connectors: [], pickables: [], labels: [],
    renderer: { capabilities: { getMaxAnisotropy: () => 1 } }, label: () => { } });
  assert.doesNotThrow(() => Reflect.get(scene, 'buildStation').call(scene));
  for (const p of layout.platforms.filter(p => p.level === 'hankyu-platform')) {
    const slab = scene.groups.get(p.level)!.getObjectByName('platform-slab-' + p.id) as T.Mesh;
    const material = slab.material as T.MeshStandardMaterial;
    assert.equal(material.color.getHex(), stationPalettes['hankyu-umeda'].platform);
    assert.ok(p.lineColor, 'route colours remain separate from the pale chestnut pavement');
  }
  for (const hall of layout.concourses) {
    assert.ok(scene.geographicBuildingFloors.some((model: T.Group) => model.name === hall.id), '1F hall must follow the ground visibility switch');
  }
});
test('geographic commercial exteriors separate podiums and towers with finite metre heights', () => {
  assert.equal(geographicBuildings.length, 11);
  for (const b of geographicBuildings) {
    assert.ok(b.volumes.length);
    for (const v of b.volumes) {
      assert.ok(v.top > v.base && v.top <= 200);
      assert.ok(v.outline.length >= 4);
      assert.ok(v.source.startsWith('https://www.openstreetmap.org/') || v.certainty === 'plateau-lod2');
    }
    const model = buildGeographicBuilding(b);
    model.traverse(o => { const mesh = o as T.Mesh; if (mesh.geometry)
      for (const v of mesh.geometry.getAttribute('position').array)
        assert.ok(Number.isFinite(v)); });
  }
  const gf = geographicBuildings.find(b => b.id === 'grand-front-south')!;
  assert.equal(gf.volumes[1]!.top, 166);
  assert.equal(gf.volumes[1]!.base, 40);
});
test('South Gate portal remains open below its sign and has flanking paired escalators', () => {
  const b = geographicBuildings.find(b => b.id === 'daimaru')!, e = b.entrance!, c = Math.cos(e.angle), s = Math.sin(e.angle);
  const model = buildGeographicBuilding(b);
  model.updateMatrixWorld(true);
  const start = new T.Vector3(e.center.x + c * 5 - s * 8, 8, e.center.z + s * 5 + c * 8);
  const ray = new T.Raycaster(start, new T.Vector3(s, 0, -c), 0, 18);
  assert.equal(ray.intersectObject(model, true).length, 0, 'solid facade closes the portal');
  const banks = ['south-building-61', 'south-entrance-east-escalators'].map(id => layout.connections.find(c => c.id === id)!);
  assert.ok(banks.every(c => c.lanes === 2));
  for (const bank of banks) {
    const upper = [bank.from, bank.to].find(n => n.level === 'south-deck')!;
    assert.ok(layout.areas.some(a => a.id === 'south-entrance-deck' && pointInPolygon(upper, a.outline)));
  }
});
