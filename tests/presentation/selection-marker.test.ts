import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { SelectionMarker } from '../../src/presentation/components/selection-marker.ts';
test(
    'selected facility pin has raised beveled geometry, a ground halo and deterministic reduced-motion pose',
    () => {
        const marker = new SelectionMarker();
        const pin = marker.group.getObjectByName('floating-location-pin') as T.Mesh;
        assert(pin);
        assert(marker.group.getObjectByName('selection-ground-halo'));
        assert.equal(pin.geometry.type, 'ExtrudeGeometry');
        pin.geometry.computeBoundingBox();
        assert(pin.geometry.boundingBox!.max.z - pin.geometry.boundingBox!.min.z > 0.6);
        marker.restart(1000);
        marker.update(1000, false, 0.2);
        const entry = pin.parent!.position.y;
        marker.update(1320, false, 0.2);
        assert(pin.parent!.position.y < entry, 'pin settles in from above');
        marker.update(1770, false, 0.2);
        const phase = pin.parent!.position.y;
        marker.update(2200, false, 0.2);
        assert.notEqual(pin.parent!.position.y, phase);
        marker.update(3000, true, 0.2);
        const quiet = pin.parent!.position.clone();
        marker.update(4000, true, 0.2);
        assert.deepEqual(pin.parent!.position, quiet);
        assert.equal(pin.parent!.scale.x, 1);
        for (const time of [0, 100, 500, 10000]) {
            marker.update(time, false, 0.4);
            marker.group.updateMatrixWorld(true);
            marker.group.traverse(o => {
                if (o instanceof T.Mesh) {
                    assert(o.geometry.getAttribute('position').array.every(Number.isFinite));
                    assert(o.renderOrder >= 100);
                    assert(!o.userData.labelOccluder);
                }
            });
        }
    }
);
