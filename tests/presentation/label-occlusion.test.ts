import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { LabelOcclusion, visibleLabelOccluders } from '../../src/presentation/label-occlusion.ts';
import { buildFloorGeometry } from '../../src/presentation/floor-geometry.ts';

const camera = new T.OrthographicCamera(-20, 20, 20, -20, 0.1, 200);
camera.position.set(0, 30, 30);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();
camera.updateProjectionMatrix();
const rect = (x: number, z: number, w: number, d: number) => [
    { x: x - w / 2, z: z - d / 2 },
    { x: x + w / 2, z: z - d / 2 },
    { x: x + w / 2, z: z + d / 2 },
    { x: x - w / 2, z: z + d / 2 }
];
test(
    'opaque upper floors occlude labels, while true floor openings remain visible',
    () => {
        const occlusion = new LabelOcclusion();
        const material = new T.MeshBasicMaterial({ side: T.DoubleSide });
        const slab = new T.Mesh(buildFloorGeometry(rect(0, 0, 24, 24), [], 0.5, 5), material);
        const open = new T.Mesh(buildFloorGeometry(rect(0, 0, 24, 24), [rect(0, 5.25, 5, 5)], 0.5, 5), material);
        slab.updateMatrixWorld();
        open.updateMatrixWorld();
        assert(occlusion.isOccluded(new T.Vector3(0, 0, 0), camera, [slab]));
        assert(!occlusion.isOccluded(new T.Vector3(0, 0, 0), camera, [open]));
        assert(
            !occlusion.isOccluded(new T.Vector3(0, 7, 0), camera, [slab]),
            'a label above its own floor must remain visible'
        );
    }
);
test(
    'hidden floor ancestors and transparent glazing do not hide labels',
    () => {
        const parent = new T.Group();
        const solid = new T.Mesh(new T.BoxGeometry(10, 1, 10), new T.MeshBasicMaterial());
        parent.add(solid);
        parent.visible = false;
        const glass = new T.Mesh(new T.BoxGeometry(10, 1, 10), new T.MeshBasicMaterial({ transparent: true, opacity: 0.16 }));
        const invisible = new T.Mesh(new T.BoxGeometry(), new T.MeshBasicMaterial({ visible: false }));
        assert.deepEqual(visibleLabelOccluders([solid, glass, invisible]), []);
        parent.visible = true;
        assert.deepEqual(visibleLabelOccluders([solid, glass, invisible]), [solid]);
    }
);
