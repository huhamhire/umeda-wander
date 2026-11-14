import { test } from 'node:test';
import assert from 'node:assert/strict';
import { edges } from '../src/infrastructure/jr-osaka-map.ts';
import { findRoute } from '../src/domain/navigation/find-route.ts';
test('platform route crosses a gate and the explicit vertical connection', () => {
  assert.deepEqual(findRoute(edges, 'entry', 'destination', true),
    ['entry', 'hall-bypass', 'hall-turn', 'hall-rejoin', 'hall', 'gate-out', 'gate-in', 'turn', 'lower', 'upper', 'destination']);
});
test('public route cannot cross the paid boundary', () => assert.equal(findRoute(edges, 'entry', 'destination', false), null));
test('up-only escalator cannot be traversed in reverse', () => assert.equal(findRoute(edges, 'destination', 'entry', true), null));
test('unconnected bridge is not reachable', () => assert.equal(findRoute(edges, 'entry', 'bridge', true), null));
