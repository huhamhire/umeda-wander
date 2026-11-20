import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { connectionLanes } from '../../src/application/connections/connection-lanes.ts';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { displayElevation } from '../../src/application/exploration/display-elevation.ts';
import { planGateBoundaries } from '../../src/application/connections/gate-boundaries.ts';
import { MapSession } from '../../src/application/map-session.ts';
import { platformLocalPoint, pointInPolygon } from '../../src/domain/map/geometry.ts';
import { platformRail } from '../../src/domain/map/rail-geometry.ts';
import { findRoute } from '../../src/domain/navigation/find-route.ts';
import { districtPlacements } from '../../src/infrastructure/district-placement.ts';
import { edges, facilities, layout, levels, stations } from '../../src/infrastructure/district/geographic-map.ts';
import { higashiStation } from '../../src/infrastructure/stations/higashi-umeda/index.ts';
import { VerticalConnectionModel } from '../../src/presentation/models/stations/vertical-connection-model.ts';
test(
    'T20 has two side platforms with tracks between them and four independent gate boundaries',
    () => {
        assert(stations.some(s => s.id === 'higashi-umeda'));
        const ps = higashiStation.layout.platforms;
        assert.equal(ps.length, 2);
        assert.deepEqual(ps.flatMap(p => p.tracks), [1, 2]);
        for (const p of ps) {
            assert.equal(p.tracks.length, 1);
            assert.equal(p.screenDoors, 'half-height');
            const r = platformRail(p, 0);
            assert(Math.abs(platformLocalPoint(p, r.start).z) > p.width / 2);
            assert(
                Math.hypot(
                    (r.start.x + r.end.x) / 2 - districtPlacements.higashi.origin.x,
                    (r.start.z + r.end.z) / 2 - districtPlacements.higashi.origin.z
                ) < 3,
                'rail must be on the inward platform edge'
            );
        }
        assert.equal(planGateBoundaries(higashiStation.facilities, higashiStation.layout.areas).length, 4);
        assert.equal(higashiStation.facilities.filter(f => f.kind === 'gate').length, 4);
        assert(higashiStation.facilities.every(f => f.evidence.source === 'tanimachi' && f.evidence.pages[0] === 1));
    }
);
test('T20 exit 8 stays underground while roofed exit 9 turns back to reach the street', () => {
    for (const suffix of ['stairs', 'escalator']) {
        const bank = layout.connections.find(c => c.id === 'higashi-umeda-exit-8-' + suffix)!;
        assert.equal(bank.from.level, 't20-hall');
        assert.equal(bank.to.level, 't20-hall');
        assert(bank.to.elevationOffset! > 0);
    }
    assert(!layout.areas.some(a => a.id === 'higashi-umeda-exit-8-ground'));
    const lower = layout.connections.find(c => c.id === 'higashi-umeda-exit-9-lower-stairs')!;
    const upper = layout.connections.find(c => c.id === 'higashi-umeda-exit-9-stairs')!;
    assert(lower.to.x < lower.from.x && upper.to.x > upper.from.x);
    assert.equal(lower.to.elevationOffset, upper.from.elevationOffset);
    assert.equal(upper.to.level, 't20-ground');
    assert(Math.hypot(upper.to.x - 754.464, upper.to.z - 855.606) < .01);
    assert(layout.canopies.some(c => c.id === 'higashi-umeda-exit-9-canopy'));
    for (const bank of [lower, upper]) {
        const stops = [bank.from.id, bank.to.id];
        assert(!edges.some(edge => stops.includes(edge.from) || stops.includes(edge.to)));
    }
});

test('T20 exits 1 and 3 connect to the underground mall without opening street slabs', () => {
    assert(!layout.connections.some(c => c.id === 'higashi-umeda-exit-1-stairs'));
    assert(!layout.areas.some(a => a.id === 'higashi-umeda-exit-1-ground' || a.id === 'higashi-umeda-exit-3-ground'));
    const stair = layout.connections.find(c => c.id === 'higashi-umeda-exit-3-stairs')!;
    assert.equal(stair.from.level, 't20-hall');
    assert.equal(stair.to.level, 't20-hall');
    assert(stair.to.elevationOffset! > 0);
    assert(planFloorOpenings([stair], levels, []).every(o => levels.find(l => l.id === o.level)!.y < 0));
    assert(facilities.filter(f => /higashi-umeda-exit-[13]$/.test(f.id)).every(f => f.level === 't20-hall'));
});

