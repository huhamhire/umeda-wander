import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { displayElevation } from '../../src/application/exploration/display-elevation.ts';
import { planGateBoundaries } from '../../src/application/connections/gate-boundaries.ts';
import { viewLayerRole } from '../../src/application/exploration/view-layer.ts';
import { platformLocalPoint, platformPoint, pointInPolygon } from '../../src/domain/map/geometry.ts';
import { findRoute } from '../../src/domain/navigation/find-route.ts';
import { edges, facilities, layout, levels, nodes } from '../../src/infrastructure/district/geographic-map.ts';
import { hankyuStation } from '../../src/infrastructure/stations/hankyu-umeda/index.ts';
import * as jr from '../../src/infrastructure/stations/jr-osaka/layout.ts';
import { metroStation } from '../../src/infrastructure/stations/metro-umeda/index.ts';
import { buildFloorGeometry } from '../../src/presentation/models/floor-geometry.ts';
import { VerticalConnectionModel } from '../../src/presentation/models/stations/vertical-connection-model.ts';
test(
    'station entities and source identities stay separate and unique',
    () => {
        for (const items of [
            levels,
            facilities,
            nodes,
            layout.areas,
            layout.platforms,
            layout.connections
        ]) {
            assert.equal(new Set(items.map(x => x.id)).size, items.length);
        }
        for (const station of [hankyuStation, metroStation]) {
            for (const item of [...station.facilities, ...station.layout.areas, ...station.layout.platforms]) {
                assert.equal(levels.find(l => l.id === item.level)!.station, station.id);
                assert.equal(item.evidence.source, station.id === 'hankyu-umeda' ? 'hankyu' : 'metro');
            }
        }
    }
);
test(
    'adding stations preserves JR expansion and each station retains its own lower floors',
    () => {
        for (const explode of [0, 0.48, 1]) {
            for (const l of jr.levels) {
                assert.equal(displayElevation(levels, l.id, explode), displayElevation(jr.levels, l.id, explode));
            }
        }
        assert.equal(
            viewLayerRole(levels, { focusStation: 'metro-umeda', level: 'all' }, 'underground-platform'),
            'normal'
        );
        assert.equal(viewLayerRole(levels, { level: 'metro-hall' }, 'mezzanine'), 'hidden');
        assert.equal(
            viewLayerRole(levels, { focusStation: 'metro-umeda', level: 'metro-hall' }, 'metro-platform'),
            'context'
        );
        assert.equal(
            viewLayerRole(levels, { focusStation: 'hankyu-umeda', level: 'hankyu-hall' }, 'hankyu-platform'),
            'hidden'
        );
        assert.equal(viewLayerRole(levels, { level: 'all' }, 'hankyu-platform'), 'normal');
    }
);
test(
    'Hankyu has nine numbered terminal tracks and a separate outer platform strip',
    () => {
        const ps = hankyuStation.layout.platforms;
        assert.equal(ps.length, 10);
        assert.deepEqual(
            ps.flatMap(p => p.tracks),
            [
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8,
                9
            ]
        );
        assert(ps.every(p => p.terminal));
        assert.deepEqual(
            ps.filter(p => p.tracks.length).map(p => p.lineName),
            [
                '京都线',
                '京都线',
                '京都线',
                '宝冢线',
                '宝冢线',
                '宝冢线',
                '神户线',
                '神户线',
                '神户线'
            ]
        );
        assert.equal(metroStation.layout.platforms.length, 1);
        assert.deepEqual(metroStation.layout.platforms[0]!.tracks, [1, 2]);
    }
);
test(
    'all new connection landings and route nodes have supporting station geometry',
    () => {
        for (const station of [hankyuStation, metroStation]) {
            for (const p of [...station.nodes, ...station.layout.connections.flatMap(c => [c.from, c.to])]) {
                const supported = station.layout.areas.some(a => a.level === p.level && pointInPolygon(p, a.outline)) || station.layout.platforms.some(a => {
                    const local = platformLocalPoint(a, p);
                    return a.level === p.level && Math.abs(local.x) <= a.length / 2 + 1e-6 && Math.abs(local.z) <= a.width / 2 + 1e-6;
                });
                assert(supported, `${p.id}: missing landing support`);
            }
        }
    }
);
test(
    'all station gates match a paid boundary and openings stay with their owning station',
    () => {
        assert.equal(
            planGateBoundaries(facilities, layout.areas).length,
            facilities.filter(f => f.kind === 'gate').length
        );
        const cuts = planFloorOpenings(layout.connections, levels, layout.platforms);
        for (const cut of cuts) {
            const c = layout.connections.find(c => c.id === cut.connectionId)!;
            const owner = levels.find(l => l.id === c.from.level)!.station;
            const target = levels.find(l => l.id === cut.level)!;
            if (target.station !== owner) {
                assert.ok(
                    c.blockId || !target.station && target.id.startsWith('district-'),
                    'cross-owner cuts require a declared public owner'
                );
            }
        }
    }
);
test(
    'new station geometry and equipment remain finite while expanding',
    () => {
        const cuts = planFloorOpenings(layout.connections, levels, layout.platforms);
        for (const station of [hankyuStation, metroStation]) {
            const surfaces = [
                ...station.layout.areas,
                ...station.layout.platforms.map(p => ({
                    level: p.level,
                    outline: [
                        platformPoint(p, -p.length / 2, -p.width / 2),
                        platformPoint(p, p.length / 2, -p.width / 2),
                        platformPoint(p, p.length / 2, p.width / 2),
                        platformPoint(p, -p.length / 2, p.width / 2)
                    ]
                }))
            ];
            for (const s of surfaces) {
                const geometry = buildFloorGeometry(s.outline, cuts.filter(c => c.level === s.level).map(c => c.outline), 0.55);
                assert(geometry.getAttribute('position'));
                assert([...geometry.getAttribute('position').array].every(Number.isFinite));
                geometry.dispose();
            }
            for (const c of station.layout.connections) {
                const model = new VerticalConnectionModel(c, levels, layout.platforms);
                for (const explode of [0, 0.48, 1]) {
                    model.update(id => displayElevation(levels, id, explode), 'all');
                    model.group.traverse(o => {
                        assert(o.matrixWorld.elements.every(Number.isFinite));
                        if (o instanceof T.InstancedMesh) {
                            assert([...o.instanceMatrix.array].every(Number.isFinite));
                        }
                    });
                }
            }
        }
    }
);
test(
    'new station previews cross their own gates without inventing a JR transfer',
    () => {
        for (const station of [hankyuStation, metroStation]) {
            const start = `${station.id}-route-entry`;
            const end = `${station.id}-destination`;
            const path = findRoute(edges, start, end, true);
            assert(path && path.length > 5);
            assert.equal(findRoute(edges, start, end, false), null);
            assert.equal(
                findRoute(edges, 'entry', end, true),
                null,
                'cross-station interfaces remain unconnected until calibrated'
            );
        }
    }
);
