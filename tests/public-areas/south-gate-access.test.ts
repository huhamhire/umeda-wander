import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { connectionLanes } from '../../src/application/connections/connection-lanes.ts';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { planAtriumOpenings } from '../../src/application/connections/atrium-openings.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { buildGeographicBuilding } from '../../src/presentation/models/buildings/geographic-building-model.ts';
import { exteriorOpenings, layout, levels } from '../../src/infrastructure/district/geographic-map.ts';
import { buildFloorGeometry } from '../../src/presentation/models/floor-geometry.ts';
import { createWalkingNetwork } from '../../src/infrastructure/district/walking-network.ts';
import { planWalkingRoute } from '../../src/application/navigation/walking-route.ts';
import { jrAxisPoint } from '../../src/infrastructure/stations/jr-osaka/ground-frame.ts';

test('Daimaru public approaches stay continuous through the building on 1F, 2F and 3F', () => {
    const building = geographicBuildings.find(b => b.id === 'daimaru')!;
    const e = building.entrance!;
    const c = Math.cos(e.angle);
    const s = Math.sin(e.angle);
    const point = (u: number, v: number) => ({ x: e.center.x + u * c - v * s, z: e.center.z + u * s + v * c });
    const cuts = planFloorOpenings(layout.connections, levels, layout.platforms);
    const model = buildGeographicBuilding(building, exteriorOpenings);
    model.updateMatrixWorld(true);
    for (const [level, height, along, across] of [
        ['concourse', 1.3, [-4.2, -6.7], [-59, -12]],
        ['south-deck', 4, [0, 0], [-33, -8]],
        ['south-deck', 4, [-23, 23], [-15, -15]],
        ['platform', 8, [0, 0], [-60, -22]]
    ] as const) {
        for (let i = 0; i <= 40; i++) {
            const t = i / 40;
            const p = point(along[0] + (along[1] - along[0]) * t, across[0] + (across[1] - across[0]) * t);
            assert(layout.areas.some(area => area.level === level && area.kind === 'public' &&
                levels.find(l => l.id === area.level)!.y + (area.elevationOffset ?? 0) === height && pointInPolygon(p, area.outline)));
            assert(!cuts.some(cut => cut.level === level && pointInPolygon(p, cut.outline)));
        }
        const from = point(along[0], across[0]);
        const to = point(along[1], across[1]);
        const delta = new T.Vector3(to.x - from.x, 0, to.z - from.z);
        const ray = new T.Raycaster(new T.Vector3(from.x, height + 1.5, from.z), delta.clone().normalize(), 0, delta.length());
        assert.equal(ray.intersectObject(model, true).length, 0, level + ' facade blocks the route');
    }
    const bridgeStart = jrAxisPoint(-12, 46.6);
    const fourthFloor = jrAxisPoint(13, 75);
    const throughPortal = new T.Vector3(fourthFloor.x - bridgeStart.x, 0, fourthFloor.z - bridgeStart.z);
    const bridgeY = levels.find(l => l.id === 'bridge')!.y;
    const bridgeRay = new T.Raycaster(
        new T.Vector3(bridgeStart.x, bridgeY + 1.5, bridgeStart.z), throughPortal.clone().normalize(), 0, throughPortal.length()
    );
    assert.equal(bridgeRay.intersectObject(model, true).length, 0, 'Daimaru shell closes the level route to building 4F');
});

test('Daimaru public entrances connect through the South Gate stair and lift without crossing JR gates', () => {
    const network = createWalkingNetwork();
    const approaches = new Map(network.approaches);
    const ground = 'daimaru-entry';
    const upper = 'south-building-3f-entry';
    const buildingStops = ['south-lift-u-lower', 'south-lift-u-upper', 'south-building-stairs-50-low', 'south-building-stairs-50-high'];
    const byId = new Map(network.nodes.map(node => [node.id, node]));
    const { center, angle } = geographicBuildings.find(b => b.id === 'daimaru')!.entrance!;
    for (const [from, to, stops] of [[ground, upper, buildingStops], [upper, ground, [...buildingStops].reverse()]] as const) {
        const result = planWalkingRoute(network.edges, [from, to], false, approaches, network.shapeLeg);
        assert(result.route);
        assert.deepEqual(result.approximations, []);
        assert.deepEqual(result.route.filter(id => !id.startsWith('walk:')), stops);
        const plazaDepths = result.route.map(id => byId.get(id)!).filter(node => node.level === 'concourse').map(node =>
            (node.z - center.z) * Math.cos(angle) - (node.x - center.x) * Math.sin(angle)
        );
        assert(plazaDepths.every(depth => depth <= -9.99), 'the 1F path should not overshoot the lift lobby toward the plaza');
    }
    const fromBridge = planWalkingRoute(network.edges, ['south-bridge-access', ground], false, approaches, network.shapeLeg);
    assert(fromBridge.route);
    assert.deepEqual(fromBridge.route.filter(id => !id.startsWith('walk:')), [
        'south-stairs-16-upper', 'south-stairs-16-lower', ...buildingStops.slice().reverse()
    ]);
    assert.deepEqual(fromBridge.approximations, []);
    assert(network.edges.some(edge => edge.from === 'south-plaza-stairs-74-low' && edge.to === 'south-plaza-stairs-74-high'));
});

