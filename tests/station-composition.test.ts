import assert from 'node:assert/strict';
import { test } from 'node:test';
import { composeStationMaps } from '../src/application/compose-station-maps.ts';
import type { StationLayout } from '../src/domain/map/model.ts';
import { createGeographicStations } from '../src/infrastructure/district/geographic-stations.ts';
const empty: StationLayout = { areas: [], platforms: [], connections: [] };
const stationMaps = createGeographicStations();
const districtMapParts: StationLayout = {
  ...empty,
  passages: [],
  areas: [{
      id: 'public-composition-fixture', level: 'concourse', kind: 'public', name: 'fixture',
      outline: [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }, { x: 0, z: 10 }],
      evidence: { pages: [], detail: 'Independent composition fixture; not a real passage.' },
    }],
};
test('each station composes independently without district data or foreign route nodes', () => {
  for (const station of stationMaps) {
    const before = JSON.stringify(station), map = composeStationMaps([station], empty);
    assert.equal(map.stations.length, 1);
    assert.equal(map.stations[0]!.id, station.id);
    const levelIds = new Set(map.levels.map(l => l.id)), nodeIds = new Set(map.nodes.map(n => n.id));
    for (const item of [...map.layout.areas, ...map.layout.platforms, ...map.sourceFacilities, ...map.nodes])
      assert(levelIds.has(item.level), `${station.id}: foreign level ${item.level}`);
    for (const edge of map.edges)
      assert(nodeIds.has(edge.from) && nodeIds.has(edge.to));
    for (const approach of map.layout.railApproaches) {
      assert.equal(approach.station, station.id);
      assert(levelIds.has(approach.level));
      for (const segment of approach.segments.filter(s => s.platformId))
        assert(map.layout.platforms.some(p => p.id === segment.platformId));
    }
    assert.equal(JSON.stringify(station), before, 'assembly must not mutate the station definition');
  }
});
test('district assembly preserves station inventory and local routes without inventing interchanges', () => {
  const map = composeStationMaps(stationMaps, districtMapParts);
  assert.deepEqual(map.stations.map(s => s.id), stationMaps.map(s => s.id));
  assert.equal(map.edges.length, stationMaps.reduce((n, s) => n + s.edges.length, 0));
  assert.equal(map.layout.areas.length, stationMaps.reduce((n, s) => n + s.layout.areas.length, 0) + districtMapParts.areas.length);
  assert.equal(map.layout.passages.length, stationMaps.reduce((n, s) => n + (s.layout.passages?.length ?? 0), 0) + districtMapParts.passages!.length);
  assert.throws(() => composeStationMaps([stationMaps[0]!, stationMaps[0]!], empty), /Duplicate station/);
  assert.throws(() => composeStationMaps([stationMaps[0]!, { ...stationMaps[1]!, levels: stationMaps[0]!.levels }], empty), /Duplicate level/);
});
