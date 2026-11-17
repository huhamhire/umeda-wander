import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { planAtriumOpenings } from '../src/application/atrium-openings.ts';
import { planFloorOpenings } from '../src/application/connection-openings.ts';
import { displayElevation } from '../src/application/display-elevation.ts';
import { viewLayerRole } from '../src/application/view-layer.ts';
import { layout, levels } from '../src/infrastructure/district/geographic-map.ts';
import { buildFloorGeometry } from '../src/presentation/floor-geometry.ts';
import { VerticalConnectionModel } from '../src/presentation/vertical-connection-model.ts';
import { cameraOffset } from '../src/presentation/view-orientation.ts';
test('Daimaru bank 50 and shaft T stay visible through the upper public floor from either 2F selection', () => {
  const openings = [...planFloorOpenings(layout.connections, levels, layout.platforms), ...planAtriumOpenings(layout.atria)];
  for (const focus of ['platform', 'south-deck'] as const)
    for (const explode of [0, 0.48, 1]) {
      const elevation = (id: typeof levels[number]['id']) => displayElevation(levels, id, explode);
      const upper = layout.areas.find(a => a.id === 'south-building-3f')!;
      assert.equal(viewLayerRole(levels, { level: focus }, upper.level), 'current');
      const floor = new T.Mesh(buildFloorGeometry(upper.outline, openings.filter(o => o.level === upper.level).map(o => o.outline), 0.55), new T.MeshBasicMaterial());
      floor.position.y = elevation(upper.level);
      floor.updateMatrixWorld();
      for (const id of ['south-building-50', 'south-lift-t']) {
        const c = layout.connections.find(c => c.id === id)!, model = new VerticalConnectionModel(c, levels, layout.platforms);
        model.update(elevation, focus);
        assert(model.group.visible);
        assert(model.group.getObjectByName('connection-body')!.visible);
        for (const t of [0.2, 0.5, 0.8]) {
          const y = elevation(c.from.level) + (elevation(c.to.level) - elevation(c.from.level)) * t;
          const target = new T.Vector3(c.from.x + (c.to.x - c.from.x) * t, y + (c.kind === 'elevator' ? 1.8 : 0.8), c.from.z + (c.to.z - c.from.z) * t);
          const ray = new T.Raycaster(target.clone().add(cameraOffset), cameraOffset.clone().normalize().negate());
          assert(!ray.intersectObject(floor).some(h => h.distance < cameraOffset.length() - 0.1), `${id}: upper slab hides flight/shaft at ${focus}, ${explode}, ${t}`);
        }
      }
      floor.geometry.dispose();
      floor.material.dispose();
    }
});
