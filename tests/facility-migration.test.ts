import assert from 'node:assert/strict';
import { test } from 'node:test';
import clipping from 'polygon-clipping';
import { auditFacilityMigration } from '../scripts/geography/facility-migration.ts';
import { visibleElevatorConnections } from '../src/application/elevator-visibility.ts';
import { pointInPolygon } from '../src/domain/map/geometry.ts';
import { facilities, jpAccess, layout, levels, undergroundPublicAreas } from '../src/infrastructure/district/geographic-map.ts';
import { facilityCodes } from '../src/infrastructure/facility-codes.ts';
test('the geographic directory retains every legacy candidate, flight and platform by ID or reviewed replacement', () => {
  const report = auditFacilityMigration(layout, facilities, facilityCodes);
  assert.deepEqual(report.issues, []);
  assert.equal(report.previous.facilities, 476);
  assert.equal(report.previous.connections, 177);
  assert.ok(report.current.facilities >= report.previous.facilities);
});
test('migration audit detects lost models, missing POIs and stale landing coordinates', () => {
  const lost = { ...layout, connections: layout.connections.filter(c => c.id !== 'walkway-ac') };
  assert.ok(auditFacilityMigration(lost, facilities, facilityCodes).issues.includes('Missing connection: walkway-ac'));
  const missing = facilities.filter(f => f.id !== 'umekita-link');
  assert.ok(auditFacilityMigration(layout, missing, facilityCodes).issues.includes('Missing authored facility: umekita-link'));
  const stale = facilities.map(f => f.id === 'walkway-ab-poi' ? { ...f, x: f.x + 10 } : f);
  assert.ok(auditFacilityMigration(layout, stale, facilityCodes).issues.some(i => i.includes('misses actual landing: walkway-ab-poi')));
});
test('restored JP public lift segments share a vertical shaft without inventing the Garden Avenue join', () => {
  const lower = layout.connections.find(c => c.id === 'jp-garden-lift-0')!;
  const upper = layout.connections.find(c => c.id === 'public-jp-deck-lift')!;
  assert.deepEqual({ x: lower.to.x, z: lower.to.z }, { x: upper.from.x, z: upper.from.z });
  assert.equal(lower.to.level, upper.from.level);
  const visible = visibleElevatorConnections(layout.connections, levels, 'district-underground');
  assert.ok(visible.has(lower.id) && visible.has(upper.id), 'B1 exploration must keep the complete B1–2F shaft');
  assert.equal(lower.blockId, 'hanshin-west-b1');
  assert.ok(jpAccess.connections.every(c => c.evidence.pages.includes(2) && c.evidence.urls?.[0]?.includes('1027_01_01.pdf')));
  const polygons: clipping.Polygon[] = undergroundPublicAreas.map(a => [a.outline, ...a.holes ?? []].map(r => r.map(p => [p.x, p.z] as [
    number,
    number
  ])));
  const union = clipping.union(polygons[0]!, ...polygons.slice(1));
  const mainGate = facilities.find(f => f.id === 'hanshin-umeda-west-gate')!;
  const contains = (polygon: clipping.Polygon, p: {
    x: number;
    z: number;
  }) => pointInPolygon(p, polygon[0]!.map(([x, z]) => ({ x, z }))) &&
    !polygon.slice(1).some(r => pointInPolygon(p, r.map(([x, z]) => ({ x, z }))));
  const garden = union.find(p => contains(p, lower.from))!;
  assert.ok(garden, 'source-confirmed lower landing must be supported');
  assert.ok(!contains(garden, mainGate), 'do not silently infer the unresolved Garden Avenue attachment');
});