test(
    'South Gate banks 61 and 62 retain separate 1F and B1 landings and open the overlapping slabs',
    () => {
        const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
        for (const [id, bottom] of [['south-building-61', 'concourse'], ['south-entrance-east-escalators', 'underground-hall']] as const) {
            const bank = layout.connections.find(c => c.id === id)!;
            assert.equal(bank.lanes, 2);
            assert.equal(bank.from.level, bottom);
            assert.equal(bank.to.level, 'south-deck');
            const deck = layout.areas.find(a => a.id === 'south-entrance-deck')!;
            assert.ok(pointInPolygon(bank.to, deck.outline), id + ' misses the upper deck');
            for (const lane of connectionLanes(bank)) {
                const p = { x: lane.to.x + (lane.from.x - lane.to.x) * .25, z: lane.to.z + (lane.from.z - lane.to.z) * .25 };
                const floors = layout.areas.filter(a => levels.find(l => l.id === a.level)!.y === 4 &&
                    pointInPolygon(p, a.outline) && !a.holes?.some(h => pointInPolygon(p, h)));
                assert.ok(floors.length, id + ' missing 2F landing surface');
                for (const area of floors) {
                    const cuts = openings.filter(o => o.level === area.level);
                    assert.ok(cuts.some(o => o.connectionId === id && pointInPolygon(p, o.outline)));
                    const geometry = buildFloorGeometry(area.outline, [...area.holes ?? [], ...cuts.map(o => o.outline)], .55);
                    const material = new T.MeshBasicMaterial({ side: T.DoubleSide });
                    const floor = new T.Mesh(geometry, material);
                    floor.updateMatrixWorld();
                    const ray = new T.Raycaster(new T.Vector3(p.x, 5, p.z), new T.Vector3(0, -1, 0));
                    assert.equal(ray.intersectObject(floor).length, 0, id + ' sealed by ' + area.id);
                    geometry.dispose();
                    material.dispose();
                }
            }
        }
        const direct = layout.connections.find(c => c.id === 'south-entrance-east-escalators')!;
        const ground = layout.areas.find(a => a.id === 'south-entrance-ground')!;
        const y = ground.elevationOffset!;
        const cuts = [...openings, ...planAtriumOpenings(layout.atria)].filter(cut => cut.level === ground.level);
        for (const lane of connectionLanes(direct)) {
            assert(layout.areas.some(a => a.blockId === 'crost-b1' && a.kind === 'public' && pointInPolygon(lane.from, a.outline)));
            const toY = levels.find(l => l.id === lane.to.level)!.y;
            const fromY = levels.find(l => l.id === lane.from.level)!.y;
            const t = (y - fromY) / (toY - fromY);
            const p = { x: lane.from.x + (lane.to.x - lane.from.x) * t, z: lane.from.z + (lane.to.z - lane.from.z) * t };
            assert(pointInPolygon(p, ground.outline));
            assert(cuts.some(cut => pointInPolygon(p, cut.outline)), 'raised 1F plaza closes the through flight');
        }
    }
);

test(
    'South Gate portal remains open below its sign',
    () => {
        const b = geographicBuildings.find(b => b.id === 'daimaru')!;
        const e = b.entrance!;
        const c = Math.cos(e.angle);
        const s = Math.sin(e.angle);
        const model = buildGeographicBuilding(b);
        model.updateMatrixWorld(true);
        const start = new T.Vector3(e.center.x + c * 5 - s * 8, 8, e.center.z + s * 5 + c * 8);
        const ray = new T.Raycaster(start, new T.Vector3(s, 0, -c), 0, 18);
        assert.equal(ray.intersectObject(model, true).length, 0, 'solid facade closes the portal');
    }
);
