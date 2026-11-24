import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { basements, edges, facilities, layout, levels, nodes } from '../../src/infrastructure/district/geographic-map.ts';
import { geographicOsmData } from '../../src/infrastructure/geography/osm-export.ts';
import { buildGeographicContext } from '../../src/presentation/models/public-areas/geographic-context.ts';
import { buildGeographicBuilding } from '../../src/presentation/models/buildings/geographic-building-model.ts';
import { stationPalettes } from '../../src/presentation/appearance/station-palette.ts';
import { MapModels } from '../../src/presentation/models/map-models.ts';
import { visibleLabelOccluders } from '../../src/presentation/labels/label-occlusion.ts';
import { platformRail } from '../../src/domain/map/rail-geometry.ts';

/** Check vertex data on the meshes installed by the production model builders. */
function assertFiniteMeshes(root: T.Object3D): void {
    root.traverse(object => {
        if (object instanceof T.Mesh) {
            const positions = object.geometry.getAttribute('position');
            assert.ok(positions.array.every(Number.isFinite), object.name);
        }
    });
}

test(
    'geographic runtime assembles finite ground, floors and equipment',
    () => {
        const context = buildGeographicContext();
        for (const group of Object.values(context)) {
            assert.ok(group.children.length);
            assertFiniteMeshes(group);
        }

        const root = new T.Scene();
        const scene = new MapModels({ scene: root, layout, levels, facilities, maxAnisotropy: 1 });
        assertFiniteMeshes(root);
        assert.equal(scene.pickables.length, facilities.length);
        assert.equal(scene.connectors.length, layout.connections.length);
        const loopPlatform = layout.platforms.find(p => p.level === 'platform' && p.tracks.includes(2))!;
        const rail = platformRail(loopPlatform, loopPlatform.tracks.indexOf(2));
        const sleepers = scene.groups.get('platform')!.getObjectByName(`platform-sleepers-${loopPlatform.id}-2`);
        assert(sleepers instanceof T.InstancedMesh && sleepers.count === Math.round(rail.length / 1.8));
        const reference = scene.jrConcourseReference;
        const concourse = scene.groups.get('concourse')!;
        assert.equal(reference.visible, false);
        assert(reference.getObjectByName('central-public') && reference.getObjectByName('public-north-lift-ground-access'));
        assert.equal(reference.getObjectByName('metro-umeda-exit-8-street:landing'), undefined);
        for (const object of reference.children) {
            assert(object instanceof T.Mesh && object.material instanceof T.MeshBasicMaterial);
            assert(object.material.transparent && object.material.opacity < .5 && !object.material.depthWrite);
            assert(!object.castShadow && !object.userData.labelOccluder && !scene.pickables.includes(object));
            assert(concourse.children.some(slab => slab instanceof T.Mesh && slab.geometry === object.geometry));
        }
        reference.visible = true;
        root.updateMatrixWorld(true);
        assert.deepEqual(visibleLabelOccluders(reference.children), []);
        for (const id of ['crost-67', 'public-north-75', 'public-north-lift-b']) {
            const opening = scene.openings.find(o => o.level === 'concourse' && o.connectionId === id)!;
            const center = opening.outline.reduce(
                (p, q) => ({ x: p.x + q.x / opening.outline.length, z: p.z + q.z / opening.outline.length }),
                { x: 0, z: 0 }
            );
            const ray = new T.Raycaster(new T.Vector3(center.x, 6, center.z), new T.Vector3(0, -1, 0), 0, 10);
            assert.equal(ray.intersectObject(reference, true).length, 0, id + ' is blocked by the 1F reference');
        }
        const wall = scene.groups.get('metro-hall')!.getObjectByName('metro-umeda-south-partition-east')!;
        assert(wall instanceof T.Mesh && wall.userData.labelOccluder);
        assert.ok(new T.Box3().setFromObject(wall).getSize(new T.Vector3()).y > 2);
        const ids = new Set(nodes.map(node => node.id));
        for (const edge of edges) {
            assert.ok(ids.has(edge.from) && ids.has(edge.to));
        }
        assert.ok(geographicOsmData().ground.length);
        for (const label of scene.labels) {
            assert(label.text.trim());
            assert(label.position.toArray().every(Number.isFinite));
        }
        const labelsWithIcons = scene.labels.filter(label => label.kind);
        assert.equal(labelsWithIcons.filter(label => label.kind === 'platform').length, layout.platforms.length);
        for (const kind of ['gate', 'ticket', 'convenience-store', 'police', 'luggage-storage', 'locker'] as const) {
            assert(labelsWithIcons.some(label => label.kind === kind && facilities.some(facility =>
                facility.kind === kind && facility.name === label.text && facility.level === label.level
            )), kind);
        }
        for (const p of layout.platforms.filter(p => p.level === 'hankyu-platform')) {
            const slab = scene.groups.get(p.level)!.getObjectByName('platform-slab-' + p.id) as T.Mesh;
            const material = slab.material as T.MeshStandardMaterial;
            assert.equal(material.color.getHex(), stationPalettes['hankyu-umeda'].platform);
            assert.ok(p.lineColor, 'route colours remain separate from the pale chestnut pavement');
        }
        const halls = layout.concourses.map(hall => scene.groups.get(hall.level)!.children.find(model => model.name === hall.id)!);
        assert(halls.length && halls.every(hall => hall?.visible));
        const b1 = scene.groups.get('district-underground')!;
        const basementFloors = scene.basementBuildingFloors;
        assert.deepEqual(basementFloors.map(floor => floor.name), basements.areas.map(area => area.id));
        assert(basementFloors.length && basementFloors.every(floor => floor.parent === b1));
        const basementSlabs = basementFloors.flatMap(floor => floor.children.filter(mesh => mesh.userData.labelOccluder));
        const publicSlabs = b1.children.filter(mesh => mesh.userData.labelOccluder);
        assert(basementSlabs.length && publicSlabs.length);
        assert(publicSlabs.every(mesh => typeof mesh.userData.publicUndergroundBlock === 'string'));
        assert(basementSlabs.every(mesh => !mesh.userData.publicUndergroundBlock));
        scene.updateBuildingFloorVisibility(false);
        assert(basementFloors.every(floor => !floor.visible));
        assert(halls.every(hall => hall.visible));
        assert.deepEqual(visibleLabelOccluders([...basementSlabs, ...publicSlabs]), publicSlabs);
        context.roads.visible = false;
        context.buildings.visible = false;
        scene.updateBuildingFloorVisibility(true);
        assert(halls.every(hall => hall.parent?.visible && hall.visible));
        assert.deepEqual(visibleLabelOccluders(basementSlabs), basementSlabs);
    }
);
test(
    'geographic commercial exteriors separate podiums and towers with finite metre heights',
    () => {
        assert.equal(geographicBuildings.length, 20);
        for (const b of geographicBuildings) {
            assert.ok(b.volumes.length || b.shell);
            for (const v of b.volumes) {
                assert.ok(v.top > v.base && v.top <= 200);
                assert.ok(v.outline.length >= 4);
                assert.ok(v.source.startsWith('https://www.openstreetmap.org/') || v.certainty === 'plateau-lod2');
            }
            const model = buildGeographicBuilding(b);
            assertFiniteMeshes(model);
        }
        const gf = geographicBuildings.find(b => b.id === 'grand-front-south')!;
        assert.equal(gf.volumes[1]!.top, 166);
        assert.equal(gf.volumes[1]!.base, 40);
    }
);
