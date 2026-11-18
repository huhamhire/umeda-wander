import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { edges, facilities, geographicOsmData, layout, levels, nodes } from '../../src/infrastructure/district/geographic-map.ts';
import { buildGeographicContext } from '../../src/presentation/models/public-areas/geographic-context.ts';
import { buildGeographicBuilding } from '../../src/presentation/models/buildings/geographic-building-model.ts';
import { stationPalettes } from '../../src/presentation/appearance/station-palette.ts';
import { MapModels } from '../../src/presentation/models/map-models.ts';

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
        const ids = new Set(nodes.map(node => node.id));
        for (const edge of edges) {
            assert.ok(ids.has(edge.from) && ids.has(edge.to));
        }
        assert.ok(geographicOsmData().ground.length);
        for (const label of scene.labels) {
            assert(label.text.trim());
            assert(label.position.toArray().every(Number.isFinite));
        }
        for (const p of layout.platforms.filter(p => p.level === 'hankyu-platform')) {
            const slab = scene.groups.get(p.level)!.getObjectByName('platform-slab-' + p.id) as T.Mesh;
            const material = slab.material as T.MeshStandardMaterial;
            assert.equal(material.color.getHex(), stationPalettes['hankyu-umeda'].platform);
            assert.ok(p.lineColor, 'route colours remain separate from the pale chestnut pavement');
        }
        for (const hall of layout.concourses) {
            assert.ok(
                scene.geographicBuildingFloors.some((model) => model.name === hall.id),
                '1F hall must follow the ground visibility switch'
            );
        }
    }
);
test(
    'geographic commercial exteriors separate podiums and towers with finite metre heights',
    () => {
        assert.equal(geographicBuildings.length, 13);
        for (const b of geographicBuildings) {
            assert.ok(b.volumes.length);
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
