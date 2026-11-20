import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { orbitAboutPoint, orbitPointOnPlane } from '../../src/presentation/camera/orbit-view.ts';

function camera(offset: T.Vector3, center: T.Vector3) {
    const c = new T.OrthographicCamera(-240, 240, 160, -160, .1, 6000);
    c.position.copy(center).addScaledVector(offset, 6);
    c.lookAt(center);
    c.updateMatrixWorld(true);
    return c;
}

test('viewport-centered orbit keeps the look-at point centered through yaw and pitch', () => {
    const offset = new T.Vector3(0, 170, 273);
    const center = new T.Vector3(400, 10, 600);
    const pivot = center.clone();
    const initial = camera(offset, center);
    orbitAboutPoint(offset, center, pivot, .25, -.12);
    orbitAboutPoint(offset, center, pivot, -.1, .35);
    const current = camera(offset, center);
    assert.deepEqual(center.toArray(), pivot.toArray());
    const screen = pivot.clone().project(current);
    assert(Math.hypot(screen.x, screen.y) < 1e-9);
    assert.notDeepEqual(current.position.toArray(), initial.position.toArray());
    assert.equal(current.top - current.bottom, initial.top - initial.bottom);
});

test('the centre ray supplies a ground pivot without a visible ground mesh', () => {
    const offset = new T.Vector3(45, 170, 273);
    const center = new T.Vector3(400, -24, 600);
    const initial = camera(offset, center);
    const raycaster = new T.Raycaster();
    raycaster.setFromCamera(new T.Vector2(0, 0), initial);
    const pivot = orbitPointOnPlane(raycaster.ray, 0)!;
    assert.equal(pivot.y, 0);
    assert.notEqual(pivot.z, center.z);
    orbitAboutPoint(offset, center, pivot, .65, -.2);
    const current = camera(offset, center);
    const screen = pivot.clone().project(current);
    assert(Math.hypot(screen.x, screen.y) < 1e-9);
    assert.equal(current.top - current.bottom, initial.top - initial.bottom);
});

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
            orbitAboutPoint(offset, center, pivot, dx! * .006, dy! * .006);
            const current = camera(offset, center);
            const p = pivot.clone().project(current);
            assert.ok(Math.abs(p.x - screen.x) < 1e-9 && Math.abs(p.y - screen.y) < 1e-9);
            assert.ok(Math.abs(offset.length() - distance) < 1e-9);
            assert.equal(current.top, initial.top);
            assert.equal(current.right, initial.right);
            const pitch = T.MathUtils.radToDeg(Math.asin(offset.y / distance));
            assert.ok(pitch >= 5 - 1e-9 && pitch <= 80 + 1e-9);
        }
        assert.ok(Math.abs(T.MathUtils.radToDeg(Math.asin(offset.y / distance)) - 5) < 1e-9);
    }
);
