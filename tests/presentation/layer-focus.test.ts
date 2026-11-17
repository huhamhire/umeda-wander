import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { displayElevation } from '../../src/application/display-elevation.ts';
import { layerRole } from '../../src/application/layer-focus.ts';
import { layout as districtLayout, levels as districtLevels } from '../../src/infrastructure/district/geographic-map.ts';
import { connections, levels, platforms } from '../../src/infrastructure/stations/jr-osaka/layout.ts';
import { LayerAppearance } from '../../src/presentation/layer-appearance.ts';
import { VerticalConnectionModel } from '../../src/presentation/vertical-connection-model.ts';
import { cameraOffset } from '../../src/presentation/view-orientation.ts';
test(
    'focused floors retain all lower levels as context and hide upper levels',
    () => {
        for (const focus of levels) {
            for (const target of levels) {
                assert.equal(
                    layerRole(levels, focus.id, target.id),
                    target.id === focus.id ? 'current' : target.y < focus.y ? 'context' : 'hidden'
                );
                assert.equal(layerRole(levels, 'all', target.id), 'normal');
            }
        }
    }
);
test(
    'muting a lower layer does not change materials shared with the active layer',
    () => {
        const material = new T.MeshStandardMaterial({ color: 0x23665d });
        const active = new T.Mesh(new T.BoxGeometry(), material);
        const lower = new T.Mesh(new T.BoxGeometry(), material);
        const style = new LayerAppearance();
        const initial = material.color.getHex();
        style.apply(lower, true);
        assert.notEqual(lower.material, material);
        assert.equal(active.material.color.getHex(), initial);
        assert.notEqual(lower.material.color.getHex(), initial);
        style.apply(lower, false);
        assert.equal(lower.material, material);
    }
);
test(
    'lower-floor facilities remain visible when focusing a higher layer',
    () => {
        const connection = connections.find(c => c.id === 'central-34')!;
        const model = new VerticalConnectionModel(connection, levels, platforms);
        model.update(id => displayElevation(levels, id, 0.5), 'bridge');
        assert(model.group.visible);
        assert(model.group.getObjectByName('connection-body')?.visible);
        assert(model.group.getObjectByName('lower-landing')?.visible);
        assert(model.group.getObjectByName('upper-landing')?.visible);
    }
);
test(
    'Daimaru 1F raised landings retain the 2F escalator and lift across cuts and expansion',
    () => {
        for (const id of ['south-building-61', 'south-entrance-east-escalators', 'south-lift-u']) {
            const connection = districtLayout.connections.find(c => c.id === id)!;
            assert.equal(connection.from.level, 'concourse');
            assert.equal(connection.from.elevationOffset, 1.3);
            assert.equal(connection.to.level, 'south-deck');
            const model = new VerticalConnectionModel(connection, districtLevels, districtLayout.platforms);
            for (const explode of [0, 0.48, 1]) {
                for (const focus of [
                    'south-deck',
                    'concourse',
                    'mezzanine',
                    'underground-hall',
                    'concourse'
                ] as const) {
                    model.update(level => displayElevation(districtLevels, level, explode), focus);
                    const visible = focus !== 'underground-hall';
                    assert.equal(model.group.visible, visible, `${id}: ${focus}`);
                    assert.equal(model.group.getObjectByName('connection-body')!.visible, visible);
                    assert.equal(model.group.getObjectByName('lower-landing')!.visible, visible);
                    if (visible && connection.kind === 'elevator') {
                        const shaft = model.group.getObjectByName('transparent-elevator-shaft') as T.Mesh;
                        assert(
                            shaft.position.y + shaft.scale.y / 2 >= 3.1 - 1e-6,
                            'raised 1F entrance retains full-height lower lift doors'
                        );
                    }
                    if (visible && connection.kind === 'escalator') {
                        assert(model.group.getObjectByName('upper-landing')!.visible, 'complete flight retained from 1F');
                    }
                }
            }
        }
        for (const id of ['south-building-50', 'south-lift-t']) {
            const model = new VerticalConnectionModel(
                districtLayout.connections.find(c => c.id === id)!,
                districtLevels,
                districtLayout.platforms
            );
            model.update(level => displayElevation(districtLevels, level, 0.48), 'concourse');
            assert(!model.group.visible, 'connections entirely above 1F remain hidden');
        }
    }
);
test(
    'fixed camera aligns the geographic JR axis left to right',
    () => {
        const camera = new T.OrthographicCamera(-100, 100, 100, -100, 0.1, 1000);
        camera.position.copy(cameraOffset);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();
        const origin = new T.Vector3().project(camera);
        const along = new T.Vector3(10 * Math.cos(-31.65 * Math.PI / 180), 0, 10 * Math.sin(-31.65 * Math.PI / 180)).project(camera);
        const dx = along.x - origin.x;
        const dy = along.y - origin.y;
        assert(dx > 0 && dy > 0);
        assert(dy / dx > 0.2 && dy / dx < 0.4);
    }
);