test('T20 exits 2 and 4 have separate public shafts and retained street openings', () => {
    const lift2 = layout.connections.find(c => c.id === 'higashi-umeda-exit-2-lift')!;
    const lift4 = layout.connections.find(c => c.id === 'higashi-umeda-street-lift')!;
    const stair4 = layout.connections.find(c => c.id === 'higashi-umeda-exit-4-stairs')!;
    assert(layout.connections.some(c => c.id === 'higashi-umeda-exit-2-escalator'));
    assert(Math.hypot(lift2.to.x - 791.233, lift2.to.z - 733.3205) < .002);
    assert(Math.hypot(stair4.to.x - 810.945, stair4.to.z - 801.448) < .002);
    assert(Math.hypot(lift2.to.x - lift4.to.x, lift2.to.z - lift4.to.z) > 30);
    for (const lift of [lift2, lift4]) {
        assert.equal(lift.from.x, lift.to.x);
        assert.equal(lift.from.z, lift.to.z);
        const openings = planFloorOpenings([lift], levels, []);
        assert(openings.some(o => o.level === 'district-underground'));
        assert(openings.some(o => o.level === 't20-ground'));
        assert(facilities.some(f => f.id === 'connection-' + lift.id + '-to'));
    }
});
test(
    'T20 landing nodes are supported, vertical equipment follows each platform and upper openings include every flight',
    () => {
        const { areas, platforms, connections } = higashiStation.layout;
        for (const p of higashiStation.nodes) {
            assert(
                areas.some(a => a.level === p.level && pointInPolygon(p, a.outline)) || platforms.some(a => {
                    const q = platformLocalPoint(a, p);
                    return a.level === p.level && Math.abs(q.x) <= a.length / 2 && Math.abs(q.z) <= a.width / 2;
                }),
                `${p.id}: unsupported landing`
            );
        }
        const cuts = planFloorOpenings(connections, levels, platforms);
        for (const c of connections) {
            assert.equal(
                cuts.filter(o => o.connectionId === c.id && o.level === c.to.level).length,
                connectionLanes(c).length
            );
            if (c.platformId) {
                const p = platforms.find(p => p.id === c.platformId)!;
                const a = platformLocalPoint(p, c.from);
                const b = platformLocalPoint(p, c.to);
                assert(Math.abs(a.z - b.z) < 1e-6);
                for (const cut of cuts.filter(o => o.connectionId === c.id && o.level === 't20-hall')) {
                    for (const p of cut.outline) {
                        assert(
                            areas.some(a => a.level === 't20-hall' && a.kind === 'paid' && pointInPolygon(p, a.outline)),
                            'paid equipment opening must not spill across the gate fence'
                        );
                    }
                }
            }
            const model = new VerticalConnectionModel(c, levels, platforms);
            for (const explode of [0, 0.48, 1]) {
                model.update(id => displayElevation(levels, id, explode), 't20-platform');
                assert.equal(model.group.visible, c.from.level === 't20-platform');
                model.group.traverse(o => {
                    if (o instanceof T.Mesh) {
                        assert(o.geometry.getAttribute('position').array.every(Number.isFinite));
                    }
                });
            }
        }
    }
);
test(
    'T20 platform lifts serve the south and central-west gates; source exits remain separately selectable',
    () => {
        const lifts = higashiStation.layout.connections.filter(c => c.platformId && c.kind === 'elevator');
        assert.deepEqual(lifts.map(c => c.platformId), ['higashi-umeda-platform-1', 'higashi-umeda-platform-2']);
        assert(lifts[0]!.id.includes('south'));
        assert(lifts[1]!.id.includes('middle-west'));
        for (const number of [
            1,
            2,
            3,
            4,
            6,
            7,
            8,
            9
        ]) {
            assert(facilities.some(f => f.id === `higashi-umeda-exit-${number}`));
        }
        assert(!facilities.some(f => f.id === 'higashi-umeda-exit-5'));
        const session = new MapSession(edges);
        session.focusStation('higashi-umeda');
        assert.equal(session.state.level, 't20-hall');
        const route = findRoute(edges, 'higashi-umeda-route-entry', 'higashi-umeda-destination', true)!;
        assert(route?.every(id => id.startsWith('higashi-umeda')));
        assert.equal(findRoute(edges, 'higashi-umeda-route-entry', 'metro-umeda-destination', true), null);
    }
);
