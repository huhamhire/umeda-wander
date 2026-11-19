import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MapSession } from '../../src/application/map-session.ts';
import { maxWalkingStops, planWalkingRoute } from '../../src/application/navigation/walking-route.ts';
import type { RouteEdge } from '../../src/domain/map/model.ts';
import { edges, nodes } from '../../src/infrastructure/district/geographic-map.ts';
import { walkingPlaces } from '../../src/infrastructure/district/walking-places.ts';

test('walking routes concatenate ordered legs and name the first blocked leg without drawing a partial route', () => {
    const graph: RouteEdge[] = [
        { from: 'a', to: 'b', kind: 'walk', cost: 1 },
        { from: 'b', to: 'c', kind: 'gate', directed: true, cost: 1 },
        { from: 'c', to: 'd', kind: 'stairs', cost: 1 },
        { from: 'd', to: 'e', kind: 'walk', cost: 1 }
    ];
    const itinerary = ['a', 'b', 'c', 'd', 'e'];
    assert.equal(itinerary.length - 2, maxWalkingStops);
    assert.deepEqual(planWalkingRoute(graph, itinerary, true), { route: itinerary });
    assert.deepEqual(planWalkingRoute(graph, ['a', 'c', 'e'], false), { issue: 'gateRequired', from: 'a', to: 'c' });
    assert.deepEqual(planWalkingRoute(graph, ['c', 'b'], true), { issue: 'unavailable', from: 'c', to: 'b' });
    assert.deepEqual(planWalkingRoute(graph, ['a', 'b', 'b'], true), { issue: 'duplicate', from: 'b', to: 'b' });
    assert.deepEqual(planWalkingRoute(graph, [...itinerary, 'd'], true), { issue: 'incomplete' });
});

test('shipped places are authored stations with real graph nodes, and unsupported station pairs remain disconnected', () => {
    const places = walkingPlaces();
    assert.equal(new Set(places.map(place => place.station)).size, 7);
    for (const place of places) {
        assert(nodes.some(node => node.id === place.id && node.level === place.level));
        assert(edges.some(edge => edge.from === place.id || edge.to === place.id));
    }
    const session = new MapSession(edges);
    assert(session.previewWalkingRoute(['entry', 'hall', 'gate-out'], false).route);
    assert.equal(session.state.level, 'all');
    assert.equal(session.state.roof, false);
    assert.equal(session.previewWalkingRoute(['entry', 'destination'], false).issue, 'gateRequired');
    assert.equal(session.state.route, null);
    assert(session.previewWalkingRoute(['entry', 'destination'], true).route);
    assert.equal(session.previewWalkingRoute(['entry', 'hankyu-umeda-route-entry'], true).issue, 'unavailable');
    assert.equal(session.state.route, null);
});
