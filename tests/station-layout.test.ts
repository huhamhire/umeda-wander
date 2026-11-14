import { test } from 'node:test';
import assert from 'node:assert/strict';
import { facilities, levels, platforms, connections, nodes, edges, areas } from '../src/infrastructure/jr-osaka-map.ts';
import { pointInPolygon, platformLocalPoint, platformPoint } from '../src/domain/map/geometry.ts';
import { displayElevation } from '../src/application/display-elevation.ts';
import { findRoute } from '../src/domain/navigation/find-route.ts';

test('Central Gate stays at ground 1F; mezzanine and Umekita are distinct levels', () => {
  assert.equal(facilities.find(f => f.id === 'gate')?.level, 'concourse');
  assert.equal(facilities.find(f => f.id === 'umekita-gate')?.level, 'underground-hall');
  for (const explode of [0, 0.48, 1]) {
    assert.equal(displayElevation(levels, 'concourse', explode), 0);
    assert(displayElevation(levels, 'underground-platform', explode) < displayElevation(levels, 'underground-hall', explode));
    assert(displayElevation(levels, 'underground-hall', explode) < 0);
    assert(displayElevation(levels, 'mezzanine', explode) > 0);
    assert(displayElevation(levels, 'mezzanine', explode) < displayElevation(levels, 'platform', explode));
  }
});
test('surface and underground platform numbers are complete, unique and correctly paired', () => {
  assert.deepEqual(platforms.filter(p => p.level === 'platform').flatMap(p => p.tracks).sort((a,b) => a-b), [1,2,3,4,5,6,7,8,9,10,11]);
  assert.deepEqual(platforms.filter(p => p.level === 'underground-platform').map(p => p.tracks), [[21,22],[23,24]]);
  assert.deepEqual(platforms.find(p => p.id === 'p5-6')?.tracks, [5,6]);
});
test('modeled objects reference valid floors, source pages and graph nodes', () => {
  const floorIds = new Set(levels.map(l => l.id));
  const nodeIds = new Set(nodes.map(n => n.id));
  assert.equal(nodeIds.size, nodes.length);
  for (const item of [...facilities, ...areas, ...platforms]) {
    assert(floorIds.has(item.level));
    assert(item.evidence.pages.every(page => Number.isInteger(page) && page >= 1 && page <= 8));
  }
  for (const c of connections) { assert(floorIds.has(c.from.level)); assert(floorIds.has(c.to.level)); assert(c.from.level!==c.to.level || c.from.elevationOffset!==c.to.elevationOffset); }
  for (const e of edges) { assert(nodeIds.has(e.from)); assert(nodeIds.has(e.to)); assert(e.cost > 0); }
});
test('Umekita route uses the connecting walkway and B1F concourse before descending again', () => {
  const path = findRoute(edges, 'west-entry', 'underground-destination', true);
  assert.deepEqual(path, ['west-entry','west-inside','west-lower','walkway-start','walkway-end','umekita-arrival','underground-lower','underground-upper','underground-destination']);
  assert.equal(findRoute(edges, 'west-entry', 'underground-destination', false), null);
  // No invented paid shortcut from the central platform graph into the new branch.
  assert.equal(findRoute(edges, 'destination', 'underground-destination', true), null);
});


test('route nodes and every modeled vertical landing are on a floor or platform footprint', () => {
  function supported(point: { level: string; x: number; z: number }): boolean {
    const inArea = areas.some(area => area.level === point.level && pointInPolygon(point, area.outline));
    const onPlatform = platforms.some(platform => {
      const local = platformLocalPoint(platform, point);
      return platform.level === point.level && Math.abs(local.x) <= platform.length / 2 + 1e-6 && Math.abs(local.z) <= platform.width / 2 + 1e-6;
    });
    return inArea || onPlatform;
  }
  for (const point of [...nodes, ...connections.flatMap(c => [c.from, c.to])]) {
    assert(supported(point), `${point.id} has no supporting footprint on ${point.level}`);
  }
});


test('Umekita platforms are oblique to the surface tracks, and their landings rotate with them', () => {
  const platform = platforms.find(p => p.id === 'p21-22')!;
  const angle = Math.abs(platform.rotationRad) * 180 / Math.PI;
  assert(angle > 25 && angle < 40, 'OSM-derived relative heading is about 31 degrees, not 90');
  const center = platformPoint(platform, 0, 0);
  assert.deepEqual(center, { x: platform.x, z: platform.z });
  const along = platformPoint(platform, 10, 0);
  assert(along.x > center.x && along.z < center.z, 'positive axis heads toward the northern/eastern end');
  const lower = nodes.find(n => n.id === 'underground-upper')!;
  const local = platformLocalPoint(platform, lower);
  assert(Math.abs(local.z) < 1e-6, 'rotated escalator lands on the platform center line');
});
test('the northern B1F approach stays outside gates until the Umekita ticket boundary', () => {
  assert.deepEqual(findRoute(edges, 'public-b1-entry', 'umekita-gate-out', false),
    ['public-b1-entry','public-b1-turn','public-join','umekita-gate-out']);
  assert.equal(findRoute(edges, 'public-b1-entry', 'underground-destination', false), null);
  const route = findRoute(edges, 'public-b1-entry', 'underground-destination', true)!;
  assert(route.includes('umekita-gate-in'));
  assert(!route.includes('west-entry') && !route.includes('walkway-start'));
});
test('the paid passage follows its corrected landings and has a short Umekita approach', () => {
  const start=nodes.find(node=>node.id==='walkway-start')!,end=nodes.find(node=>node.id==='walkway-end')!;
  const passage=areas.find(area=>area.id==='underground-walkway')!;
  const arrival=nodes.find(node=>node.id==='umekita-arrival')!;
  assert(Math.abs(end.z-start.z)>Math.abs(end.x-start.x)*3,'main spine should follow the supplied north/south passage sketch');
  assert(Math.hypot(arrival.x-end.x,arrival.z-end.z)<12,'Umekita approach must not be stretched across the old layout');
  for(let i=0;i<=20;i++)assert(pointInPolygon({x:start.x+(end.x-start.x)*i/20,z:start.z+(end.z-start.z)*i/20},passage.outline));
  const marker=facilities.find(facility=>facility.id==='umekita-link')!;
  assert(pointInPolygon(marker,passage.outline));
});
