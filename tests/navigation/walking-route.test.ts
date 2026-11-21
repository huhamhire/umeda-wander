import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import clipping from 'polygon-clipping';
import type { Polygon } from 'polygon-clipping';
import { MapSession } from '../../src/application/map-session.ts';
import { viewLayerRole } from '../../src/application/exploration/view-layer.ts';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { planAtriumOpenings } from '../../src/application/connections/atrium-openings.ts';
import { connectionLanes } from '../../src/application/connections/connection-lanes.ts';
import { displayElevation } from '../../src/application/exploration/display-elevation.ts';
import { maxWalkingStops, planWalkingRoute } from '../../src/application/navigation/walking-route.ts';
import { walkingApproaches } from '../../src/application/navigation/walking-approaches.ts';
import type { Facility, FloorArea, RouteEdge } from '../../src/domain/map/model.ts';
import { passageOutline, pointInPolygon } from '../../src/domain/map/geometry.ts';
import { edges, facilities, layout, levels, nodes, northWalking, southWalking, stations, undergroundPublicAreas } from '../../src/infrastructure/district/geographic-map.ts';
import { walkingPlaces } from '../../src/infrastructure/district/walking-places.ts';
import { createWalkingNetwork } from '../../src/infrastructure/district/walking-network.ts';
import { RouteModel } from '../../src/presentation/models/stations/route-model.ts';
import { VerticalConnectionModel } from '../../src/presentation/models/stations/vertical-connection-model.ts';

const floorOpenings = planFloorOpenings(layout.connections, levels, layout.platforms);
const mapOpenings = [...floorOpenings, ...planAtriumOpenings(layout.atria)];
let networkFixture: ReturnType<typeof createWalkingNetwork> | undefined;

/** Share the read-only district graph while each test owns its itinerary state. */
function walkingNetwork() {
    return networkFixture ??= createWalkingNetwork();
}

test('walk previews reduce the Hankyu mesh zigzag while preserving the chosen waypoint and transitions', () => {
    const network = walkingNetwork();
    const approaches = new Map(network.approaches);
    const session = new MapSession(network.edges, { nodes: network.nodes, levels, shapeLeg: network.shapeLeg });
    const waypoint = 'daimaru-entry';
    const stops = ['hankyu-umeda-route-entry', waypoint, 'nishi-umeda-destination'];
    const original = planWalkingRoute(network.edges, stops, true, approaches);
    const preview = session.previewWalkingRoute(stops, true, approaches);
    assert(original.route && preview.route);
    assert.equal(preview.route[0], original.route[0]);
    assert.equal(preview.route.at(-1), original.route.at(-1));
    assert(preview.route.includes(approaches.get(waypoint)![0]!.id));
    assert(preview.route.length < original.route.length / 2);
    const transitions = network.edges.filter(edge => edge.kind !== 'walk');
    const usedTransitions = (route: string[]) => route.slice(1).flatMap((to, i) => transitions.filter(edge =>
        edge.from === route[i] && edge.to === to || !edge.directed && edge.to === route[i] && edge.from === to));
    assert.deepEqual(usedTransitions(preview.route), usedTransitions(original.route));
    assert.equal(planWalkingRoute(network.edges, stops, false, approaches, network.shapeLeg).issue, 'gateRequired');
});

