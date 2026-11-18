import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { buildGeographicBuilding } from '../../src/presentation/models/buildings/geographic-building-model.ts';
import { southDeckCanopies } from '../../src/infrastructure/public-areas/south-decks/canopies.ts';
import { northDeckCanopies } from '../../src/infrastructure/public-areas/north-decks/canopies.ts';
import { buildWalkwayCanopy } from '../../src/presentation/models/public-areas/walkway-canopy-model.ts';
import { createGeographicStation } from '../../src/infrastructure/district/geographic-stations.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import plan from '../../data/geography/runtime-plan.json' with { type: 'json' };
import { toGeographicPlan } from '../../src/domain/map/spatial-block.ts';
import { geographicFrame } from '../../src/infrastructure/geography/frame.ts';

test('HEP landmark has finite red wheel geometry at the official diameter and height', () => {
    const building = geographicBuildings.find(b => b.id === 'hep-five')!;
    const wheel = building.wheel!;
    assert.equal(wheel.radius * 2, 75);
    assert.equal(wheel.centerHeight + wheel.radius, 106);
    assert.equal(wheel.cabins, 52);
    assert(pointInPolygon(wheel.center, building.volumes[0]!.outline));
    const model = buildGeographicBuilding(building);
    const landmark = model.getObjectByName('hep-five-ferris-wheel')!;
    assert(landmark);
    model.updateMatrixWorld(true);
    const street = plan.ground.find(f => f.id === 'way/1228523292')!.geometry;
    assert.equal(street.type, 'LineString');
    const coordinates = street.coordinates as number[][];
    const start = toGeographicPlan({ lon: coordinates[0]![0]!, lat: coordinates[0]![1]! }, geographicFrame);
    const end = toGeographicPlan({ lon: coordinates.at(-1)![0]!, lat: coordinates.at(-1)![1]! }, geographicFrame);
    const streetDirection = new T.Vector3(end.x - start.x, 0, end.z - start.z).normalize();
    const wheelDirection = new T.Vector3(1, 0, 0).transformDirection(landmark.matrixWorld);
    assert(Math.abs(wheelDirection.dot(streetDirection)) > .99999, 'wheel plane must follow the FIVE–NAVIO alley');
    assert(new T.Box3().setFromObject(landmark).min.y > 25, 'wheel sinks through the street');
    const red = landmark.getObjectByName('red-wheel-structure') as T.Mesh;
    assert.equal((red.material as T.MeshStandardMaterial).color.getHex(), 0xb85b61);
    assert(geographicBuildings.some(b => b.id === 'hep-navio'));
});

test('north and south bridge canopies leave a clear walking centreline under their roofs', () => {
    const north = northDeckCanopies();
    assert(north.some(canopy => canopy.id.startsWith('canopy-grand-front-atrium') && canopy.glazed));
    assert(north.some(canopy => canopy.id.startsWith('canopy-yodobashi-west') && canopy.glazed));
    const south = southDeckCanopies();
    assert.equal(south.length, 2);
    const canopies = [...north, ...south];
    for (const canopy of canopies) {
        const model = buildWalkwayCanopy(canopy);
        model.updateMatrixWorld(true);
        const a = canopy.points[0]!;
        const b = canopy.points[1]!;
        const center = new T.Vector3((a.x + b.x) / 2, 1.8, (a.z + b.z) / 2);
        const overhead = new T.Raycaster(center, new T.Vector3(0, 1, 0), 0, 3).intersectObject(model, true);
        assert(overhead.some(hit => hit.object.name === 'walkway-roof-panels'));
        const forward = new T.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
        assert.equal(new T.Raycaster(center, forward, 0, 1).intersectObject(model, true).length, 0);
    }
});

test('Hanshin lift lands directly at the deck junction with a compact upper platform', () => {
    const station = createGeographicStation('hanshin-umeda');
    const lift = station.layout.connections.find(c => c.id.endsWith('south-lift-ground-deck'))!;
    assert(Math.hypot(lift.to.x - 666, lift.to.z - 731) < .01);
    for (const id of ['hanshin-umeda-south-ground', 'hanshin-umeda-south-deck']) {
        const area = station.layout.areas.find(a => a.id === id)!;
        assert(pointInPolygon(lift.to, area.outline));
        const maxEdge = Math.max(...area.outline.map((p, i) => {
            const next = area.outline[(i + 1) % area.outline.length]!;
            return Math.hypot(p.x - next.x, p.z - next.z);
        }));
        assert(maxEdge <= 12.01, 'landing is still scaled to station size');
    }
});

test('Hanshin office keeps four right-angle corners and the retail frontage has no northward box', () => {
    const building = geographicBuildings.find(b => b.id === 'hanshin-dept')!;
    const office = building.volumes.find(v => v.surface === 'tower')!;
    assert.equal(office.outline.length, 4);
    for (let i = 0; i < 4; i++) {
        const a = office.outline[(i + 3) % 4]!;
        const p = office.outline[i]!;
        const b = office.outline[(i + 1) % 4]!;
        assert(Math.abs((a.x - p.x) * (b.x - p.x) + (a.z - p.z) * (b.z - p.z)) < 1e-6);
    }
    const formerProtrusion = { x: 742, z: 749 };
    assert(!pointInPolygon(formerProtrusion, building.volumes[1]!.outline));
});
