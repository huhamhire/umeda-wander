import {test} from 'node:test';
import assert from 'node:assert/strict';
import clipping from 'polygon-clipping';
import * as T from 'three';
import context from '../data/geography/display-context.json' with {type: 'json'};
import plan from '../data/geography/runtime-plan.json' with {type: 'json'};
import {layout, undergroundPublicAreas} from '../src/infrastructure/district/geographic-map.ts';
import {geographicBuildings} from '../src/infrastructure/buildings/index.ts';
import {deckBuildingOccupancies} from '../src/infrastructure/public-areas/deck-buildings.ts';
import {platformOutline} from '../src/domain/map/geometry.ts';
import type {PlanRegion} from '../src/domain/map/model.ts';
import {buildGeographicContext} from '../src/presentation/geographic-context.ts';
import {basementOccupancies} from '../src/infrastructure/public-areas/basement-buildings.ts';

const geometry = (region: PlanRegion): clipping.Polygon => [region.outline, ...region.holes ?? []].map(r => r.map(p => [p.x, p.z]));
const area = (g: clipping.MultiPolygon) => g.reduce((sum, p) => sum + p.reduce((sum, r, i) => sum + (i ? -1 : 1) * Math.abs(r.reduce((sum, a, j) => {
  const b = r[(j + 1) % r.length]!;
  return sum + a[0] * b[1] - a[1] * b[0];
}, 0)) / 2, 0), 0);
const scope = context.scope as clipping.MultiPolygon;

test('display pruning keeps underground, platforms and destination contexts under an opaque ground mask', () => {
  const regions = [
    ...undergroundPublicAreas,
    ...basementOccupancies.map(b => b.region),
    ...layout.platforms.map(p => ({outline: platformOutline(p)})),
    ...layout.areas.filter(a => a.railings),
    ...geographicBuildings.map(b => ({outline: b.volumes[0]!.outline})),
    ...deckBuildingOccupancies.flatMap(group => group.definitions.map(b => b.region)),
  ];
  for (const region of regions) {
    assert.ok(area(clipping.difference(geometry(region), scope)) < .01, 'display crop removed a station, public network or core building');
  }
});

test('retained ground features stay inside scope and unrelated anonymous building tiles are absent', () => {
  const hosts = new Set(context.surfaces.filter(s => s.kind === 'building').map(s => s.id));
  assert.ok(hosts.size < 30 && hosts.size > 10, 'unexpected broad building context or missing related hosts');
  assert.ok(context.surfaces.length < plan.ground.length * .6, 'outer road/occupancy clutter was not reduced');
  assert.ok(hosts.has('way/1147394005') && hosts.has('way/1347368433'), 'new bridge targets lost their ground context');
  const sourceIds = new Set(plan.ground.map(f => f.id));
  for (const surface of context.surfaces) {
    assert.ok(sourceIds.has(surface.id), 'display crop invented an OSM feature');
    // The offline union normalizes intersections to 1 mm; allow its tiny edge slivers.
    assert.ok(area(clipping.difference(surface.geometry as clipping.MultiPolygon, scope)) < .02, 'surface escapes display mask');
  }
});

test('trimmed ground and retained paving preserve real access openings', () => {
  const center = {x: 400, z: 600};
  const opening = [
    {x: center.x - 2, z: center.z - 2},
    {x: center.x + 2, z: center.z - 2},
    {x: center.x + 2, z: center.z + 2},
    {x: center.x - 2, z: center.z + 2},
  ];
  const context = buildGeographicContext([opening]);
  context.roads.updateMatrixWorld(true);
  const ray = new T.Raycaster(new T.Vector3(center.x, 5, center.z), new T.Vector3(0, -1, 0), 0, 10);
  assert.equal(ray.intersectObject(context.roads, true).length, 0, 'ground skin or road paving sealed the access hole');
  for (const group of Object.values(context)) {
    group.traverse(object => {
      if (object instanceof T.Mesh) {
        object.geometry.dispose();
      }
    });
  }
});