test('the expanded map routes Central Gate 9/10 to Higashi-Umeda exit 4 through a JR gate only', () => {
    const network = walkingNetwork();
    const approaches = new Map(network.approaches);
    const entrance = 'higashi-umeda-exit-4';
    const gates = network.edges.filter(edge => edge.kind === 'gate');
    const usedGates = (route: string[]) => route.slice(1).flatMap((to, i) => gates.filter(edge =>
        edge.from === route[i] && edge.to === to || !edge.directed && edge.to === route[i] && edge.from === to));
    for (const end of ['from', 'to']) {
        const escalator = 'connection-central-32-' + end;
        for (const [from, to] of [[escalator, entrance], [entrance, escalator]] as const) {
            const result = planWalkingRoute(network.edges, [from, to], true, approaches);
            assert(result.route);
            assert.deepEqual(usedGates(result.route).map(edge => edge.from), ['gate-out']);
            assert.equal(result.approximations?.length, 0);
            assert.equal(planWalkingRoute(network.edges, [from, to], false, approaches).issue, 'gateRequired');
        }
    }
    for (const allowPaid of [false, true]) {
        const result = planWalkingRoute(network.edges, [entrance, 'connection-dotica-exit-c-93-lower-from'], allowPaid, approaches);
        assert(result.route);
        assert.deepEqual(usedGates(result.route), []);
    }
    assert(!approaches.has('sonechika-exit-11-44'));
    for (const [from, to] of [['entry', 'platform-p23-24'], ['platform-p23-24', 'entry']] as const) {
        assert(planWalkingRoute(network.edges, [from, to], true, approaches).route);
    }
    for (const gate of edges.filter(edge => edge.kind === 'gate' && edge.directed)) {
        assert(gates.includes(gate));
        assert(!gates.some(other => other.from === gate.to && other.to === gate.from));
    }
});

test('Bridge Gate ticket machines reach the Nishi-Umeda platform through a single Metro gate in both directions', () => {
    const network = walkingNetwork();
    const approaches = new Map(network.approaches);
    const machines = 'machines-bridge';
    const platform = 'nishi-umeda-destination';
    const gates = network.edges.filter(edge => edge.kind === 'gate');
    for (const [from, to] of [[machines, platform], [platform, machines]] as const) {
        const result = planWalkingRoute(network.edges, [from, to], true, approaches);
        assert(result.route);
        assert.deepEqual(result.approximations, []);
        const route = result.route;
        const usedGates = route.slice(1).flatMap((next, i) => gates.filter(edge =>
            edge.from === route[i] && edge.to === next || !edge.directed && edge.to === route[i] && edge.from === next));
        assert.equal(usedGates.length, 1);
        assert.match(usedGates[0]!.from, /^nishi-umeda-/);
        assert.equal(planWalkingRoute(network.edges, [from, to], false, approaches).issue, 'gateRequired');
    }
    assert(planWalkingRoute(network.edges, ['entry', machines], false, approaches).route);
    assert(planWalkingRoute(network.edges, [machines, 'entry'], false, approaches).route);
    const streetNodes = new Set(network.edges.filter(edge => edge.street).flatMap(edge => [edge.from, edge.to]));
    const toBridge = planWalkingRoute(network.edges, ['entry', machines], false, approaches).route!;
    assert(!toBridge.some(id => streetNodes.has(id)));
    const toStreetExit = planWalkingRoute(network.edges, ['entry', 'nishi-umeda-exit-10'], false, approaches).route;
    assert(toStreetExit?.filter(id => streetNodes.has(id)).length);
});

