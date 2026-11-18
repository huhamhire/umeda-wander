import { test } from 'node:test';
import assert from 'node:assert/strict';
import clipping from 'polygon-clipping';
import { createGeographicStation } from '../../src/infrastructure/district/geographic-stations.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { platformOutline } from '../../src/domain/map/geometry.ts';
import type { Point2 } from '../../src/domain/map/model.ts';

/** Convert a metre-frame ring for polygon intersection checks. */
const ring = (points: Point2[]): clipping.Ring => points.map(p => [p.x, p.z]);

test('JR station envelope leaves the original LUCUA buildings clear of track 11', () => {
    const station = createGeographicStation('jr-osaka');
    const platform = station.layout.platforms.find(p => p.id === 'p11')!;
    for (const building of geographicBuildings.filter(b => b.id.startsWith('lucua'))) {
        for (const volume of building.volumes) {
            assert.equal(clipping.intersection([ring(platformOutline(platform))], [ring(volume.outline)]).length, 0, building.id);
        }
    }
});

test('JR atrium banks share an axis and the void fits between the unchanged north buildings', () => {
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

test('JR platform escalators keep their hall landing and a compact flight after metre fitting', () => {
    const station = createGeographicStation('jr-osaka');
    for (const c of station.layout.connections.filter(c => c.kind === 'escalator' && c.platformId)) {
        const height = (n: typeof c.from) => station.levels.find(l => l.id === n.level)!.y + (n.elevationOffset ?? 0);
        const rise = Math.abs(height(c.to) - height(c.from));
        const run = Math.hypot(c.to.x - c.from.x, c.to.z - c.from.z);
        assert(run <= rise / Math.tan(31 * Math.PI / 180) + .1, c.id + ' remains too shallow');
    }
});
