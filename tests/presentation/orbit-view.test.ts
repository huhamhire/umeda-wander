import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { orbitAboutPoint } from '../../src/presentation/orbit-view.ts';

function camera(offset: T.Vector3, center: T.Vector3) {
    const c = new T.OrthographicCamera(-240, 240, 160, -160, .1, 6000);
    c.position.copy(center).addScaledVector(offset, 6);
    c.lookAt(center);
    c.updateMatrixWorld(true);
    return c;
}
test(
    'yaw/pitch orbit keeps an off-centre picked point fixed without changing orthographic scale',
    () => {
        const offset = new T.Vector3(0, 170, 273);
        const center = new T.Vector3(400, 10, 600);
        const pivot = new T.Vector3(460, 35, 645);
        const initial = camera(offset, center);
        const screen = pivot.clone().project(initial);
        const distance = offset.length();
        for (const [dx, dy] of [
            [20, 10],
            [-10, 12],
            [35, -14],
            [-45, -8],
            [0, 500],
            [0, -500]
        ]) {
            orbitAboutPoint(offset, center, pivot, dx!, dy!);
            const current = camera(offset, center);
            const p = pivot.clone().project(current);
            assert.ok(Math.abs(p.x - screen.x) < 1e-9 && Math.abs(p.y - screen.y) < 1e-9);
            assert.ok(Math.abs(offset.length() - distance) < 1e-9);
            assert.equal(current.top, initial.top);
            assert.equal(current.right, initial.right);
            assert.ok(offset.y / distance >= Math.sin(15 * Math.PI / 180) - 1e-9 && offset.y / distance <= Math.sin(80 * Math.PI / 180) + 1e-9);
        }
    }
);
