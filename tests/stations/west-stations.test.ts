import assert from 'node:assert/strict';
import { test } from 'node:test';
import polygonClipping from 'polygon-clipping';
import * as T from 'three';
import { connectionLanes } from '../../src/application/connections/connection-lanes.ts';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { displayElevation } from '../../src/application/exploration/display-elevation.ts';
import { planGateBoundaries } from '../../src/application/connections/gate-boundaries.ts';
import { MapSession } from '../../src/application/map-session.ts';
import { platformLocalPoint, platformPoint, pointInPolygon } from '../../src/domain/map/geometry.ts';
import { platformRail } from '../../src/domain/map/rail-geometry.ts';
import { findRoute } from '../../src/domain/navigation/find-route.ts';
import { edges, layout, levels, stations } from '../../src/infrastructure/district/geographic-map.ts';
import { kitashinchiStation } from '../../src/infrastructure/stations/kitashinchi/index.ts';
import { nishiStation } from '../../src/infrastructure/stations/nishi-umeda/index.ts';
import { VerticalConnectionModel } from '../../src/presentation/models/stations/vertical-connection-model.ts';
test(
    'Y11 north terminal and Kitashinchi through island retain their own tracks and evidence',
    () => {
        assert.equal(stations.length, 7);
        const y = nishiStation.layout.platforms[0]!;
        const k = kitashinchiStation.layout.platforms[0]!;
        assert.equal(y.terminalEnd, 'end');
        assert(y.terminal);
        assert(!k.terminal);
        for (const [i, track] of y.tracks.entries()) {
            assert([1, 2].includes(track));
            const r = platformRail(y, i);
            assert(Math.abs(platformLocalPoint(y, r.end).x - (y.length / 2 - 3)) < 1e-6);
            assert(Math.abs(platformLocalPoint(y, r.start).x + y.length / 2) < 1e-6);
        }
        for (const [s, source] of [[nishiStation, 'yotsubashi'], [kitashinchiStation, 'kitashinchi']] as const) {
            for (const item of [...s.facilities, ...s.layout.connections, ...s.layout.platforms, ...s.layout.areas]) {
                assert.equal(item.evidence.source, source);
                assert.deepEqual(item.evidence.pages, [1]);
            }
        }
    }
);
test(
    'Y11 north gate permits exit only, middle gate entry only and south gate works both ways',
    () => {
        assert.equal(planGateBoundaries(nishiStation.facilities, nishiStation.layout.areas).length, 3);
        assert(findRoute(edges, 'nishi-umeda-north-route-in', 'nishi-umeda-north-route-out', true));
        assert.equal(findRoute(edges, 'nishi-umeda-north-route-out', 'nishi-umeda-north-route-in', true), null);
        assert(findRoute(edges, 'nishi-umeda-middle-route-out', 'nishi-umeda-middle-route-in', true));
        assert.equal(findRoute(edges, 'nishi-umeda-middle-route-in', 'nishi-umeda-middle-route-out', true), null);
        assert(findRoute(edges, 'nishi-umeda-south-route-in', 'nishi-umeda-south-route-out', true));
        assert(findRoute(edges, 'nishi-umeda-south-route-out', 'nishi-umeda-south-route-in', true));
    }
);
test(
    'western stations support every landing and cut each upper flight without invalid geometry',
    () => {
        for (const s of [nishiStation, kitashinchiStation]) {
            for (const p of s.nodes) {
                assert(
                    s.layout.areas.some(a => a.level === p.level && pointInPolygon(p, a.outline)) || s.layout.platforms.some(a => {
                        const q = platformLocalPoint(a, p);
                        return a.level === p.level && Math.abs(q.x) <= a.length / 2 && Math.abs(q.z) <= a.width / 2;
                    }),
                    p.id
                );
            }
            const openings = planFloorOpenings(s.layout.connections, levels, s.layout.platforms);
            for (const c of s.layout.connections) {
                assert.equal(
                    openings.filter(o => o.connectionId === c.id && o.level === c.to.level).length,
                    connectionLanes(c).length,
                    c.id
                );
                const model = new VerticalConnectionModel(c, levels, s.layout.platforms);
                for (const explode of [0, 0.48, 1]) {
                    model.update(
                        id => displayElevation(levels, id, explode),
                        s === nishiStation ? 'y11-platform' : 'kitashinchi-platform'
                    );
                    model.group.traverse(o => {
                        if (o instanceof T.Mesh) {
                            assert(o.geometry.getAttribute('position').array.every(Number.isFinite));
                        }
                    });
                }
                if (c.platformId) {
                    for (const lane of connectionLanes(c)) {
                        const p = s.layout.platforms.find(p => p.id === c.platformId)!;
                        const q = platformLocalPoint(p, lane.from);
                        assert(Math.abs(q.z) + (c.kind === 'stairs' ? 1.4 : c.kind === 'elevator' ? 1.75 : 1.15) < p.width / 2);
                    }
                }
            }
        }
    }
);
test(
    'Kitashinchi east/west gates, paired escalators and both local previews integrate with B1 focus',
    () => {
        assert.equal(planGateBoundaries(kitashinchiStation.facilities, kitashinchiStation.layout.areas).length, 2);
        assert.equal(kitashinchiStation.layout.connections.filter(c => c.lanes === 2).length, 2);
        for (const [s, level] of [[nishiStation, 'y11-hall'], [kitashinchiStation, 'kitashinchi-hall']] as const) {
            const session = new MapSession(edges);
            session.focusStation(s.id);
            assert.equal(session.state.level, level);
            const route = findRoute(edges, `${s.id}-route-entry`, `${s.id}-destination`, true);
            assert(route && route.every(id => id.startsWith(s.id)));
        }
        assert.equal(findRoute(edges, 'nishi-umeda-route-entry', 'kitashinchi-destination', true), null);
        const hydraulic = nishiStation.layout.connections.find(c => c.id === 'nishi-umeda-hydraulic-lift')!;
        assert.equal(hydraulic.from.level, hydraulic.to.level);
        assert.equal(hydraulic.to.elevationOffset, 1.2);
    }
);
test(
    'western station interiors do not intersect neighbouring stations at the same physical height',
    () => {
        const ring = (ps: {
            x: number;
            z: number;
        }[]) => [ps.map(p => [p.x, p.z] as [
            number,
            number
        ])];
        for (const station of [nishiStation, kitashinchiStation]) {
            for (const a of station.layout.areas.filter(a => a.kind === 'paid')) {
                for (const other of layout.areas.filter(b => b.kind === 'paid' &&
                    levels.find(l => l.id === b.level)!.station !== station.id && levels.find(l => l.id === b.level)!.y === levels.find(l => l.id === a.level)!.y)) {
                    assert.equal(
                        polygonClipping.intersection(ring(a.outline), ring(other.outline)).length,
                        0,
                        `${a.id} intersects ${other.id}`
                    );
                }
            }
            const platformRing = (p: typeof layout.platforms[number]) => ring([
                platformPoint(p, -p.length / 2, -p.width / 2),
                platformPoint(p, p.length / 2, -p.width / 2),
                platformPoint(p, p.length / 2, p.width / 2),
                platformPoint(p, -p.length / 2, p.width / 2)
            ]);
            for (const p of station.layout.platforms) {
                for (const other of layout.platforms.filter(q => levels.find(l => l.id === q.level)!.station !== station.id && levels.find(l => l.id === q.level)!.y === levels.find(l => l.id === p.level)!.y)) {
                    assert.equal(polygonClipping.intersection(platformRing(p), platformRing(other)).length, 0);
                }
            }
        }
    }
);
test(
    'Kitashinchi platform escalators remain local rather than spanning a quarter of the station',
    () => {
        const station = kitashinchiStation;
        const p = station.layout.platforms[0]!;
        for (const c of station.layout.connections.filter(c => c.kind === 'escalator' && c.platformId === p.id)) {
            assert(Math.hypot(c.to.x - c.from.x, c.to.z - c.from.z) <= 12.01);
            assert(Math.hypot(c.to.x - c.from.x, c.to.z - c.from.z) < p.length * 0.15);
        }
        const session = new MapSession([]);
        assert.equal(session.state.explode, 0);
        session.state.explode = 0.8;
        session.reset();
        assert.equal(session.state.explode, 0);
    }
);
