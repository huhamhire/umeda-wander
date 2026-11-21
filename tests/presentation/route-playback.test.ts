import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import type { Level, RouteNode, VerticalConnection } from '../../src/domain/map/model.ts';
import { createRoutePlayback } from '../../src/application/navigation/route-playback.ts';
import { routeEscalators, routePath } from '../../src/application/navigation/route-path.ts';
import { RoutePlaybackView } from '../../src/presentation/camera/route-playback-view.ts';
import { cameraOffset } from '../../src/presentation/camera/view-orientation.ts';

const levels: Level[] = [
    { id: 'district-ground', label: '1F', name: 'Street', description: '', y: 0 },
    { id: 'district-underground', label: 'B1', name: 'Passage', description: '', y: -8 },
    { id: 'south-deck', label: '2F', name: 'Deck', description: '', y: 4 },
    { id: 'platform', label: '2F', name: 'Platform', description: '', y: 8 }
];
const nodes = new Map<string, RouteNode>([
    { id: 'street', level: 'district-ground', x: 0, z: 0 },
    { id: 'door', level: 'district-ground', x: 0, z: 28 },
    { id: 'foot', level: 'district-underground', x: 0, z: 28 },
    { id: 'end', level: 'district-underground', x: 16, z: 28 },
    { id: 'deck', level: 'south-deck', x: 0, z: 0 },
    { id: 'deck-end', level: 'south-deck', x: 16, z: 0 }
].map(node => [node.id, node] as [string, RouteNode]));

/** Resolve the fixture itinerary to the same kind of points consumed by playback. */
const playbackFor = (...ids: string[]) => createRoutePlayback(ids.map(id => nodes.get(id)!), levels);

test('route playback samples the preview by physical distance and keeps both landings visible during a transfer', () => {
    const path = playbackFor('street', 'street', 'door', 'foot', 'end')!;
    assert.equal(path.length, 52);
    assert.equal(path.at(14).z, 14);
    const lift = path.at(32);
    assert.equal(lift.from.id, 'door');
    assert.equal(lift.to.id, 'foot');
    assert.equal(lift.fraction, .5);
    assert.equal(lift.level.id, 'district-ground');
    assert.equal(lift.ceiling, 0);
    assert.equal(path.descentAhead(32, 10), undefined);
    assert.equal(path.at(36).level.id, 'district-underground');
    assert.equal(path.at(path.length).x, 16);
    assert.equal(playbackFor('deck', 'deck-end')?.at(7).ceiling, 4);
    assert.equal(playbackFor('street', 'street'), undefined);
});

test('route camera flies in before walking, resumes from the current frame and stops at the destination', t => {
    const originalOffset = cameraOffset.clone();
    t.after(() => {
        cameraOffset.copy(originalOffset);
    });
    cameraOffset.set(0, 390, 273);
    const path = playbackFor('street', 'door', 'foot', 'end')!;
    const origin = { center: new T.Vector3(180, 18, 240), span: 420 };
    const playback = new RoutePlaybackView(path, origin);
    const usable = { left: 300, top: 0, width: 700, height: 700 };
    const frameAt = (time: number, reduced = false) => playback.advance(
        time, reduced, 1000, 700, usable, sample => new T.Vector3(sample.x, 0, sample.z)
    );
    assert.deepEqual(frameAt(0), origin);
    for (let time = 100; time <= 900; time += 100) {
        assert(frameAt(time).span < origin.span);
        assert.equal(playback.sample.z, 0, 'the marker waits at the start during camera approach');
    }
    const pitch = Math.atan2(cameraOffset.y, Math.hypot(cameraOffset.x, cameraOffset.z));
    assert(Math.abs(pitch - T.MathUtils.degToRad(28)) < 1e-9);
    assert(cameraOffset.x !== 0, 'the approach makes a limited yaw adjustment when facing oncoming travel');
    frameAt(1000);
    const resumedAt = playback.sample.z;
    assert(resumedAt > 0 && resumedAt < 28);
    const manual = { center: new T.Vector3(45, 12, 70), span: 140 };
    playback.resume(manual);
    assert.deepEqual(frameAt(3000), manual);
    assert.equal(playback.sample.z, resumedAt);
    const offsetBeforeReducedMotion = cameraOffset.clone();
    frameAt(3100, true);
    for (let time = 3200; time <= 8500 && playback.status === 'playing'; time += 100) {
        frameAt(time, true);
    }
    assert.equal(playback.status, 'finished');
    assert.equal(playback.sample.x, 16);
    assert.deepEqual(cameraOffset.toArray(), offsetBeforeReducedMotion.toArray());
});