test('the Loop Line platform route uses the Bridge Gate escalators and does not overshoot the platform destination', () => {
    const network = walkingNetwork();
    const approaches = new Map(network.approaches);
    const graphNodes = new Map(network.nodes.map(node => [node.id, node]));
    const machines = 'machines-bridge';
    const platform = 'platform-p1-2';
    const down = layout.connections.find(c => c.id === 'bridge-p1-2')!;
    const up = layout.connections.find(c => c.id === 'bridge-west-13')!;
    const openings = floorOpenings.filter(o => o.level === 'platform');
    for (const [from, to, departure, arrival] of [
        [machines, platform, down.from.id, down.to.id],
        [platform, machines, up.to.id, up.from.id]
    ] as const) {
        const route = planWalkingRoute(network.edges, [from, to], true, approaches, network.shapeLeg).route;
        assert(route);
        assert.equal(route[route.indexOf(departure) + 1], arrival);
        const gates = network.edges.filter(e => e.kind === 'gate' && route.includes(e.from) && route.includes(e.to));
        assert.deepEqual(gates.map(e => e.from), ['walk:gate:out:jr-osaka:bridge']);
        assert(network.edges.some(e => e.from === departure && e.to === arrival && e.directed && e.kind === 'escalator'));
        assert(!network.edges.some(e => e.from === arrival && e.to === departure && e.kind === 'escalator'));
        assert(!route.some(id => id.startsWith('walk:street:') || id.startsWith('bridge-lift-h-')));
        assert.equal(planWalkingRoute(network.edges, [from, to], false, approaches).issue, 'gateRequired');
        const points = route.map(id => graphNodes.get(id)!).filter(node => node.level === 'platform');
        assert(points.length >= 2, 'The itinerary includes a walk on the platform');
        const first = points[0]!;
        const last = points.at(-1)!;
        for (let i = 1; i < points.length; i++) {
            const previous = points[i - 1]!;
            const current = points[i]!;
            assert((current.x - previous.x) * (last.x - first.x) + (current.z - previous.z) * (last.z - first.z) > 0);
            for (let j = 1; j < 10; j++) {
                const t = j / 10;
                const point = { x: previous.x + (current.x - previous.x) * t, z: previous.z + (current.z - previous.z) * t };
                assert(!openings.some(opening => pointInPolygon(point, opening.outline)));
            }
        }
    }
    const withoutEscalators = network.edges.filter(e => e.kind !== 'escalator');
    const fallback = planWalkingRoute(withoutEscalators, [machines, platform], true, approaches, network.shapeLeg).route;
    assert(fallback?.includes('bridge-lift-h-3') && fallback.includes('bridge-lift-h-2'));
});

test('Hankyu south concourse stairs join the B1 public route in both directions', () => {
    const network = walkingNetwork();
    const ground = 'hankyu-concourse-south-stairs-ground';
    const basement = 'hankyu-concourse-south-stairs-b1';
    const destination = 'nishi-umeda-north-route-out';
    const outbound = planWalkingRoute(network.edges, [ground, destination], false).route;
    const inbound = planWalkingRoute(network.edges, [destination, ground], false).route;
    assert.equal(outbound?.[1], basement);
    assert.equal(inbound?.at(-2), basement);
});

test('Hankyu station and the department store concourse connect at 1F under the JR tracks', () => {
    const network = walkingNetwork();
    const graphNodes = new Map(network.nodes.map(node => [node.id, node]));
    const areas = layout.areas.filter(area => area.id.startsWith('hankyu-concourse-north-ground-'));
    const station = 'hankyu-umeda-route-entry';
    const concourse = 'hankyu-concourse-south-stairs-ground';
    for (const [from, to] of [[station, concourse], [concourse, station]] as const) {
        const { route } = planWalkingRoute(network.edges, [from, to], false);
        assert(route);
        const points = route.map(id => graphNodes.get(id)!);
        assert(points.every(point => levels.find(level => level.id === point.level)!.y + (point.elevationOffset ?? 0) === 0));
        assert(points.some(point => point.z > 455 && point.z < 485 && areas.some(area => pointInPolygon(point, area.outline))));
    }
});

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

test('an approximate waypoint uses the nearest approach reachable on both legs with the selected gate policy', () => {
    const graph: RouteEdge[] = [
        { from: 'start', to: 'near', kind: 'gate', directed: true, cost: 1 },
        { from: 'near', to: 'end', kind: 'walk', directed: true, cost: 1 },
        { from: 'start', to: 'through', kind: 'walk', directed: true, cost: 2 },
        { from: 'through', to: 'end', kind: 'walk', directed: true, cost: 2 },
        { from: 'start', to: 'dead-end', kind: 'walk', directed: true, cost: 1 }
    ];
    const approaches = new Map([['locker', [
        { id: 'dead-end', distance: 1 }, { id: 'near', distance: 2 }, { id: 'through', distance: 6 }
    ]]]);
    const stops = ['start', 'locker', 'end'];
    for (const [allowPaid, via] of [[true, 'near'], [false, 'through']] as const) {
        assert.deepEqual(planWalkingRoute(graph, stops, allowPaid, approaches), {
            route: ['start', via, 'end'],
            approximations: [{ requested: 'locker', via }]
        });
    }
    const closed = new Map([['locker', [{ id: 'near', distance: 2 }]]]);
    assert.deepEqual(planWalkingRoute(graph, stops, false, closed), { issue: 'gateRequired', from: 'start', to: 'locker' });
});

