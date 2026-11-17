import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { displayElevation } from '../src/application/display-elevation.ts';
import { visibleElevatorConnections } from '../src/application/elevator-visibility.ts';
import { layout, levels } from '../src/infrastructure/district/geographic-map.ts';
import { VerticalConnectionModel } from '../src/presentation/vertical-connection-model.ts';
test('floor cuts preserve complete served elevator shafts and doors at both ends', () => {
  const c = layout.connections.find(c => c.id === 'lift-m')!, model = new VerticalConnectionModel(c, levels, layout.platforms);
  for (const explode of [0, 0.48, 1]) {
    const elevation = (id: typeof c.from.level) => displayElevation(levels, id, explode);
    model.update(elevation, 'all');
    const shaft = model.group.getObjectByName('transparent-elevator-shaft') as T.Mesh, fullHeight = shaft.scale.y;
    for (const level of [c.from.level, c.to.level]) {
      model.update(elevation, level);
      assert.equal(shaft.scale.y, fullHeight);
      for (const name of ['connection-body', 'lower-landing', 'upper-landing'])
        assert(model.group.getObjectByName(name)!.visible);
    }
  }
});
test('continuous multi-stop shafts keep upper segments even when their floors are hidden', () => {
  const visible = visibleElevatorConnections(layout.connections, levels, 'hanshin-hall');
  for (const id of ['hanshin-umeda-south-lift-b1-ground', 'hanshin-umeda-south-lift-ground-deck']) {
    assert(visible.has(id));
    const c = layout.connections.find(c => c.id === id)!, model = new VerticalConnectionModel(c, levels, layout.platforms);
    model.update(level => displayElevation(levels, level, 0.48), 'hanshin-hall', true);
    assert(model.group.visible);
    assert(model.group.getObjectByName('upper-landing')!.visible);
    const shaft = model.group.getObjectByName('transparent-elevator-shaft') as T.Mesh;
    assert(shaft.scale.y > 7);
  }
  assert(layout.connections.some(c => c.id === 'hankyu-umeda-lift-1'));
  assert(!visible.has('hankyu-umeda-lift-1'), 'unrelated shafts entirely above the cut stay hidden');
});
