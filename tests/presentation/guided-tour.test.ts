import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { layout, levels } from '../../src/infrastructure/district/geographic-map.ts';
import { cameraEnvelope } from '../../src/presentation/camera/camera-framing.ts';
import { allowsGroundLayer } from '../../src/application/exploration/view-layer.ts';
import { displayElevation } from '../../src/application/exploration/display-elevation.ts';
import { GuidedTour } from '../../src/presentation/camera/guided-tour.ts';
import { cameraOffset } from '../../src/presentation/camera/view-orientation.ts';
import { TourLayerFade } from '../../src/presentation/appearance/tour-layer-fade.ts';

test('the guided tour orbits the full district, visits the requested floors and returns to the same frame', t => {
    const original = cameraOffset.clone();
    t.after(() => {
        cameraOffset.copy(original);
    });
    const points = cameraEnvelope(layout, levels, { level: 'all' }, id => levels.find(level => level.id === id)!.y);
    const tour = new GuidedTour(layout, levels, points, 0);
    const usable = { left: 340, top: 0, width: 660, height: 700 };
    const start = tour.advance(0, false, 1000, 700, usable);
    assert(start.overview && start.ground && start.level === 'all' && start.explode === 0);
    const closingIn = tour.advance(3200, false, 1000, 700, usable);
    const rotated = tour.advance(5300, false, 1000, 700, usable);
    assert(rotated.overview && Math.abs(rotated.yaw - T.MathUtils.degToRad(-36)) < 1e-9);
    assert(start.yaw > closingIn.yaw && closingIn.yaw > rotated.yaw);
    assert(start.span > closingIn.span && closingIn.span > rotated.span);
    assert(tour.advance(5500, false, 1000, 700, usable).yaw < rotated.yaw);
    const anchor = (frame: ReturnType<GuidedTour['advance']>) => frame.center.clone().addScaledVector(
        new T.Vector3(Math.cos(frame.yaw), 0, -Math.sin(frame.yaw)), usable.left / 2 * frame.span / usable.height
    );
    const jr = tour.advance(9200, false, 1000, 700, usable);
    const expanding = tour.advance(10000, false, 1000, 700, usable);
    const expanded = tour.advance(11800, false, 1000, 700, usable);
    const movingToUmekita = tour.advance(13500, false, 1000, 700, usable);
    assert(jr.station === 'jr-osaka' && jr.level === 'all' && jr.explode === 0 && jr.ground);
    assert(expanding.explode > 0 && expanding.explode < expanded.explode);
    assert(!expanding.ground && !movingToUmekita.ground);
    assert.equal(expanding.level, 'all');
    assert.equal(expanding.span, jr.span);
    assert(anchor(expanding).distanceTo(anchor(jr)) < 1e-9);
    assert(expanding.yaw < jr.yaw);
    assert(movingToUmekita.level === 'all' && movingToUmekita.explode === expanded.explode);
    assert.notEqual(movingToUmekita.yaw, expanded.yaw);
    const bridge = layout.areas.filter(area => ['bridge-public', 'bridge-paid', 'bridge-south'].includes(area.id));
    for (const [width, height, viewport] of [
        [1000, 700, usable],
        [390, 844, { left: 0, top: 0, width: 390, height: 636 }]
    ] as const) {
        for (const time of [9200, 11800]) {
            const frame = tour.advance(time, false, width, height, viewport);
            const half = frame.span / 2;
            const camera = new T.OrthographicCamera(-half * width / height, half * width / height, half, -half, .1, 6000);
            camera.position.copy(frame.center).addScaledVector(cameraOffset, 6);
            camera.lookAt(frame.center);
            camera.updateMatrixWorld(true);
            for (const area of bridge) {
                for (const point of area.outline) {
                    const projected = new T.Vector3(point.x, displayElevation(levels, area.level, frame.explode), point.z).project(camera);
                    const x = (projected.x + 1) * width / 2;
                    const y = (1 - projected.y) * height / 2;
                    assert(x > viewport.left && x < viewport.left + viewport.width && y > 0 && y < viewport.height);
                }
            }
        }
    }
    const cutting = tour.advance(15500, false, 1000, 700, usable);
    const umekitaArrival = tour.advance(16050, false, 1000, 700, usable);
    const umekitaDeparture = tour.advance(19000, false, 1000, 700, usable);
    assert(cutting.level === 'underground-hall' && cutting.opacity > 0 && cutting.opacity < 1);
    assert(anchor(cutting).distanceTo(anchor(umekitaArrival)) < 1e-9 && cutting.span === umekitaArrival.span);
    assert.equal(umekitaArrival.level, 'underground-hall');
    assert.equal(umekitaDeparture.level, 'underground-hall');
    assert(umekitaDeparture.yaw - umekitaArrival.yaw > T.MathUtils.degToRad(10));
    const rail = layout.platforms.find(platform => platform.level === 'underground-platform')!;
    const lookingAlongTrack = (yaw: number) => Math.abs(Math.sin(rail.rotationRad + yaw));
    assert(lookingAlongTrack(umekitaArrival.yaw) < .25 && lookingAlongTrack(umekitaDeparture.yaw) < .25);

    const returning = tour.advance(20500, false, 1000, 700, usable);
    const returningLater = tour.advance(20850, false, 1000, 700, usable);
    assert(returning.level === 'all' && returning.opacity > 0 && returning.opacity < 1);
    assert(returningLater.opacity > returning.opacity && anchor(returningLater).distanceTo(anchor(returning)) > 5);
    const beforeBridge = tour.advance(24800, false, 1000, 700, usable);
    const approachingBridge = tour.advance(25700, false, 1000, 700, usable);
    const bridgeTurn = approachingBridge.yaw - beforeBridge.yaw;
    assert(approachingBridge.span < beforeBridge.span && approachingBridge.level === 'bridge');
    assert(bridgeTurn > T.MathUtils.degToRad(2) && bridgeTurn < T.MathUtils.degToRad(8));

    const visits: string[] = [];
    let transfer = false;
    let looped = false;
    let previous = start;
    let previousTurn: number | undefined;
    let stillFor = 0;
    let undergroundStarted = false;
    let undergroundTransfer = false;
    for (let now = 0; now <= 105000; now += 32) {
        const frame = tour.advance(now, false, 1000, 700, usable);
        assert(Number.isFinite(frame.span) && frame.span > 0 && frame.center.toArray().every(Number.isFinite));
        assert(frame.center.distanceTo(previous.center) < frame.span * .035);
        assert(Math.abs(frame.span - previous.span) < frame.span * .035);
        const turn = Math.atan2(Math.sin(frame.yaw - previous.yaw), Math.cos(frame.yaw - previous.yaw));
        assert(Math.abs(turn) < .06);
        if (previousTurn !== undefined) {
            assert(Math.abs(turn - previousTurn) < .003);
        }
        stillFor = Math.abs(turn) < T.MathUtils.degToRad(.015) ? stillFor + 32 : 0;
        assert(stillFor < 400, 'the orbit should slow through reversals without a stationary hold');
        previousTurn = now ? turn : undefined;
        previous = frame;
        if (frame.station === 'jr-osaka' && frame.explode > 0) {
            assert(!frame.ground);
        }
        if (frame.station === 'hankyu-umeda') {
            assert(frame.ground);
        }
        undergroundStarted ||= frame.station === 'metro-umeda';
        if (undergroundStarted && !frame.overview) {
            assert(!frame.ground);
            assert(!allowsGroundLayer(levels, { level: frame.level, focusStation: frame.station }));
            undergroundTransfer ||= frame.station === null;
        }
        if (frame.station && !frame.moving) {
            const visit = frame.station + '/' + frame.level;
            if (visits.at(-1) !== visit) {
                visits.push(visit);
            }
            if (visits.length > 1) {
                assert(!frame.overview && frame.explode > .5 && Math.abs(frame.pitch - T.MathUtils.degToRad(25)) < 1e-9);
            }
        } else if (!frame.station && !frame.overview && visits.length > 0) {
            transfer = true;
        }
        if (visits.length === 12 && frame.overview && !frame.moving) {
            assert.equal(frame.span, start.span);
            assert(anchor(frame).distanceTo(anchor(start)) < 1e-7);
            assert(frame.ground);
            assert.equal(frame.explode, 0);
            looped = true;
            break;
        }
    }
    assert(transfer && undergroundTransfer && looped);
    const loopStart = tour.advance(tour.duration, false, 1000, 700, usable);
    assert.equal(loopStart.yaw, start.yaw);
    assert.deepEqual(loopStart.center, start.center);
    assert.deepEqual(visits, [
        'jr-osaka/all', 'jr-osaka/underground-hall', 'jr-osaka/all', 'jr-osaka/bridge', 'jr-osaka/concourse',
        'hankyu-umeda/hankyu-platform', 'metro-umeda/metro-hall',
        'higashi-umeda/t20-hall', 'hanshin-umeda/hanshin-hall', 'hanshin-umeda/hanshin-platform',
        'nishi-umeda/y11-hall', 'kitashinchi/kitashinchi-hall'
    ]);
    const phone = { left: 0, top: 0, width: 390, height: 640 };
    const reduced = tour.advance(6500, true, 390, 844, phone);
    assert.equal(reduced.station, 'jr-osaka');
    assert(!reduced.moving && !reduced.turning && reduced.wait > 0 && Number.isFinite(reduced.span));
    const origin = { center: new T.Vector3(10, 40, 60), span: 130, orientation: new T.Vector3(100, 60, 200), explode: .6 };
    const startingFromManual = new GuidedTour(layout, levels, points, 0, origin);
    const entrance = startingFromManual.advance(0, false, 1000, 700, usable);
    assert.deepEqual(entrance.center, origin.center);
    assert.equal(entrance.span, origin.span);
    assert.equal(entrance.explode, origin.explode);
});

test('guided floor cuts draw the incoming and outgoing layers before restoring the normal scene', () => {
    const material = new T.MeshBasicMaterial();
    const oldFloor = new T.Group();
    const canopy = new T.Group();
    const oldMesh = new T.Mesh(new T.BoxGeometry(), material);
    const newMesh = new T.Mesh(oldMesh.geometry, material);
    canopy.add(oldMesh);
    oldFloor.add(canopy);
    const fade = new TourLayerFade();
    const before = new Map<T.Object3D, boolean>([[oldFloor, true], [canopy, true], [newMesh, false]]);
    oldFloor.visible = false;
    canopy.visible = false;
    newMesh.visible = true;
    fade.begin(before);
    fade.draw(.3, () => {
        assert(oldFloor.visible && canopy.visible && newMesh.visible);
        assert.equal(oldMesh.material.opacity, .7);
        assert.equal(newMesh.material.opacity, .3);
    });
    assert(!oldFloor.visible && !canopy.visible && newMesh.visible);
    assert(oldMesh.material === material && newMesh.material === material);
    fade.clear();
    oldMesh.geometry.dispose();
    material.dispose();
});