test('facility approaches stay on a continuous same-height walkable face and the same gate side', () => {
    const rectangle = (left: number, right: number, top: number, bottom: number) => [
        { x: left, z: top }, { x: right, z: top }, { x: right, z: bottom }, { x: left, z: bottom }
    ];
    const evidence = facilities.find(facility => facility.id === 'entry')!.evidence;
    const locker: Facility = {
        id: 'locker', name: 'Locker', kind: 'locker', level: 'concourse', x: 5, z: 5, note: '', evidence
    };
    const areas: FloorArea[] = [
        { id: 'hall', level: 'concourse', name: 'Hall', kind: 'public', outline: rectangle(0, 100, 0, 20),
            holes: [rectangle(8, 10, 4, 6)], evidence },
        { id: 'shops', level: 'concourse', name: 'Shops', kind: 'service', outline: rectangle(4, 6, 8, 10), evidence },
        { id: 'paid', level: 'concourse', name: 'Paid', kind: 'paid', outline: rectangle(0, 3, 3, 7), evidence }
    ];
    const anchors = [
        { id: 'near', level: 'concourse', x: 6, z: 5 },
        { id: 'hole', level: 'concourse', x: 12, z: 5 },
        { id: 'wall', level: 'concourse', x: 5, z: 12 },
        { id: 'gate', level: 'concourse', x: 2, z: 5 },
        { id: 'opening', level: 'concourse', x: 5, z: 0.5 },
        { id: 'raised', level: 'concourse', x: 6, z: 5, elevationOffset: 0.5 },
        { id: 'far', level: 'concourse', x: 70, z: 18 },
        { id: 'other', level: 'platform', x: 6, z: 5 }
    ] as const;
    const options = anchors.map(({ id, level }) => ({
        id, level, name: id, station: 'jr-osaka', access: id === 'gate' ? 'inside' : 'outside'
    }) as const);
    const openings = [{ connectionId: 'stairs', level: 'concourse', kind: 'stairs', outline: rectangle(4, 6, 2, 3) }] as const;
    assert.deepEqual(walkingApproaches([locker], options, anchors, areas, [], openings), [
        ['locker', [{ id: 'near', distance: 1 }]]
    ]);
});

test('the geographic map routes to a named public approach for the JR west ticket machines', () => {
    const places = walkingPlaces();
    const approaches = new Map(walkingApproaches(facilities, places, nodes, layout.areas, layout.platforms, mapOpenings));
    const result = planWalkingRoute(edges, ['entry', 'machines-west'], false, approaches);
    assert(result.route);
    assert(result.route.includes('west-entry'));
    assert.deepEqual(result.approximations, [{ requested: 'machines-west', via: 'west-entry' }]);
    assert(!approaches.has('entry'));
});

test('generated vertical facilities retain their full name and offer a compact map label', () => {
    const stairs = facilities.find(facility => facility.id === 'connection-crost-stairs-68-from');
    assert(stairs?.mapLabel);
    assert.match(stairs.name, /楼梯/);
    assert.doesNotMatch(stairs.mapLabel, /楼梯/);
    assert.match(stairs.mapLabel, /Crost.*1F.*B1/);
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
    assert.equal(model.group.children.filter(mesh => mesh instanceof T.Mesh && mesh.geometry.type === 'CylinderGeometry').length, route.length - 1);
    assert.equal(model.group.children.filter(mesh => mesh instanceof T.Mesh && mesh.geometry.type === 'SphereGeometry').length, 2);
    model.update(route, elevation, id => viewLayerRole(levels, { level: 'district-underground' }, id) === 'current', false);
    assert.equal(model.group.children.filter(mesh => mesh instanceof T.Mesh && mesh.geometry.type === 'CylinderGeometry').length, route.length - 1);
    assert(!model.group.children.some(mesh => mesh instanceof T.Mesh && mesh.geometry.type === 'SphereGeometry'));
    model.update(route, elevation, id => viewLayerRole(levels, { level: 'concourse' }, id) === 'current');
    assert.equal(model.group.children.length, 0);
});

