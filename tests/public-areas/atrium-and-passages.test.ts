import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { planAtriumOpenings } from '../../src/application/connections/atrium-openings.ts';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { connectionLanes } from '../../src/application/connections/connection-lanes.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import { facilities, layout, levels } from '../../src/infrastructure/district/geographic-map.ts';
import { jrAxisPoint } from '../../src/infrastructure/stations/jr-osaka/ground-frame.ts';
import { buildFloorGeometry } from '../../src/presentation/models/floor-geometry.ts';
test(
    'North atrium is a shared void with all four bank groups arriving at exterior edges',
    () => {
        const wells = planFloorOpenings(layout.connections, levels, layout.platforms);
        const voids = planAtriumOpenings(layout.atria.filter(a => a.id === 'north-atrium-void'));
        assert.equal(voids.length, 2);
        assert(!voids.some(o => o.level === 'concourse'));
        for (const id of [
            'north-2',
            'north-2-stairs',
            'north-3',
            'north-47',
            'north-48'
        ]) {
            const c = layout.connections.find(c => c.id === id)!;
            assert.equal(c.placement, 'exterior');
            assert(!wells.some(o => o.connectionId === id));
        }
        const floor = layout.areas.find(a => a.id === 'north-2f-public')!;
        const material = new T.MeshBasicMaterial({ side: T.DoubleSide });
        const mesh = (cuts: typeof voids) => {
            const m = new T.Mesh(buildFloorGeometry(floor.outline, cuts.map(o => o.outline), 0.55), material);
            m.updateMatrixWorld();
            return m;
        };
        const center = jrAxisPoint(0, -52);
        const ray = new T.Raycaster(new T.Vector3(center.x, 20, center.z), new T.Vector3(0, -1, 0));
        assert(ray.intersectObject(mesh([])).length > 0);
        assert.equal(ray.intersectObject(mesh(voids.filter(o => o.level === 'platform'))).length, 0);
    }
);
test(
    'the covered 2F plaza, the 3F information desk and the northbound flight to 5F land on public floors',
    () => {
        const plaza = layout.areas.find(a => a.id === 'north-atrium-lower-landing')!;
        for (const across of [-100, -86, -68]) {
            for (const along of [-23, 0, 10]) {
                assert(pointInPolygon(jrAxisPoint(along, across), plaza.outline));
            }
        }
        const desk = facilities.find(f => f.id === 'bridge-north-information')!;
        const bridge = layout.areas.find(a => a.id === 'bridge-north')!;
        assert.equal(desk.level, 'bridge');
        assert.equal(desk.kind, 'information');
        assert(pointInPolygon(desk, bridge.outline));
        assert(!layout.areas.some(a => a.kind === 'paid' && a.level === desk.level && pointInPolygon(desk, a.outline)));
        const escalator = layout.connections.find(c => c.id === 'north-toki-escalator')!;
        const upper = layout.areas.find(a => a.id === 'north-atrium-toki-landing')!;
        assert.equal(escalator.kind, 'escalator');
        assert(escalator.to.z < escalator.from.z);
        assert(pointInPolygon(escalator.from, bridge.outline));
        assert(pointInPolygon(escalator.to, upper.outline));
        assert.equal(levels.find(l => l.id === upper.level)!.label, '5F');
    }
);
test(
    'South Bridge flights fit the staggered slab edge and the building 4F bypass stays level',
    () => {
        const a = layout.connections.find(c => c.id === 'south-15')!;
        const b = layout.connections.find(c => c.id === 'south-stairs-16')!;
        for (const c of [a, b]) {
            assert.equal(c.placement, 'exterior');
            assert(c.from.x !== c.to.x && c.from.z !== c.to.z);
        }
        const ad = new T.Vector2(a.to.x - a.from.x, a.to.z - a.from.z).normalize();
        const bd = new T.Vector2(b.to.x - b.from.x, b.to.z - b.from.z).normalize();
        assert(ad.dot(bd) > 0.999);
        assert.equal(a.lanes, 2);
        assert(b.width! > a.width!);
        const upper = layout.areas.find(area => area.id === 'bridge-south')!;
        const lower = layout.areas.find(area => area.id === 'south-building-3f')!;
        for (const flight of [...connectionLanes(a), b]) {
            assert(pointInPolygon(flight.to, upper.outline), flight.id + ' missing bridge landing');
            assert(pointInPolygon(flight.from, lower.outline), flight.id + ' missing lower lobby');
            const belowEdge = {
                x: flight.to.x + (flight.from.x - flight.to.x) * .025,
                z: flight.to.z + (flight.from.z - flight.to.z) * .025
            };
            assert(!pointInPolygon(belowEdge, upper.outline), flight.id + ' is covered by the bridge edge');
        }
        const link = layout.areas.find(area => area.id === 'south-bridge-4f-link')!;
        const fourth = layout.areas.find(area => area.id === 'south-building-4f')!;
        assert.equal(link.level, upper.level);
        assert.equal(fourth.level, upper.level);
        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            const point = jrAxisPoint(-12 + t * 25, 46.6 + t * 28.4);
            assert([upper, link, fourth].some(area => pointInPolygon(point, area.outline)));
        }
        const front = layout.areas.find(a => a.id === 'south-entrance-deck')!;
        assert.equal(front.level, 'south-deck');
        for (const id of ['south-building-50', 'south-building-stairs-50', 'south-lift-t']) {
            const c = layout.connections.find(c => c.id === id)!;
            assert.equal(c.from.level, 'south-deck');
            assert(pointInPolygon(c.from, front.outline));
        }
    }
);
test(
    'both convenience stores use compact labels and retain separate source floors and paid status',
    () => {
        const stores = facilities.filter(f => f.kind === 'convenience-store');
        assert.equal(stores.length, 2);
        for (const f of stores) {
            assert.equal(f.name, '7-Eleven');
            assert(f.evidence.pages.length > 0);
        }
        const central = stores.find(f => f.level === 'concourse')!;
        const bridge = stores.find(f => f.level === 'bridge')!;
        assert(!layout.areas.some(a => a.level === central.level && a.kind === 'paid' && pointInPolygon(central, a.outline)));
        assert(layout.areas.some(a => a.level === bridge.level && a.kind === 'paid' && pointInPolygon(bridge, a.outline)));
    }
);
