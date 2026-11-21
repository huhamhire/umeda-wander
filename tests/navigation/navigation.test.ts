import { test } from 'node:test';
import assert from 'node:assert/strict';
import { edges } from '../../src/infrastructure/stations/jr-osaka/layout.ts';
import { findRoute } from '../../src/domain/navigation/find-route.ts';
import type { RouteEdge } from '../../src/domain/map/model.ts';
import { walkableChord } from '../../src/domain/navigation/shape-walking-leg.ts';
test(
    'platform route crosses a gate and the explicit vertical connection',
    () => {
        assert.deepEqual(
            findRoute(edges, 'entry', 'destination', true),
            [
                'entry',
                'hall-crost-side',
                'gate-out',
                'gate-in',
                'turn',
                'lower',
                'upper',
                'destination'
            ]
        );
    }
);
test(
    'public route cannot cross the paid boundary',
    () => assert.equal(findRoute(edges, 'entry', 'destination', false), null)
);
test(
    'up-only escalator cannot be traversed in reverse',
    () => assert.equal(findRoute(edges, 'destination', 'entry', true), null)
);
test(
    'unconnected bridge is not reachable',
    () => assert.equal(findRoute(edges, 'entry', 'bridge', true), null)
);

test('street walking is a fallback and does not take priority over avoiding a gate', () => {
    const walk = (from: string, to: string, cost = 1): RouteEdge => ({ from, to, cost, kind: 'walk' });
    const paths: RouteEdge[] = [
        { ...walk('a', 'b'), street: true },
        { ...walk('b', 'c'), street: true },
        walk('a', 'deck', 20),
        walk('deck', 'c', 20),
        { from: 'deck', to: 'b', cost: 1, kind: 'gate' },
    ];
    assert.deepEqual(findRoute(paths, 'a', 'c', true), ['a', 'deck', 'c']);
    assert.deepEqual(findRoute(paths, 'a', 'b', true), ['a', 'b']);
    assert.deepEqual(findRoute(paths, 'b', 'c', false), ['b', 'c']);
});

test('vertical preference chooses a nearby escalator, then lift, and respects a one-way escalator', () => {
    const paths: RouteEdge[] = [
        { from: '1F', to: 'stairs', kind: 'stairs', cost: 5 },
        { from: 'stairs', to: '2F', kind: 'walk', cost: 1 },
        { from: '1F', to: 'lift', kind: 'elevator', cost: 4 },
        { from: 'lift', to: '2F', kind: 'walk', cost: 1 },
        { from: '1F', to: 'escalator', kind: 'escalator', cost: 8, directed: true },
        { from: 'escalator', to: '2F', kind: 'walk', cost: 6 }
    ];
    assert.deepEqual(findRoute(paths, '1F', '2F', false), ['1F', 'escalator', '2F']);
    assert.deepEqual(findRoute(paths, '2F', '1F', false), ['2F', 'lift', '1F']);
    assert.deepEqual(findRoute(paths.slice(0, 2), '1F', '2F', false), ['1F', 'stairs', '2F']);
    const distantEscalator = paths.map(edge => edge.from === 'escalator' ? { ...edge, cost: 80 } : edge);
    assert.deepEqual(findRoute(distantEscalator, '1F', '2F', false), ['1F', 'lift', '2F']);
    const distantLift = paths.map(edge => edge.from === 'lift' ? { ...edge, cost: 80 } : edge);
    assert.deepEqual(findRoute(distantLift, '2F', '1F', false), ['2F', 'stairs', '1F']);
});

test('route chords stay inside the floor outline and cannot clip a very narrow opening', () => {
    const region = {
        outline: [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }, { x: 6, z: 10 }, { x: 6, z: 6 }, { x: 0, z: 6 }],
        holes: [[{ x: 2, z: 2 }, { x: 2.02, z: 2 }, { x: 2.02, z: 4 }, { x: 2, z: 4 }]]
    };
    assert(walkableChord({ x: 0, z: 1 }, { x: 9, z: 1 }, region));
    assert(!walkableChord({ x: 1, z: 3 }, { x: 9, z: 3 }, region));
    assert(!walkableChord({ x: 1, z: 5 }, { x: 7, z: 9 }, region));
    assert(walkableChord({ x: 1, z: 5 }, { x: 9, z: 5 }, region));
});
