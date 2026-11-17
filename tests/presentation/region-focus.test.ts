import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { isRegionMuted } from '../../src/application/region-focus.ts';
import { LayerAppearance, setRegionOwner } from '../../src/presentation/layer-appearance.ts';
import { PublicPassageModel } from '../../src/presentation/public-passage-model.ts';
test(
    'station focus mutes other owners and district models without changing shared originals',
    () => {
        const material = new T.MeshStandardMaterial({ color: 0x337d5a });
        const style = new LayerAppearance();
        const root = new T.Group();
        const jr = setRegionOwner(new T.Mesh(new T.BoxGeometry(), material), 'jr-osaka');
        const metro = setRegionOwner(new T.InstancedMesh(new T.BoxGeometry(), material, 1), 'metro-umeda');
        const retail = setRegionOwner(new T.Group(), null);
        const podium = new T.Mesh(new T.BoxGeometry(), material);
        retail.add(podium);
        root.add(jr, metro, retail);
        style.apply(root, false, 'jr-osaka');
        assert.equal(jr.material, material);
        assert.notEqual(metro.material, material);
        assert.notEqual(podium.material, material);
        assert.equal(material.color.getHex(), 0x337d5a);
        assert(root.children.every(o => o.visible));
        style.apply(root, false, 'metro-umeda');
        assert.notEqual(jr.material, material);
        assert.equal(metro.material, material);
        assert.notEqual(podium.material, material);
        style.apply(root, false, null);
        for (const mesh of [jr, metro, podium]) {
            assert.equal(mesh.material, material);
        }
    }
);
test(
    'explicit commercial ownership overrides its JR layer and lower-floor context remains muted',
    () => {
        const style = new LayerAppearance();
        const root = setRegionOwner(new T.Group(), 'jr-osaka');
        const glass = new T.MeshStandardMaterial({ color: 0x719eac, transparent: true, opacity: 0.4 });
        const base = new T.MeshStandardMaterial({ color: 0xefe1c2 });
        const building = setRegionOwner(new T.Mesh(new T.BoxGeometry(), [glass, base]), null);
        const station = new T.Mesh(new T.BoxGeometry(), base);
        root.add(building, station);
        style.apply(root, false, 'jr-osaka');
        assert.equal(station.material, base);
        assert.notEqual(building.material[0], glass);
        assert.equal(glass.opacity, 0.4);
        assert(building.material[0]!.opacity < glass.opacity);
        style.apply(root, true, 'jr-osaka');
        assert.notEqual(station.material, base);
        style.apply(root, false, null);
        assert.deepEqual(building.material, [glass, base]);
        assert.equal(station.material, base);
        assert(!isRegionMuted(null, null));
        assert(!isRegionMuted('jr-osaka', 'jr-osaka'));
        assert(isRegionMuted('jr-osaka', null));
    }
);
test(
    'inter-station passage appearance updates on focus alone and restores at overview',
    () => {
        const p = new PublicPassageModel({
            id: 'shared',
            name: 'shared',
            kind: 'deck',
            width: 4,
            evidence: { pages: [], detail: 'test' },
            points: [
                {
                    x: 0,
                    z: 0,
                    level: 'platform',
                    station: 'jr-osaka'
                },
                {
                    x: 10,
                    z: 0,
                    level: 'hankyu-hall',
                    station: 'hankyu-umeda'
                }
            ]
        });
        p.update(() => 8, () => 'current');
        const floor = p.group.getObjectByName('passage-floor') as T.Mesh;
        const material = floor.material;
        p.update(() => 8, () => 'current', 'jr-osaka');
        assert.notEqual(floor.material, material);
        assert(p.group.visible);
        p.update(() => 8, () => 'current', null);
        assert.equal(floor.material, material);
    }
);
