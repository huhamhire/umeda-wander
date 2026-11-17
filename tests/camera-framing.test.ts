import assert from 'node:assert/strict';
import { test } from 'node:test';
import { displayElevation } from '../src/application/display-elevation.ts';
import type { StationId } from '../src/domain/map/model.ts';
import { layout, levels } from '../src/infrastructure/district/geographic-map.ts';
import { cameraEnvelope } from '../src/presentation/camera-framing.ts';
test('floor cuts retain an identical camera envelope within each station focus', () => {
  for (const station of [null, 'jr-osaka', 'hankyu-umeda', 'metro-umeda', 'hanshin-umeda', 'higashi-umeda', 'nishi-umeda', 'kitashinchi'] as (StationId | null)[]) {
    for (const explode of [0, 0.48, 1]) {
      const elevation = (id: typeof levels[number]['id']) => displayElevation(levels, id, explode);
      const all = cameraEnvelope(layout, levels, { level: 'all', focusStation: station }, elevation).map(p => p.toArray());
      for (const level of levels)
        assert.deepEqual(cameraEnvelope(layout, levels, { level: level.id, focusStation: station }, elevation).map(p => p.toArray()), all);
    }
  }
});
