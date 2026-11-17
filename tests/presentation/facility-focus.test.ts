import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { facilityFocusRect, facilityCameraCenter, minimumMapZoom } from '../../src/presentation/camera/facility-focus.ts';
import { cameraOffset } from '../../src/presentation/camera/view-orientation.ts';
test(
    'maximum zoom-out fills 80 percent of usable height regardless of horizontal fit and menu size',
    () => {
        for (const base of [100, 600]) {
            for (const menuHeight of [0, 200, 350]) {
                const height = 800;
                const usable = height - menuHeight;
                const extent = 140;
                const zoom = minimumMapZoom(base, extent, height, usable);
                const span = base / zoom;
                assert(Math.abs(extent / span * height / usable - 0.8) < 1e-9);
            }
        }
    }
);
test(
    'facility anchors project to the unobscured center across mobile menus, rotation and desktop sidebar',
    () => {
        for (const [viewport, sidebar, mobile] of [
            [
                {
                    left: 0,
                    top: 0,
                    width: 390,
                    height: 844
                },
                {
                    left: 12,
                    top: 650,
                    width: 366,
                    height: 160
                },
                true
            ],
            [
                {
                    left: 0,
                    top: 64,
                    width: 390,
                    height: 780
                },
                {
                    left: 12,
                    top: 650,
                    width: 366,
                    height: 160
                },
                true
            ],
            [
                {
                    left: 0,
                    top: 64,
                    width: 390,
                    height: 780
                },
                {
                    left: 12,
                    top: 470,
                    width: 366,
                    height: 340
                },
                true
            ],
            [
                {
                    left: 0,
                    top: 64,
                    width: 740,
                    height: 326
                },
                {
                    left: 12,
                    top: 220,
                    width: 716,
                    height: 136
                },
                true
            ],
            [
                {
                    left: 0,
                    top: 92,
                    width: 1440,
                    height: 763
                },
                {
                    left: 36,
                    top: 235,
                    width: 290,
                    height: 410
                },
                false
            ],
        ] as const) {
            const usable = facilityFocusRect(viewport, sidebar, mobile);
            if (mobile) {
                assert.equal(viewport.top + usable.height, sidebar.top - 12);
            }
            else {
                assert.equal(usable.left, sidebar.left + sidebar.width + 16);
            }
            for (const anchor of [new T.Vector3(-30, -16, 60), new T.Vector3(60, 45, -90)]) {
                for (const span of [80, 200, 400]) {
                    const center = facilityCameraCenter(anchor, span, viewport.width, viewport.height, usable);
                    const aspect = viewport.width / viewport.height;
                    const camera = new T.OrthographicCamera(-span * aspect / 2, span * aspect / 2, span / 2, -span / 2, 0.1, 1200);
                    camera.position.copy(center).add(cameraOffset);
                    camera.lookAt(center);
                    camera.updateMatrixWorld(true);
                    const projected = anchor.clone().project(camera);
                    const x = (projected.x + 1) * viewport.width / 2;
                    const y = (1 - projected.y) * viewport.height / 2;
                    assert(Math.abs(x - (usable.left + usable.width / 2)) < 1e-6);
                    assert(Math.abs(y - (usable.top + usable.height / 2)) < 1e-6);
                }
            }
        }
    }
);
test(
    'absent or out-of-viewport menus retain the actual canvas center',
    () => {
        const viewport = {
            left: 0,
            top: 64,
            width: 390,
            height: 780
        };
        for (const sidebar of [
            undefined,
            {
                left: 500,
                top: 64,
                width: 200,
                height: 300
            }
        ]) {
            const usable = facilityFocusRect(viewport, sidebar, true);
            assert.deepEqual(
                usable,
                {
                    left: 0,
                    top: 0,
                    width: 390,
                    height: 780
                }
            );
            const anchor = new T.Vector3(10, 20, 30);
            assert(facilityCameraCenter(anchor, 200, 390, 780, usable).distanceTo(anchor) < 1e-6);
        }
    }
);
