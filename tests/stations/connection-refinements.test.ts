import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { connectionLanes, escalatorOverallWidth } from '../../src/application/connection-lanes.ts';
import { elevatorShaftWidth, planFloorOpenings } from '../../src/application/connection-openings.ts';
import { displayElevation } from '../../src/application/display-elevation.ts';
import { platformLocalPoint, platformPoint, pointInPolygon } from '../../src/domain/map/geometry.ts';
import { layout as districtLayout } from '../../src/infrastructure/district/geographic-map.ts';
import { areas, connections, facilities, levels, platforms } from '../../src/infrastructure/stations/jr-osaka/layout.ts';
import { advanceExplode } from '../../src/presentation/explode-transition.ts';
import { buildFloorGeometry } from '../../src/presentation/floor-geometry.ts';
import { VerticalConnectionModel } from '../../src/presentation/vertical-connection-model.ts';
test(
    'narrowed underground platforms retain full-width stairs and elevator landing clearance',
    () => {
        for (const platform of districtLayout.platforms.filter(p => ['underground-platform', 'metro-platform'].includes(p.level))) {
            for (const c of districtLayout.connections.filter(c => c.platformId === platform.id)) {
                for (const end of [c.from, c.to]) {
                    if (end.level !== platform.level) {
                        continue;
                    }
                    const local = platformLocalPoint(platform, end);
                    const halfWidth = c.kind === 'elevator' ? elevatorShaftWidth / 2 : c.kind === 'stairs' ? (c.width ?? 3.4) / 2 : escalatorOverallWidth / 2;
                    assert(
                        Math.abs(local.z) + halfWidth <= platform.width / 2 - 0.2,
                        `${c.id}: equipment reaches the platform edge`
                    );
                }
            }
        }
    }
);
test(
    'slider input reaches each latest target in one frame without trailing animation',
    () => {
        let current = 0.48;
        for (const target of [
            0.5,
            0.8,
            0.3,
            0,
            1,
            0.48
        ]) {
            const step = advanceExplode(current, target, true, false);
            assert.equal(step.value, target);
            assert.equal(step.animate, false);
            current = step.value;
        }
        assert(advanceExplode(0.48, 0.78, false, false).animate, 'presets retain easing');
        assert.deepEqual(advanceExplode(0.48, 0.78, false, true), { value: 0.78, animate: false });
    }
);
test(
    'stationary connections reuse geometry, but changing floor height updates it',
    () => {
        const model = new VerticalConnectionModel(connections.find(c => c.id === 'central-34')!, levels, platforms);
        model.update(id => displayElevation(levels, id, 0.48), 'concourse');
        const tread = model.group.getObjectByName('tread-surfaces') as T.InstancedMesh;
        const version = tread.instanceMatrix.version;
        model.update(id => displayElevation(levels, id, 0.48), 'concourse');
        assert.equal(tread.instanceMatrix.version, version);
        model.update(id => displayElevation(levels, id, 0.8), 'concourse');
        assert(tread.instanceMatrix.version > version);
    }
);
test(
    'Umekita elevators sit between opposing escalator banks without intersecting ramps',
    () => {
        for (const [northId, liftId, southId] of [['umekita-94', 'umekita-ad', 'umekita-95'], ['umekita-96', 'umekita-ae', 'umekita-97']]) {
            const north = connections.find(c => c.id === northId)!;
            const lift = connections.find(c => c.id === liftId)!;
            const south = connections.find(c => c.id === southId)!;
            const platform = platforms.find(p => p.id === lift.platformId)!;
            const n = platformLocalPoint(platform, north.from);
            const l = platformLocalPoint(platform, lift.from);
            const s = platformLocalPoint(platform, south.from);
            assert((l.x - n.x) * (l.x - s.x) < 0, 'elevator between hall landings');
            assert(Math.abs(n.z - l.z) < 1e-6 && Math.abs(s.z - l.z) < 1e-6, 'same platform access column');
            const nd = new T.Vector2(north.to.x - north.from.x, north.to.z - north.from.z).normalize();
            const sd = new T.Vector2(south.to.x - south.from.x, south.to.z - south.from.z).normalize();
            assert(nd.dot(sd) < -0.9999, 'northern and southern banks descend in opposite directions');
            for (const ramp of [north, south]) {
                const a = platformLocalPoint(platform, ramp.from);
                const b = platformLocalPoint(platform, ramp.to);
                const distance = Math.min(Math.abs(l.x - a.x), Math.abs(l.x - b.x));
                assert(distance > 4, 'ramps remain clear of the central shaft');
            }
        }
    }
);
test(
    'bridge ticket machines back onto a wall and face the public passage',
    () => {
        const bank = facilities.find(f => f.id === 'machines-bridge')!;
        const wall = areas.find(a => a.id === 'bridge-ticket-wall')!;
        const angle = bank.rotationRad!;
        const rear = { x: bank.x + 0.6 * Math.sin(angle), z: bank.z - 0.6 * Math.cos(angle) };
        const front = { x: bank.x - 1.5 * Math.sin(angle), z: bank.z + 1.5 * Math.cos(angle) };
        assert(pointInPolygon(rear, wall.outline), 'wall immediately behind the cabinets');
        assert(
            pointInPolygon(front, areas.find(a => a.id === 'bridge-public')!.outline),
            'clear public space at the screens'
        );
        assert((wall.height ?? 0) > 3.2);
    }
);
test(
    'full escalator geometry survives every focused layer without zero-scale teeth',
    () => {
        for (const c of connections.filter(c => c.kind === 'escalator')) {
            const model = new VerticalConnectionModel(c, levels, platforms);
            for (const explode of [0, 0.5, 1]) {
                for (const focus of levels) {
                    model.update(id => displayElevation(levels, id, explode), focus.id);
                    if (!model.group.visible) {
                        continue;
                    }
                    model.group.traverse(o => {
                        if (o.name === 'upper-landing') {
                            assert(o.visible, c.id);
                        }
                        if (!(o instanceof T.InstancedMesh)) {
                            return;
                        }
                        assert(o.count > 0);
                        const matrix = new T.Matrix4();
                        for (let i = 0; i < o.count; i++) {
                            o.getMatrixAt(i, matrix);
                            assert(matrix.elements.every(Number.isFinite), c.id);
                            assert(Math.abs(matrix.determinant()) > 1e-8, `${c.id}: collapsed tread`);
                        }
                    });
                }
            }
        }
    }
);
test(
    'Central stairs use the corrected platform axis and Midosuji ascent faces the opposite way',
    () => {
        for (const id of ['central-stairs-52', 'central-53', 'central-stairs-54']) {
            const c = connections.find(c => c.id === id)!;
            assert.equal(c.from.z, c.to.z);
            assert(c.to.x > c.from.x, id);
        }
        assert(connections.find(c => c.id === 'central-34')!.to.x > connections.find(c => c.id === 'central-34')!.from.x);
        for (const c of connections.filter(c => c.id.startsWith('midosuji-'))) {
            assert(c.to.x < c.from.x, c.id);
        }
    }
);
test(
    'double escalators have two complete side-by-side models and matching platform clearance',
    () => {
        for (const id of [36, 38, 40, 42]) {
            const c = connections.find(c => c.id === `midosuji-${id}`)!;
            assert.equal(c.lanes, 2);
            const lanes = connectionLanes(c);
            const model = new VerticalConnectionModel(c, levels, platforms);
            model.update(id => displayElevation(levels, id, 0.5), 'concourse');
            assert.equal(model.group.children.length, 2);
            assert.equal(lanes.length, 2);
            const platform = platforms.find(p => p.id === c.platformId)!;
            for (const lane of lanes) {
                const local = platformLocalPoint(platform, lane.to);
                assert(Math.abs(local.z) + escalatorOverallWidth / 2 < platform.width / 2);
            }
            assert(Math.hypot(lanes[0]!.to.x - lanes[1]!.to.x, lanes[0]!.to.z - lanes[1]!.to.z) > escalatorOverallWidth);
        }
    }
);
test(
    'West escalators have shorter runs and land near the extended platform ends',
    () => {
        for (const c of connections.filter(c => c.id.startsWith('west-p'))) {
            const platform = platforms.find(p => p.id === c.platformId)!;
            const local = platformLocalPoint(platform, c.to);
            assert(platform.length >= 159);
            assert(local.x + platform.length / 2 < 16, 'West bank stays close to the western end');
            const run = Math.hypot(c.to.x - c.from.x, c.to.z - c.from.z);
            assert(run >= 8 && run <= 10);
            assert(8 / run > 0.75, 'compact physical slope before visual layer expansion');
        }
    }
);
test(
    'Umekita northern escalators and both connecting walkway lifts have shafts and cuts',
    () => {
        const cuts = planFloorOpenings(connections, levels, platforms);
        for (const id of ['umekita-94', 'umekita-96', 'walkway-ab', 'walkway-ac']) {
            const c = connections.find(c => c.id === id)!;
            const model = new VerticalConnectionModel(c, levels, platforms);
            model.update(id => displayElevation(levels, id, 0), 'all');
            assert(model.group.visible);
            assert(cuts.some(o => o.connectionId === id));
            if (c.kind === 'elevator') {
                assert(!c.platformId, 'corridor lifts use corridor references');
                assert(model.group.getObjectByName('transparent-elevator-shaft'));
                assert(model.group.getObjectByName('elevator-cabin'));
                const door = new T.Vector3(0, 0, 1).transformDirection(model.group.matrixWorld);
                assert(door.dot(new T.Vector3(Math.cos(c.doorFacingRad!), 0, Math.sin(c.doorFacingRad!))) > 0.9999);
                assert(cuts.filter(o => o.connectionId === id).length >= 2);
            }
        }
    }
);
test(
    'every escalator well removes triangles from all overlapping slabs at its crossing',
    () => {
        const cuts = planFloorOpenings(connections, levels, platforms);
        const floors = [
            ...areas.map(a => ({ level: a.level, outline: a.outline })),
            ...platforms.map(p => ({
                level: p.level,
                outline: [
                    platformPoint(p, -p.length / 2, -p.width / 2),
                    platformPoint(p, p.length / 2, -p.width / 2),
                    platformPoint(p, p.length / 2, p.width / 2),
                    platformPoint(p, -p.length / 2, p.width / 2)
                ]
            }))
        ];
        for (const cut of cuts.filter(c => c.kind === 'escalator')) {
            const center = { x: cut.outline.reduce((s, p) => s + p.x, 0) / 4, z: cut.outline.reduce((s, p) => s + p.z, 0) / 4 };
            for (const floor of floors.filter(f => f.level === cut.level && pointInPolygon(center, f.outline))) {
                const geometry = buildFloorGeometry(floor.outline, cuts.filter(o => o.level === floor.level).map(o => o.outline), 0.55);
                const mesh = new T.Mesh(geometry, new T.MeshBasicMaterial({ side: T.DoubleSide }));
                mesh.updateMatrixWorld();
                const ray = new T.Raycaster(new T.Vector3(center.x, 30, center.z), new T.Vector3(0, -1, 0));
                assert.equal(ray.intersectObject(mesh).length, 0, `${cut.connectionId}: filled well`);
                geometry.dispose();
                (mesh.material as T.Material).dispose();
            }
        }
    }
);
