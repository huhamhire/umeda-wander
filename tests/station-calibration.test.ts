import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fromGeographicPlan, toGeographicPlan } from '../src/domain/map/spatial-block.ts';
import { createPilotCalibrations } from '../src/infrastructure/district/calibration-registry.ts';
import { createGeographicStations } from '../src/infrastructure/district/geographic-stations.ts';
import { geographicFrame } from '../src/infrastructure/geography/frame.ts';
import { osmBuildingEnvelopes } from '../src/infrastructure/geography/osm-envelope.ts';
const stationMaps = createGeographicStations();
test('geographic plan has east/south axes and reversible metres', () => {
  const p = { lat: 34.7022133, lon: 135.4955732 };
  const q = toGeographicPlan(p, geographicFrame);
  assert.ok(q.x > 0 && q.z > 0);
  const restored = fromGeographicPlan(q, geographicFrame);
  assert.ok(Math.abs(restored.lat - p.lat) < 1e-10 && Math.abs(restored.lon - p.lon) < 1e-10);
});
test('pilot envelopes resolve snapshot buildings and keep estimated M16 separate', () => {
  const features = JSON.parse(readFileSync('data/geography/features.json', 'utf8'));
  const pilot = createPilotCalibrations(features);
  assert.equal(pilot.length, 3);
  assert.equal(new Set(pilot.map(p => p.station)).size, 3);
  assert.ok(pilot.every(p => p.status === 'envelope-review'));
  assert.ok(pilot.slice(0, 2).every(p => p.envelopes.every(e => e.certainty === 'source-geometry' && e.outline.length > 3)));
  assert.equal(pilot[2]!.envelopes[0]!.certainty, 'approximate');
  assert.throws(() => osmBuildingEnvelopes([], 'missing'), /Missing OSM/);
});
test('station module migration preserves seven unique owners and level ownership', () => {
  assert.equal(stationMaps.length, 7);
  assert.equal(new Set(stationMaps.map(s => s.id)).size, 7);
  for (const s of stationMaps) {
    assert.ok(s.levels.every(l => l.station === s.id));
    const levels = new Set(s.levels.map(l => l.id));
    assert.ok(s.layout.platforms.every(p => levels.has(p.level)));
  }
});