test('route camera enters the downhill viewing range and keeps an existing oblique angle', t => {
    const originalOffset = cameraOffset.clone();
    t.after(() => {
        cameraOffset.copy(originalOffset);
    });
    const origin = { center: new T.Vector3(), span: 110 };
    const usable = { left: 300, top: 0, width: 700, height: 700 };
    const upper = nodes.get('door')!;
    const lower = { id: 'lower', level: upper.level, elevationOffset: -8, x: 0, z: 40 };
    for (const kind of ['stairs', 'escalator'] as const) {
        const connection: VerticalConnection = {
            id: kind, kind, from: upper, to: lower, evidence: { pages: [], detail: 'Playback fixture' }
        };
        const points = routePath([nodes.get('street')!, upper, lower], routeEscalators([connection]));
        const path = createRoutePlayback(points, levels, [connection])!;
        const rise = createRoutePlayback(points.slice().reverse(), levels, [connection])!;
        assert.equal(rise.descentAhead(0, rise.length), undefined);
        assert.equal(path.descentAhead(0, 10), undefined);
        assert.equal(path.descentAhead(24, 10)?.from.id, upper.id);

        cameraOffset.set(0, 170, -273);
        const playback = new RoutePlaybackView(path, origin);
        const frameAt = (now: number, reduced = false) => playback.advance(
            now, reduced, 1000, 700, usable, sample => new T.Vector3(sample.x, 0, sample.z)
        );
        let turnedOnApproach = false;
        let checkedDescent = false;
        for (let now = 0; now <= 6000 && playback.status === 'playing'; now += 100) {
            const before = new T.Vector2(cameraOffset.x, cameraOffset.z);
            frameAt(now);
            const after = new T.Vector2(cameraOffset.x, cameraOffset.z);
            assert(Math.abs(before.angleTo(after)) < .17, 'the camera turns continuously');
            if (playback.sample.z > 0 && playback.sample.z < 27 && Math.abs(cameraOffset.x) > 1) {
                turnedOnApproach = true;
            }
            if (playback.sample.from.id === upper.id && playback.sample.to.id === lower.id) {
                const yaw = Math.atan2(cameraOffset.x, cameraOffset.z);
                assert(Math.abs(Math.abs(yaw) - Math.PI / 6) < 1e-6);
                checkedDescent = true;
            }
        }
        assert(turnedOnApproach && checkedDescent);

        const obliqueYaw = Math.PI / 9;
        cameraOffset.set(273 * Math.sin(obliqueYaw), 170, 273 * Math.cos(obliqueYaw));
        const flight = createRoutePlayback(points.slice(1), levels, [connection])!;
        const oblique = new RoutePlaybackView(flight, origin);
        for (let now = 0; now <= 5500 && oblique.status === 'playing'; now += 100) {
            oblique.advance(now, false, 1000, 700, usable, sample => new T.Vector3(sample.x, 0, sample.z));
            assert(Math.abs(Math.atan2(cameraOffset.x, cameraOffset.z) - obliqueYaw) < 1e-6);
        }
        assert.equal(oblique.status, 'finished');

        cameraOffset.set(0, 170, -273);
        const reduced = new RoutePlaybackView(path, origin);
        for (let now = 0; now <= 6000 && reduced.status === 'playing'; now += 100) {
            reduced.advance(now, true, 1000, 700, usable, sample => new T.Vector3(sample.x, 0, sample.z));
        }
        assert.equal(reduced.status, 'finished');
        assert.deepEqual(cameraOffset.toArray(), [0, 170, -273]);
    }
});
