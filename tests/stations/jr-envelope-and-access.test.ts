import { test } from 'node:test';
import assert from 'node:assert/strict';
import clipping from 'polygon-clipping';
import { createGeographicStation } from '../../src/infrastructure/district/geographic-stations.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { platformOutline, pointInPolygon } from '../../src/domain/map/geometry.ts';
import type { Point2 } from '../../src/domain/map/model.ts';
import { elevatedAreas } from '../../src/infrastructure/district/geographic-map.ts';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { jrAxisPoint } from '../../src/infrastructure/stations/jr-osaka/ground-frame.ts';

/** Convert a metre-frame ring for polygon intersection checks. */
const ring = (points: Point2[]): clipping.Ring => points.map(p => [p.x, p.z]);

test('North Gate Building volumes leave JR platform 11 clear', () => {
    const station = createGeographicStation('jr-osaka');
    const platform = station.layout.platforms.find(p => p.id === 'p11')!;
    for (const building of geographicBuildings.filter(b => b.id.startsWith('lucua'))) {
        for (const volume of building.volumes) {
            assert.equal(clipping.intersection([ring(platformOutline(platform))], [ring(volume.outline)]).length, 0, building.id);
        }
    }
});

test('JR atrium banks share an axis and their openings fit between the north wings', () => {
    const station = createGeographicStation('jr-osaka');
    const angle = station.layout.platforms[0]!.rotationRad;
    const banks = station.layout.connections.filter(c => /^north-(2|2-stairs|3|47|48)$/.test(c.id));
    assert.equal(banks.length, 5);
    for (const c of banks) {
        const dx = c.to.x - c.from.x;
        const dz = c.to.z - c.from.z;
        assert(Math.abs(dx * Math.cos(angle) + dz * Math.sin(angle)) < 1e-7, c.id);
        assert(Math.hypot(dx, dz) < 16, c.id + ' has an overlong flight');
        for (const node of [c.from, c.to]) {
            const registered = station.nodes.find(n => n.id === node.id)!;
            assert(Math.hypot(registered.x - node.x, registered.z - node.z) < 1e-7);
        }
    }
    const voids = station.layout.atria!.find(a => a.id === 'north-atrium-void')!;
    for (const opening of voids.openings) {
        for (const building of geographicBuildings.filter(b => b.id.startsWith('lucua'))) {
            assert.equal(clipping.intersection([ring(opening.outline)], [ring(building.volumes[0]!.outline)]).length, 0, building.id);
        }
    }
});

test('North Gate Building retains an open north atrium, low east wing and west office tower', () => {
    const east = geographicBuildings.find(b => b.id === 'lucua')!;
    const west = geographicBuildings.find(b => b.id === 'lucua-1100')!;
    const entrance = jrAxisPoint(0, -95);
    const spans = [...east.volumes, ...west.volumes].filter(v => pointInPolygon(entrance, v.outline));
    assert(spans.some(v => v.base >= 40 && v.top < 55), 'raised lintel is missing');
    assert(spans.every(v => v.base > 30), 'lower shell blocks the atrium mouth');
    assert.equal(Math.max(...east.volumes.map(v => v.top)), 77);
    assert.equal(Math.max(...west.volumes.map(v => v.top)), 152.6);
});

test('JR platform escalators keep their hall landing and a compact flight after metre fitting', () => {
    const station = createGeographicStation('jr-osaka');
    for (const c of station.layout.connections.filter(c => c.kind === 'escalator' && c.platformId)) {
        const height = (n: typeof c.from) => station.levels.find(l => l.id === n.level)!.y + (n.elevationOffset ?? 0);
        const rise = Math.abs(height(c.to) - height(c.from));
        const run = Math.hypot(c.to.x - c.from.x, c.to.z - c.from.z);
        assert(run <= rise / Math.tan(31 * Math.PI / 180) + .1, c.id + ' remains too shallow');
    }
});

test('LUCUA (ルクア) trackside gallery overlaps platform 11 from above and descends outside to the 2F public deck', () => {
    const station = createGeographicStation('jr-osaka');
    const { areas, platforms, connections } = station.layout;
    const gallery = areas.find(area => area.id === 'lucua-trackside-gallery')!;
    const bridge = areas.find(area => area.id === 'bridge-north')!;
    const landing = areas.find(area => area.id === 'lucua-carillon-landing')!;
    const turn = areas.find(area => area.id === 'lucua-carillon-stair-turn')!;
    const platform = platforms.find(p => p.id === 'p11')!;
    const upper = connections.find(c => c.id === 'carillon-66-upper-flight')!;
    const lower = connections.find(c => c.id === 'carillon-66-lower-flight')!;
    assert.equal(gallery.level, 'bridge');
    assert.equal(platform.level, landing.level);
    assert(pointInPolygon(jrAxisPoint(110, -34.2), gallery.outline));
    assert(pointInPolygon(jrAxisPoint(110, -34.2), platformOutline(platform)));
    assert.equal(clipping.union([ring(gallery.outline)], [ring(bridge.outline)]).length, 1);
    assert(hasNorthDeckConnection());
    assert(pointInPolygon(lower.from, areas.find(area => area.id === 'north-2f-public')!.outline));
    assert(pointInPolygon(upper.from, turn.outline));
    assert(pointInPolygon(lower.to, turn.outline));
    assert.equal(upper.from.elevationOffset, turn.elevationOffset);
    assert.equal(lower.to.elevationOffset, turn.elevationOffset);
    assert.equal(upper.to.level, gallery.level);
    assert.equal(upper.placement, 'exterior');
    assert.deepEqual(planFloorOpenings([upper, lower], station.levels, platforms), []);
    assert.equal(upper.platformId, undefined);
    assert.equal(lower.platformId, undefined);

    /** The district 2F surface and the station forecourt share a continuous edge. */
    function hasNorthDeckConnection(): boolean {
        return elevatedAreas.some(area => area.blockId === 'north-decks'
            && clipping.union([ring(landing.outline)], [ring(area.outline), ...area.holes?.map(ring) ?? []]).length === 1);
    }
});
