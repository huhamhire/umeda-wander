import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { loopTrainFrame, loopTrainLength, loopTrainPoint, loopTrainSoundCue, osakaLoopTrainPath } from '../../src/application/exploration/osaka-loop-train.ts';
import { platformLocalPoint } from '../../src/domain/map/geometry.ts';
import { platformRail } from '../../src/domain/map/rail-geometry.ts';
import { layout } from '../../src/infrastructure/district/geographic-map.ts';
import { OsakaLoopTrainModel } from '../../src/presentation/models/stations/osaka-loop-train-model.ts';
import { platformGain } from '../../src/presentation/audio/loop-train-sound.ts';

const path = osakaLoopTrainPath(layout)!;

test('approach and departure cues follow each train and fade with distance from the platform', () => {
    assert.deepEqual(loopTrainSoundCue(8999), { wait: 1 });
    const firstArrival = { id: 0, kind: 'arrival' };
    assert.deepEqual(loopTrainSoundCue(9000).cue, firstArrival);
    assert.deepEqual(loopTrainSoundCue(14000).cue, firstArrival);
    assert.deepEqual(loopTrainSoundCue(20999).cue, firstArrival);
    assert.deepEqual(loopTrainSoundCue(21000), { wait: 12000 });
    const firstDeparture = { id: 0, kind: 'departure' };
    assert.deepEqual(loopTrainSoundCue(33000).cue, firstDeparture);
    assert.deepEqual(loopTrainSoundCue(33999).cue, firstDeparture);
    assert.deepEqual(loopTrainSoundCue(34000), { wait: 35000 });
    assert.deepEqual(loopTrainSoundCue(69000).cue, { id: 1, kind: 'arrival' });
    assert.deepEqual(loopTrainSoundCue(93000).cue, { id: 1, kind: 'departure' });
    assert.equal(platformGain(0), platformGain(65));
    assert(platformGain(100) < platformGain(65) && platformGain(100) > platformGain(200));
    assert(platformGain(275) > platformGain(400) && platformGain(400) > 0);
    assert.equal(platformGain(420), 0);
});

test('the Osaka Loop Line train starts at three seconds and repeats its stop every minute', () => {
    for (const cycle of [0, 60000, 120000]) {
        assert.equal(loopTrainFrame(path, cycle + 2999, false).head, undefined);
        assert.equal(loopTrainFrame(path, cycle + 3000, false).head, 0);
        assert(loopTrainFrame(path, cycle + 20000, false).head! < path.stop);
        assert.deepEqual(loopTrainFrame(path, cycle + 21000, false), { head: path.stop, wait: 12000 });
        assert.equal(loopTrainFrame(path, cycle + 32999, false).head, path.stop);
        assert(loopTrainFrame(path, cycle + 41000, false).head! > path.stop);
        assert(loopTrainFrame(path, cycle + 50999, false).head! > path.length);
        assert.equal(loopTrainFrame(path, cycle + 51000, false).head, undefined);
        assert.equal(loopTrainFrame(path, cycle + 3000, true).head, path.stop);
    }
});

test('all eight cars stop on track 2 and inherit the platform layer visibility', () => {
    const platform = layout.platforms.find(p => p.id === path.platformId)!;
    const rail = platformRail(platform, platform.tracks.indexOf(2));
    assert(path.points[0]!.x < rail.start.x && path.points.at(-1)!.x > rail.end.x);
    assert(path.distances.every((distance, index) => index === 0 || distance > path.distances[index - 1]!));
    assert.deepEqual(loopTrainPoint(path, 0), path.points[0]);
    const train = new OsakaLoopTrainModel(path);
    const floor = new T.Group().add(train.group);
    assert.equal(train.update(21000, false), 12000);
    assert.equal(train.group.children.length, 8);
    for (const car of train.group.children) {
        const point = platformLocalPoint(platform, car.position);
        assert(Math.abs(point.z - rail.across) < .05);
        assert(Math.abs(point.x) + 10 < platform.length / 2);
        assert(Math.cos(car.rotation.y) > 0);
    }
    assert(Math.abs(platformLocalPoint(platform, loopTrainPoint(path, path.stop - loopTrainLength / 2)).x) < .05);
    floor.visible = false;
    assert.equal(train.update(26000, false), Infinity);
    assert.equal(train.group.visible, false);
    floor.visible = true;
    train.update(26000, false);
    assert.equal(train.group.visible, true);
});

test('the 223 series cab has curved shoulders, a raked upper face and glazing on both sides', () => {
    const train = new OsakaLoopTrainModel(path);
    const cab = train.group.children[0]!.children[0]!;
    const skin = cab.children[0]!;
    const glass = cab.children.find(object => object instanceof T.Mesh &&
        object.material instanceof T.MeshStandardMaterial && object.material.color.getHex() === 0x496570)!;
    const hit = (surface: T.Object3D, y: number, z: number) =>
        new T.Raycaster(new T.Vector3(11, y, z), new T.Vector3(-1, 0, 0), 0, 3).intersectObject(surface)[0]!.point.x;
    assert(hit(skin, 2.1, 0) - hit(skin, 2.1, 1.1) > .15);
    assert(hit(skin, 2.1, 0) - hit(skin, 3.45, 0) > .35);
    assert(hit(glass, 2.45, -.86) > hit(skin, 2.45, -.86));
    assert(hit(glass, 2.45, .86) > hit(skin, 2.45, .86));
});

test('fully clipped cars and offscreen trains can skip drawing during motion', () => {
    const train = new OsakaLoopTrainModel(path);
    new T.Group().add(train.group);
    const camera = new T.OrthographicCamera(-15, 15, 15, -15, 1, 200);
    const view = new T.Frustum();
    const projection = new T.Matrix4();
    const lookAt = (x: number, z: number) => {
        camera.position.set(x, 35, z + 22);
        camera.lookAt(x, 0, z);
        camera.updateMatrixWorld();
        view.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    };
    train.update(3000, false);
    assert(train.group.children.every(car => !car.visible));
    train.update(3150, false);
    assert.equal(train.group.children.filter(car => car.visible).length, 1);
    const entry = path.points[0]!;
    lookAt(entry.x, entry.z);
    assert(train.intersectsView(view));
    lookAt(entry.x + 200, entry.z + 200);
    assert(!train.intersectsView(view));
    train.update(21000, false);
    assert.equal(train.group.children.filter(car => car.visible).length, 8);
});
