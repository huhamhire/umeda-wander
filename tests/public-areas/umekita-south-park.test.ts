import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { parkTerrainElevation } from '../../src/domain/map/park-terrain.ts';
import { elevated, exteriorOpenings, layout } from '../../src/infrastructure/district/geographic-map.ts';
import { grandGreenSouthBuildings } from '../../src/infrastructure/buildings/grand-green-south/index.ts';
import { buildGeographicBuilding } from '../../src/presentation/models/buildings/geographic-building-model.ts';
import { buildGeographicContext } from '../../src/presentation/models/public-areas/geographic-context.ts';
import { buildParkLandscape } from '../../src/presentation/models/public-areas/park-landscape-model.ts';
import { buildParkPavilion } from '../../src/presentation/models/public-areas/park-pavilion-model.ts';

test('the South Park water and paving follow the fitted ground without covering stair landings', () => {
    const park = layout.parks.find(item => item.id === 'umekita-south-park')!;
    const landscape = buildParkLandscape(park);
    const context = buildGeographicContext([park.outline]);
    const water = new T.Raycaster(new T.Vector3(124, 4, 485), new T.Vector3(0, -1, 0));
    assert.equal(water.intersectObject(context.roads).length, 0);
    assert.equal(water.intersectObject(landscape.getObjectByName('park-ground')!).length, 0);
    assert.ok(Math.abs(water.intersectObject(landscape.getObjectByName('pond')!)[0]!.point.y - park.landform.pondY) < .01);
    assert.ok(parkTerrainElevation(park, { x: 158, z: 503 }) > parkTerrainElevation(park, { x: 117, z: 490 }));

    const paths = landscape.children.filter(child => child.name === 'park-path');
    const landing = new T.Raycaster(new T.Vector3(142.42, 4, 435.32), new T.Vector3(0, -1, 0));
    const height = landing.intersectObjects(paths)[0]!.point.y;
    assert.ok(Math.abs(height + .85) < .25, 'paving must meet the existing 1F apron');
});

test('the LOD2 roof remains open and clear of the existing park bridge', () => {
    const park = layout.parks.find(item => item.id === 'umekita-south-park')!;
    const roof = buildParkPavilion(park.pavilions!.find(item => item.id === 'great-roof')!);
    const underside = new T.Raycaster(new T.Vector3(169, 1, 539), new T.Vector3(0, 1, 0));
    assert.ok(underside.intersectObject(roof)[0]!.point.y > 4);
    const deck = elevated.blocks.find(block => block.id === 'west-decks')!.paths.find(path => path.id === 'umekita-public:1313936486')!;
    const from = new T.Vector3();
    const ray = new T.Raycaster(from, new T.Vector3(0, 1, 0), 0, 2.5);
    for (let i = 1; i < deck.points.length; i++) {
        const a = deck.points[i - 1]!;
        const b = deck.points[i]!;
        const length = Math.hypot(b.x - a.x, b.z - a.z);
        const samples = Math.ceil(length);
        for (let j = 0; j <= samples; j++) {
            const t = j / samples;
            for (const offset of [-2, 0, 2]) {
                const x = a.x + (b.x - a.x) * t + offset * (b.z - a.z) / length;
                const z = a.z + (b.z - a.z) * t - offset * (b.x - a.x) / length;
                ray.ray.origin.set(x, 8, z);
                assert.equal(ray.intersectObject(roof).length, 0);
            }
        }
    }
});

test('the South Building exterior leaves the Inogate landing and open garden usable', () => {
    const gateTower = grandGreenSouthBuildings.find(building => building.id === 'grand-green-south-gate')!;
    const shell = buildGeographicBuilding(gateTower, exteriorOpenings);
    const door = elevated.portals.find(portal => portal.target === gateTower.id)!;
    const bridge = new T.Raycaster(new T.Vector3(door.point.x, 8.7, door.point.z), new T.Vector3(0, 1, 0), .01, 3.5);
    assert.equal(bridge.intersectObject(shell).length, 0);
    const stairs = layout.connections.filter(item => item.id.startsWith('umekita-sunken-garden-'));
    for (const stair of stairs) {
        const landing = new T.Raycaster(new T.Vector3(stair.to.x, .65, stair.to.z), new T.Vector3(0, 1, 0));
        assert.equal(landing.intersectObject(shell).length, 0);
    }
});