test('short route turns keep their beam without oversized arrows', () => {
    const model = new RouteModel([
        { id: 'start', level: 'concourse', x: 0, z: 0 },
        { id: 'turn', level: 'concourse', x: 0, z: 1 },
        { id: 'end', level: 'concourse', x: 38, z: 1 }
    ]);
    model.update(['start', 'turn', 'end'], () => 0, () => true);
    const arrows = model.group.children.filter(mesh => mesh instanceof T.Mesh && mesh.geometry.type === 'ConeGeometry');
    assert.equal(arrows.length, 2);
    assert(arrows.every(arrow => arrow.position.z === 1));
});

test('escalator previews follow one modeled lane and clear its treads at maximum floor separation', () => {
    const network = walkingNetwork();
    const route = new RouteModel(network.nodes, layout.connections);
    const elevation = (id: typeof levels[number]['id']) => displayElevation(levels, id, 1.5);
    for (const id of ['bridge-p1-2', 'kitashinchi-west-escalators']) {
        const connection = layout.connections.find(item => item.id === id)!;
        const edge = network.edges.find(item => item.kind === 'escalator' &&
            [connection.from.id, connection.to.id].includes(item.from) &&
            [connection.from.id, connection.to.id].includes(item.to))!;
        const ids = [edge.from, edge.to];
        const [entry, from, to, exit] = route.path(ids);
        const lane = connectionLanes(connection).find(item => item.id === from?.escalator?.id)!;
        assert(lane && entry && from && to && exit);
        const [departure, arrival] = edge.from === lane.from.id ? [lane.from, lane.to] : [lane.to, lane.from];
        assert.deepEqual([from.x, from.z, to.x, to.z], [departure.x, departure.z, arrival.x, arrival.z]);
        assert(Math.abs(Math.hypot(entry.x - from.x, entry.z - from.z) - .8) < 1e-8);
        assert(Math.abs(Math.hypot(exit.x - to.x, exit.z - to.z) - .8) < 1e-8);

        const equipment = new VerticalConnectionModel(connection, levels, layout.platforms);
        equipment.update(elevation, 'all');
        const treads: T.Object3D[] = [];
        equipment.group.traverse(item => {
            if (item.name === 'tread-surfaces' || item.name === 'tread-edge-stripes') {
                treads.push(item);
            }
        });
        route.update(ids, elevation, () => true);
        route.group.updateMatrixWorld(true);
        const ray = new T.Raycaster(new T.Vector3(), new T.Vector3(0, -1, 0));
        const vertex = new T.Vector3();
        let treadHits = 0;
        for (const mesh of route.group.children) {
            if (!(mesh instanceof T.Mesh) || mesh.geometry.type === 'SphereGeometry') {
                continue;
            }
            const positions = mesh.geometry.getAttribute('position');
            for (let i = 0; i < positions.count; i++) {
                vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
                ray.ray.origin.set(vertex.x, 1000, vertex.z);
                const hit = ray.intersectObjects(treads, false)[0];
                if (hit) {
                    assert(vertex.y > hit.point.y, `${id} route intersects a tread`);
                    treadHits++;
                }
            }
        }
        assert(treadHits > 0);
    }
});

const routeFromCrost = planWalkingRoute(edges, ['crost68-b1', 'hanshin-umeda-route-entry'], false).route!;

