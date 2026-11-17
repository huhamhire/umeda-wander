import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { areas, facilities, connections, platforms, levels } from '../../src/infrastructure/stations/jr-osaka/layout.ts';
import { planFloorOpenings } from '../../src/application/connection-openings.ts';
import { planGateBoundaries } from '../../src/application/gate-boundaries.ts';
import { displayElevation } from '../../src/application/display-elevation.ts';
import { platformPoint } from '../../src/domain/map/geometry.ts';
import { buildFloorGeometry } from '../../src/presentation/floor-geometry.ts';
import { VerticalConnectionModel } from '../../src/presentation/vertical-connection-model.ts';
import { connectionHeading } from '../../src/application/connection-orientation.ts';
import { edges, nodes } from '../../src/infrastructure/stations/jr-osaka/layout.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';

const openings = planFloorOpenings(connections, levels, platforms);
function hit(geometry: T.BufferGeometry, x: number, z: number): boolean {
    const mesh = new T.Mesh(geometry, new T.MeshBasicMaterial({ side: T.DoubleSide }));
    mesh.updateMatrixWorld();
    return new T.Raycaster(new T.Vector3(x, 30, z), new T.Vector3(0, -1, 0)).intersectObject(mesh).length > 0;
}
test(
    'floor cuts remove real triangles, including overlapping holes and edge notches',
    () => {
        const floor = [{ x: -10, z: -10 }, { x: 10, z: -10 }, { x: 10, z: 10 }, { x: -10, z: 10 }];
        const well = [{ x: -2, z: -2 }, { x: 2, z: -2 }, { x: 2, z: 2 }, { x: -2, z: 2 }];
        const notch = [{ x: 8, z: -2 }, { x: 12, z: -2 }, { x: 12, z: 2 }, { x: 8, z: 2 }];
        const geometry = buildFloorGeometry(floor, [well, well, notch], 0.8);
        assert(!hit(geometry, 0, 0));
        assert(!hit(geometry, 9, 0));
        assert(hit(geometry, 5, 5));
        geometry.dispose();
    }
);
test(
    'all source areas and rotated platforms produce finite geometry after clipping',
    () => {
        const floors = [
            ...areas.map(area => ({ level: area.level, outline: area.outline })),
            ...platforms.map(platform => ({
                level: platform.level,
                outline: [
                    platformPoint(platform, -platform.length / 2, -platform.width / 2),
                    platformPoint(platform, platform.length / 2, -platform.width / 2),
                    platformPoint(platform, platform.length / 2, platform.width / 2),
                    platformPoint(platform, -platform.length / 2, platform.width / 2)
                ]
            }))
        ];
        for (const floor of floors) {
            const geometry = buildFloorGeometry(
                floor.outline,
                openings.filter(opening => opening.level === floor.level).map(opening => opening.outline),
                0.55
            );
            const position = geometry.getAttribute('position');
            if (position) {
                for (const value of position.array) {
                    assert(Number.isFinite(value));
                }
            }
            geometry.dispose();
        }
    }
);
test(
    'a modeled elevator and upper escalator landing have unobstructed floor openings',
    () => {
        const platform = platforms.find(p => p.id === 'p7-8')!;
        const outline = [
            platformPoint(platform, -platform.length / 2, -platform.width / 2),
            platformPoint(platform, platform.length / 2, -platform.width / 2),
            platformPoint(platform, platform.length / 2, platform.width / 2),
            platformPoint(platform, -platform.length / 2, platform.width / 2)
        ];
        const geometry = buildFloorGeometry(outline, openings.filter(o => o.level === 'platform').map(o => o.outline), 0.95, -0.475);
        assert(!hit(geometry, 43, -6), 'elevator shaft must not be filled by a platform slab');
        assert(hit(geometry, 48, -6), 'walking floor remains beside the well');
        geometry.dispose();
        const central = platforms.find(p => p.id === 'p5-6')!;
        const escalatorFloor = buildFloorGeometry(
            [
                platformPoint(central, -central.length / 2, -central.width / 2),
                platformPoint(central, central.length / 2, -central.width / 2),
                platformPoint(central, central.length / 2, central.width / 2),
                platformPoint(central, -central.length / 2, central.width / 2)
            ],
            openings.filter(o => o.level === 'platform').map(o => o.outline),
            0.95,
            -0.475
        );
        assert(!hit(escalatorFloor, -12, 6));
        escalatorFloor.dispose();
    }
);
test(
    'escalators have treads, grooves, glass balustrades and continuous handrail returns',
    () => {
        const connection = connections.find(c => c.id === 'central-34')!;
        const model = new VerticalConnectionModel(connection, levels, platforms);
        for (const explode of [0, 0.48, 1]) {
            model.update(id => displayElevation(levels, id, explode), 'all');
            for (const name of [
                'tread-surfaces',
                'step-risers',
                'tread-grooves',
                'escalator-glass-balustrades',
                'continuous-handrail',
                'rounded-handrail-return'
            ]) {
                assert(model.group.getObjectByName(name), name);
            }
            model.group.traverse(object => {
                assert(object.matrixWorld.elements.every(Number.isFinite));
                if (object instanceof T.InstancedMesh) {
                    assert([...object.instanceMatrix.array].every(Number.isFinite));
                }
            });
        }
        model.update(id => displayElevation(levels, id, 0.48), 'concourse');
        assert(model.group.visible);
        const treads = model.group.getObjectByName('tread-surfaces') as T.InstancedMesh;
        assert(treads.parent?.visible, 'focused floor still shows the nearby escalator section');
    }
);
test(
    'elevator has a transparent shaft, visible cabin and floor doors in exploded and focused views',
    () => {
        const model = new VerticalConnectionModel(connections.find(c => c.id === 'lift-m')!, levels, platforms);
        model.update(id => displayElevation(levels, id, 1), 'all');
        const shaft = model.group.getObjectByName('transparent-elevator-shaft') as T.Mesh;
        const glass = shaft.material as T.MeshStandardMaterial;
        assert(glass.transparent && glass.opacity < 0.4 && !glass.depthWrite);
        assert(model.group.getObjectByName('elevator-cabin')?.visible);
        assert(model.group.getObjectByName('landing-split-door'));
        model.update(id => displayElevation(levels, id, 1), 'platform');
        assert(model.group.visible);
    }
);
test(
    'compact elevator cabin and landing doors fit the shaft and its clipped floor opening',
    () => {
        const connection = connections.find(c => c.id === 'lift-m')!;
        const model = new VerticalConnectionModel(connection, levels, platforms);
        model.update(id => displayElevation(levels, id, 0), 'all');
        const shaft = model.group.getObjectByName('transparent-elevator-shaft') as T.Mesh;
        const cabin = model.group.getObjectByName('elevator-cabin')!;
        const floor = cabin.getObjectByName('cabin-floor') as T.Mesh;
        assert(shaft.scale.x <= 3.2, 'shaft should not dominate the platform');
        assert(floor.scale.x * cabin.scale.x < shaft.scale.x);
        assert.equal(cabin.scale.y, 1, 'horizontal refinement must retain cabin height');
        const frames: T.Mesh[] = [];
        model.group.traverse(o => {
            if (o instanceof T.Mesh && o.name === 'landing-door-frame') {
                frames.push(o);
            }
        });
        for (const frame of frames) {
            assert(Math.abs(frame.position.x) + frame.scale.x / 2 < shaft.scale.x / 2);
        }
        const opening = openings.find(o => o.connectionId === connection.id && o.level === connection.to.level)!;
        for (const x of [-shaft.scale.x / 2 - 0.08, shaft.scale.x / 2 + 0.08]) {
            for (const z of [-shaft.scale.z / 2 - 0.08, shaft.scale.z / 2 + 0.08]) {
                const p = model.group.localToWorld(new T.Vector3(x, 0, z));
                assert(pointInPolygon({ x: p.x, z: p.z }, opening.outline), 'structural corners must fit inside the opening');
            }
        }
    }
);
test(
    'gate boundaries have fences on both sides and leave the gate bank open',
    () => {
        const boundaries = planGateBoundaries(facilities, areas);
        assert.equal(boundaries.length, facilities.filter(f => f.kind === 'gate').length);
        for (const boundary of boundaries) {
            assert(boundary.fences.length >= 2, `fences around ${boundary.gateId}`);
            for (const fence of boundary.fences) {
                const dx = fence.to.x - fence.from.x;
                const dz = fence.to.z - fence.from.z;
                const t = ((boundary.center.x - fence.from.x) * dx + (boundary.center.z - fence.from.z) * dz) / (dx * dx + dz * dz);
                assert(t < 0 || t > 1, 'fence must not cross the gate opening');
            }
        }
    }
);
test(
    'elevator doors, shaft and floor cut share the platform frame',
    () => {
        for (const connection of connections.filter(c => c.kind === 'elevator' && c.platformId)) {
            const model = new VerticalConnectionModel(connection, levels, platforms);
            model.update(id => displayElevation(levels, id, 0), 'all');
            const platform = platforms.find(p => p.id === connection.platformId)!;
            const doorDirection = new T.Vector3(0, 0, 1).transformDirection(model.group.matrixWorld);
            const along = new T.Vector3(Math.cos(platform.rotationRad), 0, Math.sin(platform.rotationRad));
            assert(Math.abs(doorDirection.dot(along)) > 0.9999, 'doors face along the platform');
            const heading = connectionHeading(
                connection,
                platforms,
                levels.find(l => l.id === connection.from.level)!.y,
                levels.find(l => l.id === connection.to.level)!.y
            );
            for (const opening of openings.filter(o => o.connectionId === connection.id)) {
                const a = opening.outline[0]!;
                const b = opening.outline[1]!;
                const edge = new T.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
                assert(Math.abs(edge.dot(new T.Vector3(Math.cos(heading), 0, Math.sin(heading)))) > 0.9999);
            }
        }
    }
);
test(
    'platform escalators align with their platform axes, and source banks are included',
    () => {
        for (const connection of connections.filter(c => c.kind === 'escalator' && c.platformId)) {
            const platform = platforms.find(p => p.id === connection.platformId)!;
            const dx = connection.to.x - connection.from.x;
            const dz = connection.to.z - connection.from.z;
            assert(
                Math.abs((dx * Math.cos(platform.rotationRad) + dz * Math.sin(platform.rotationRad)) / Math.hypot(dx, dz)) > 0.9999,
                connection.id
            );
        }
        for (const id of [
            'central-32',
            'central-33',
            'central-34',
            'central-35',
            'midosuji-36',
            'midosuji-43',
            'bridge-west-5',
            'bridge-west-13',
            'mezz-escalator-18',
            'mezz-escalator-31'
        ]) {
            assert(connections.some(c => c.id === id));
        }
    }
);
test(
    'central gate banks both stay open along a shared fenced boundary',
    () => {
        const boundaries = planGateBoundaries(facilities, areas);
        const south = boundaries.find(b => b.gateId === 'gate')!;
        const north = boundaries.find(b => b.gateId === 'gate-central-north')!;
        assert.equal(south.boundaryId, north.boundaryId);
        assert.equal(south.fences.length, 3);
    }
);
test(
    'Daimaru half-level joins Central Court on both sides while the middle bank descends south to B1',
    () => {
        const connection = connections.find(c => c.id === 'central-daimaru-steps')!;
        assert.equal(connection.kind, 'stairs');
        assert.equal(connection.from.level, 'concourse');
        assert.equal(connection.to.level, 'concourse');
        assert.equal(connection.to.elevationOffset, 1.3);
        assert.equal(connection.width, 4);
        const east = connections.find(c => c.id === 'central-daimaru-east-steps')!;
        assert.equal(east.to.elevationOffset, 1.3);
        assert(connection.from.x < 0 && east.from.x > 0);
        for (const side of [connection, east]) {
            assert(side.to.z > side.from.z);
        }
        for (const id of ['crost-67', 'crost-stairs-68', 'crost-stairs-69']) {
            const c = connections.find(c => c.id === id)!;
            assert.equal(c.from.level, 'concourse');
            assert.equal(c.to.level, 'underground-hall');
            assert(c.to.z > c.from.z, 'B1 descent must head south');
            assert(areas.some(a => a.id === 'crost-public' && pointInPolygon(c.to, a.outline)));
        }
        const model = new VerticalConnectionModel(connection, levels, platforms);
        for (const explode of [0, 1]) {
            model.update(id => displayElevation(levels, id, explode), 'concourse');
            const landing = model.group.getObjectByName('upper-landing')!;
            assert(landing.visible);
            assert(Math.abs(landing.position.y - 1.3) < 1e-6);
        }
    }
);
test(
    'central walkway route avoids the new Crost stair/escalator openings',
    () => {
        const cuts = openings.filter(o => o.level === 'concourse' && ['crost-67', 'crost-stairs-68', 'crost-stairs-69'].includes(o.connectionId));
        for (const edge of edges.filter(e => e.kind === 'walk')) {
            const a = nodes.find(n => n.id === edge.from)!;
            const b = nodes.find(n => n.id === edge.to)!;
            if (a.level !== 'concourse' || b.level !== 'concourse') {
                continue;
            }
            for (let i = 0; i <= 20; i++) {
                const point = { x: a.x + (b.x - a.x) * i / 20, z: a.z + (b.z - a.z) * i / 20 };
                assert(
                    !cuts.some(c => pointInPolygon(point, c.outline)),
                    `${edge.from} → ${edge.to} crosses a Crost floor opening`
                );
            }
        }
    }
);
test(
    'ticket machine banks are exposed as points of interest in public areas',
    () => {
        const machines = facilities.filter(f => f.kind === 'ticket-machine');
        assert.equal(machines.length, 6);
        for (const machine of machines) {
            assert(
                areas.some(a => a.level === machine.level && a.kind === 'public' && pointInPolygon(machine, a.outline)),
                machine.id
            );
        }
    }
);
