import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenDirection, rotateView, resetView } from '../../src/presentation/camera/view-orientation.ts';
test(
    'north-up default and yaw rotation retain compass opposition and reset',
    () => {
        resetView();
        assert.ok(Math.abs(screenDirection(-Math.PI / 2).x) < 1e-8);
        rotateView(.5);
        assert.ok(Math.abs(screenDirection(-Math.PI / 2).x) > .1);
        const n = screenDirection(-Math.PI / 2);
        const s = screenDirection(Math.PI / 2);
        assert.ok(n.clone().add(s).length() < 1e-8);
        resetView();
        assert.ok(Math.abs(screenDirection(-Math.PI / 2).x) < 1e-8);
    }
);