test('authored transfers follow public floors and use the modeled Crost stair for the 1F/B1 transition', () => {
    const publicSurface = (areas: typeof undergroundPublicAreas) => clipping.union(areas.filter(area => !area.elevationOffset).map(area =>
        [area.outline, ...area.holes ?? []].map(ring => ring.map(({ x, z }) => [x, z])) as Polygon
    ));
    const ground = publicSurface(layout.areas.filter(area => area.level === 'concourse' && area.kind === 'public'));
    const underground = publicSurface(undergroundPublicAreas);
    const stair = layout.connections.find(connection => connection.id === 'crost-stairs-68')!;
    const lookup = new Map(nodes.map(node => [node.id, node]));
    const byLevel = new Map(levels.map(level => [level.id, level.y]));
    for (const edge of southWalking.edges) {
        const from = lookup.get(edge.from)!;
        const to = lookup.get(edge.to)!;
        assert(!edge.directed);
        const elevation = byLevel.get(from.level);
        if (edge.kind === 'stairs') {
            assert.deepEqual([from, to], [stair.from, stair.to]);
            assert.equal(elevation, 0);
            assert.equal(byLevel.get(to.level), -8);
            continue;
        }
        assert.equal(edge.kind, 'walk');
        assert.equal(byLevel.get(to.level), elevation);
        const crost = elevation === 0 || routeFromCrost.slice(0, -1).includes(from.id);
        const strip: Polygon = [passageOutline(from, to, crost ? 2.5 : 3).map(({ x, z }) => [x, z])];
        const region = elevation === 0 ? ground : underground;
        assert.equal(clipping.difference(strip, region).length, 0, `${edge.from} → ${edge.to}`);
    }
});

test('JR Central Gate connects to Hanshin and the southern transfer network via Crost', () => {
    const west = 'hanshin-umeda-route-entry';
    const session = new MapSession(edges, { nodes, levels });
    assert.deepEqual(session.previewWalkingRoute(['entry', west], false).route, ['entry', 'crost68-1', ...routeFromCrost]);
    assert.equal(session.state.level, 'all');
    assert(session.previewWalkingRoute(['entry', west, 'kitashinchi-route-entry'], false).route?.includes(west));
    for (const [from, to] of [['lower', west], [west, 'lower']] as const) {
        assert.deepEqual(session.previewWalkingRoute([from, to], false), { issue: 'gateRequired', from, to });
        assert.equal(session.state.route, null);
        const { route } = session.previewWalkingRoute([from, to], true);
        assert(route && route.includes('gate-in'));
        const gate = route.indexOf('gate-out');
        const landing = route.indexOf('crost68-1');
        assert(gate >= 0 && landing >= 0 && Math.abs(gate - landing) === 1);
    }
});

test('JR South Central Entrance uses the public gap beside the Crost openings to reach the gate', () => {
    const { route } = planWalkingRoute(edges, ['entry', 'gate-out'], false);
    assert.deepEqual(route, ['entry', 'hall-crost-side', 'gate-out']);
    const polygon = (outline: { x: number; z: number }[]): Polygon => [outline.map(({ x, z }) => [x, z])];
    const floors = clipping.union(
        polygon(layout.areas.find(area => area.id === 'central-public')!.outline),
        polygon(layout.areas.find(area => area.id === 'south-public')!.outline)
    );
    const openings = floorOpenings.filter(opening => opening.level === 'concourse');
    const obstructions = [
        ...openings,
        ...layout.areas.filter(area => area.level === 'concourse' && ['paid', 'commercial', 'service'].includes(area.kind))
    ].map(item => polygon(item.outline));
    const points = route.map(id => nodes.find(node => node.id === id)!);
    for (const [i, from] of points.slice(0, -1).entries()) {
        const strip = polygon(passageOutline(from, points[i + 1]!, 2.5));
        assert.equal(clipping.difference(strip, floors).length, 0);
        assert(obstructions.every(block => clipping.intersection(strip, block).length === 0));
    }
});

