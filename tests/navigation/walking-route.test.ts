import assert from 'node:assert/strict';
import { test } from 'node:test';
import clipping from 'polygon-clipping';
import type { Polygon } from 'polygon-clipping';
import { MapSession } from '../../src/application/map-session.ts';
import { viewLayerRole } from '../../src/application/exploration/view-layer.ts';
import { maxWalkingStops, planWalkingRoute } from '../../src/application/navigation/walking-route.ts';
import type { RouteEdge } from '../../src/domain/map/model.ts';
import { passageOutline } from '../../src/domain/map/geometry.ts';
import { edges, levels, nodes, publicWalkingRoutes, undergroundPublicAreas } from '../../src/infrastructure/district/geographic-map.ts';
import { walkingPlaces } from '../../src/infrastructure/district/walking-places.ts';
import { RouteModel } from '../../src/presentation/models/stations/route-model.ts';

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

test('the B1 transfer connects all three public stations in both directions and opens B1 on preview', () => {
    const west = 'hanshin-umeda-route-entry';
    const middle = 'nishi-umeda-route-entry';
    const east = 'kitashinchi-route-entry';
    const session = new MapSession(edges, { nodes, levels });
    for (const from of [west, middle, east]) {
        for (const to of [west, middle, east].filter(id => id !== from)) {
            const { route } = session.previewWalkingRoute([from, to], false);
            assert(route?.includes('walking-b1-nishi-north-approach') || route?.includes('walking-b1-nishi-south-junction'));
            assert.equal(session.state.level, 'district-underground');
            assert.equal(session.state.explode, 0);
        }
    }
    const via = session.previewWalkingRoute([west, 'nishi-umeda-south-route-out', east], false).route;
    assert(via?.includes('nishi-umeda-south-route-out'));
    assert.equal(session.previewWalkingRoute([west, 'kitashinchi-destination'], false).issue, 'gateRequired');
    assert(session.previewWalkingRoute([west, 'kitashinchi-destination'], true).route);
    assert.equal(session.state.level, 'all');
    const entering = session.previewWalkingRoute([west, 'nishi-umeda-destination'], true).route;
    const exiting = session.previewWalkingRoute(['nishi-umeda-destination', west], true).route;
    assert(entering?.includes('nishi-umeda-middle-route-out'));
    assert(exiting?.includes('nishi-umeda-north-route-out'));
    assert(!exiting?.includes('nishi-umeda-middle-route-out'));
});

test('the cross-station route mesh stays continuous across B1 owners and hides on another floor', () => {
    const { route } = planWalkingRoute(edges, ['hanshin-umeda-route-entry', 'kitashinchi-route-entry'], false);
    assert(route);
    const model = new RouteModel(nodes);
    const elevation = (id: typeof levels[number]['id']) => levels.find(level => level.id === id)!.y;
    model.update(route, elevation, id => viewLayerRole(levels, { level: 'district-underground' }, id) === 'current');
    assert.equal(model.group.children.length, 2 * (route.length - 1) + 2);
    model.update(route, elevation, id => viewLayerRole(levels, { level: 'concourse' }, id) === 'current');
    assert.equal(model.group.children.length, 0);
});

test('authored transfer edges leave a continuous 3 m strip inside the rendered public B1 area', () => {
    const region = clipping.union(undergroundPublicAreas.filter(area => !area.elevationOffset).map(area =>
        [area.outline, ...area.holes ?? []].map(ring => ring.map(({ x, z }) => [x, z])) as Polygon
    ));
    const lookup = new Map(nodes.map(node => [node.id, node]));
    const byLevel = new Map(levels.map(level => [level.id, level.y]));
    for (const edge of publicWalkingRoutes.edges) {
        const from = lookup.get(edge.from)!;
        const to = lookup.get(edge.to)!;
        assert.equal(edge.kind, 'walk');
        assert(!edge.directed);
        assert.equal(byLevel.get(from.level), -8);
        assert.equal(byLevel.get(to.level), -8);
        const strip: Polygon = [passageOutline(from, to, 3).map(({ x, z }) => [x, z])];
        assert.equal(clipping.difference(strip, region).length, 0, `${edge.from} → ${edge.to}`);
    }
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
