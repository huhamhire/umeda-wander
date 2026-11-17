import assert from 'node:assert/strict';
import { test } from 'node:test';
import { geographicRoofHeightAt as roofHeightAt } from '../src/presentation/roof-profile.ts';
test('the large roof is higher on the north side and lower on the south side', () => {
  assert(roofHeightAt(-36) > roofHeightAt(36));
  for (let z = -36; z < 36; z += 1)
    assert(roofHeightAt(z) > roofHeightAt(z + 1));
});