test('JR Central and West gate options land on the outside of their modeled gates', () => {
    const byFacility = new Map(walkingPlaces().map(place => [place.facilityId, place]));
    for (const id of ['gate', 'gate-central-north', 'west-gate']) {
        const place = byFacility.get(id);
        assert(place && place.access === 'outside');
        const gate = edges.find(edge => edge.kind === 'gate' && edge.from === place.id)!;
        assert(planWalkingRoute(edges, ['entry', place.id], false).route);
        assert.equal(planWalkingRoute(edges, [place.id, gate.to], false).issue, 'gateRequired');
        assert.deepEqual(planWalkingRoute(edges, [place.id, gate.to], true).route, [place.id, gate.to]);
    }
});

test('Kitashinchi to Hankyu Kyoto platform via Hanshin West uses the JR north deck and Hankyu gate', () => {
    const waypoint = 'hanshin-umeda-route-entry';
    const destination = 'hankyu-umeda-central-1-upper';
    for (const start of ['kitashinchi-west-escalators-low', 'kitashinchi-west-escalators-high']) {
        const route = planWalkingRoute(edges, [start, waypoint, destination], true).route;
        assert(route);
        for (const id of [waypoint, 'crost68-b1', 'north-48-1', 'north-48-2', 'hankyu-umeda-gate-in', destination]) {
            assert(route.includes(id), id);
        }
        assert.equal(planWalkingRoute(edges, [start, waypoint, destination], false).issue, 'gateRequired');
    }
});

test('the northern transfer follows public floors and the ascent modeled in the atrium', () => {
    const lookup = new Map(nodes.map(node => [node.id, node]));
    const rise = layout.connections.find(connection => connection.id === 'north-48')!;
    for (const edge of northWalking.edges) {
        if (edge.kind === 'escalator') {
            assert.deepEqual([edge.from, edge.to], [rise.from.id, rise.to.id]);
            assert(edge.directed);
            continue;
        }
        const from = lookup.get(edge.from)!;
        const to = lookup.get(edge.to)!;
        const floors = from.level === 'concourse' ? ['concourse'] : ['platform', 'district-north-deck', 'hankyu-hall'];
        const areas = layout.areas.filter(area => floors.includes(area.level) && !area.elevationOffset);
        const cuts = mapOpenings.filter(opening => floors.includes(opening.level));
        const dx = to.x - from.x;
        const dz = to.z - from.z;
        const length = Math.hypot(dx, dz);
        // The first 2F node is on the escalator threshold. Test the slab immediately beyond it.
        for (let distance = from.id === rise.to.id ? .25 : 0; distance <= length; distance += .25) {
            for (const offset of [-1.25, 0, 1.25]) {
                const point = {
                    x: from.x + (dx * distance - dz * offset) / length,
                    z: from.z + (dz * distance + dx * offset) / length
                };
                const overlaps = areas.filter(area => pointInPolygon(point, area.outline) &&
                    !area.holes?.some(hole => pointInPolygon(point, hole)));
                assert(overlaps.length && overlaps.every(area => area.kind === 'public') &&
                    !cuts.some(cut => pointInPolygon(point, cut.outline)), edge.from + ' → ' + edge.to);
            }
        }
    }
});

test('shipped places are authored stations with real graph nodes, and unsupported station pairs remain disconnected', () => {
    const places = walkingPlaces();
    assert.equal(new Set(places.map(place => place.station)).size, 7);
    for (const place of places) {
        assert(nodes.some(node => node.id === place.id && node.level === place.level));
        assert(edges.some(edge => edge.from === place.id || edge.to === place.id));
        if (!place.facilityId) {
            assert(place.name.startsWith(stations.find(station => station.id === place.station)!.name + ' · '));
        }
    }
    const session = new MapSession(edges);
    assert(session.previewWalkingRoute(['entry', 'hall', 'gate-out'], false).route);
    assert.equal(session.state.level, 'all');
    assert.equal(session.state.roof, false);
    assert.equal(session.previewWalkingRoute(['entry', 'destination'], false).issue, 'gateRequired');
    assert.equal(session.state.route, null);
    assert(session.previewWalkingRoute(['entry', 'destination'], true).route);
    assert.equal(session.previewWalkingRoute(['entry', 'metro-umeda-route-entry'], true).issue, 'unavailable');
    assert.equal(session.state.route, null);
});
