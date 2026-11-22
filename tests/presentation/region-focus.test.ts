import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { isRegionMuted } from '../../src/application/exploration/region-focus.ts';
import { LayerAppearance, setRegionOwner } from '../../src/presentation/appearance/layer-appearance.ts';
import { publicUndergroundBlocksByStation } from '../../src/infrastructure/district/geographic-map.ts';
import { visibleLabelOccluders } from '../../src/presentation/labels/label-occlusion.ts';
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

test('B1 station focus keeps bound blocks opaque and makes other public floors transparent', () => {
    const metro = publicUndergroundBlocksByStation.get('metro-umeda')!;
    const hanshin = publicUndergroundBlocksByStation.get('hanshin-umeda')!;
    assert.deepEqual([...metro], ['metro-interchange-b1']);
    assert.deepEqual([...hanshin].sort(), ['crost-b1', 'hanshin-west-b1']);
    const geometry = new T.BoxGeometry();
    const material = new T.MeshStandardMaterial({ color: 0xb9ab81 });
    const metroFloor = setRegionOwner(new T.Mesh(geometry, material), null);
    metroFloor.userData.publicUndergroundBlock = 'metro-interchange-b1';
    const crostFloor = setRegionOwner(new T.Mesh(geometry, material), null);
    crostFloor.userData.publicUndergroundBlock = 'crost-b1';
    const commercialFloor = setRegionOwner(new T.Mesh(geometry, material), null);
    for (const mesh of [metroFloor, crostFloor, commercialFloor]) {
        mesh.castShadow = true;
    }
    const root = new T.Group().add(metroFloor, crostFloor, commercialFloor);
    const style = new LayerAppearance();
    style.apply(root, false, 'metro-umeda', null, metro);
    assert.equal(metroFloor.material, material);
    assert(crostFloor.visible && crostFloor.material.transparent && crostFloor.material.opacity < .5);
    assert(!crostFloor.material.depthWrite && !crostFloor.castShadow);
    assert(commercialFloor.material.opacity === 1 && commercialFloor.castShadow);
    assert.deepEqual(visibleLabelOccluders(root.children), [metroFloor, commercialFloor]);
    style.setDarkTheme(true);
    style.apply(root, false, 'hanshin-umeda', null, hanshin);
    assert(crostFloor.castShadow && crostFloor.material.depthWrite && crostFloor.material.opacity === 1);
    assert(!metroFloor.castShadow && metroFloor.material.transparent);
    assert.deepEqual(visibleLabelOccluders(root.children), [crostFloor, commercialFloor]);
    style.setDarkTheme(false);
    style.apply(root, false);
    assert([metroFloor, crostFloor, commercialFloor].every(mesh => mesh.castShadow && mesh.material === material));
});
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
