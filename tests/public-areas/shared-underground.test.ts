import { platformLocalPoint, platformOutline } from '../../src/domain/map/geometry.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import clipping from 'polygon-clipping';
import { layout, levels, removedPublicAreas } from '../../src/infrastructure/district/geographic-map.ts';
import { displayElevation } from '../../src/application/exploration/display-elevation.ts';
import { geographicRoofHeightAt } from '../../src/presentation/models/stations/roof-profile.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';

const ring = (p: {
    x: number;
    z: number;
}[]) => p.map(p => [p.x, p.z] as [
    number,
    number
]);
test(
    'shared B1 public geometry has one owner and the same surface elevation as station halls',
    () => {
        assert.ok(removedPublicAreas.includes('hanshin-umeda-north-public'));
        assert.ok(!layout.areas.some(a => a.kind === 'public' && a.level !== 'district-underground' && levels.find(l => l.id === a.level)!.y === -8));
        const shared = layout.areas.filter(a => a.level === 'district-underground');
        assert.ok(shared.length);
        const paid = layout.areas.filter(a => a.kind === 'paid' && levels.find(l => l.id === a.level)!.y === -8);
        const publicGeometry = shared.map(a => [a.outline, ...a.holes ?? []].map(ring));
        for (const a of paid) {
            const intersections = clipping.intersection(publicGeometry, [[ring(a.outline), ...a.holes?.map(ring) ?? []]]);
            assert.equal(intersections.length, 0);
        }
        for (const explode of [0, .5, 1]) {
            for (const l of levels.filter(l => l.y === -8)) {
                assert.equal(
                    displayElevation(levels, l.id, explode),
                    displayElevation(levels, 'district-underground', explode)
                );
            }
        }
    }
);
test(
    'west paid walkway restores 92/93 and AB/AC without becoming a B1 public shortcut',
    () => {
        for (const id of ['west-92', 'umekita-93', 'walkway-ab', 'walkway-ac']) {
            assert.ok(layout.connections.some(c => c.id === id));
        }
        const area = layout.areas.find(a => a.id === 'underground-walkway')!;
        assert.equal(area.kind, 'paid');
        assert.equal(area.level, 'underground-platform');
    }
);
test(
    'fitted railway corridors extend all seven stations without requiring exact OSM endpoints',
    () => {
        for (const id of [
            'jr-osaka',
            'hankyu-umeda',
            'metro-umeda',
            'hanshin-umeda',
            'higashi-umeda',
            'nishi-umeda',
            'kitashinchi'
        ]) {
            const rails = layout.railApproaches.filter(r => r.station === id && r.id.startsWith('map-rail-'));
            assert.ok(rails.length, id);
            assert.ok(rails.every(r => r.evidence.detail.includes('OSM is a broad direction reference only')));
        }
    }
);
test(
    'north roof meets the retail roof and JP tower has no acute clipped corner',
    () => {
        assert.equal(26 + geographicRoofHeightAt(-36), 49.3);
        assert.ok(geographicRoofHeightAt(-36) > geographicRoofHeightAt(36));
        const jp = geographicBuildings.find(b => b.id === 'jp-tower')!.volumes[1]!.outline;
        assert.equal(jp.length, 4);
        for (let i = 0; i < 4; i++) {
            const p = jp[i]!;
            const a = jp[(i + 3) % 4]!;
            const b = jp[(i + 1) % 4]!;
            assert.ok(Math.abs((a.x - p.x) * (b.x - p.x) + (a.z - p.z) * (b.z - p.z)) < 1e-6);
        }
        assert.equal(geographicBuildings.find(b => b.id === 'daimaru')!.volumes[1]!.holes.length, 2);
    }
);
test(
    'Umekita hall and west-link upper landings stay inside the paid floor after relocation',
    () => {
        for (const id of [
            'umekita-94',
            'umekita-95',
            'umekita-96',
            'umekita-97',
            'umekita-ad',
            'umekita-ae',
            'umekita-93',
            'walkway-ac'
        ]) {
            const c = layout.connections.find(c => c.id === id)!;
            const upper = [c.from, c.to].find(n => n.level === 'underground-hall')!;
            assert.ok(
                layout.areas.some(a => a.level === upper.level && a.kind === 'paid' && pointInPolygon(upper, a.outline)),
                id
            );
            if (c.kind === 'elevator') {
                assert.equal(c.from.x, c.to.x);
                assert.equal(c.from.z, c.to.z);
            }
        }
    }
);
test(
    'west walkway arrival stays outside Umekita platform tracks and keeps paired banks beside AC',
    () => {
        const platform = layout.platforms.find(p => p.id === 'p21-22')!;
        for (const id of ['umekita-93', 'walkway-ac']) {
            const c = layout.connections.find(c => c.id === id)!;
            for (const n of [c.from, c.to]) {
                assert.ok(platformLocalPoint(platform, n).z > platform.width / 2 + 4, id + ' crosses track envelope');
            }
        }
        const bank = layout.connections.find(c => c.id === 'umekita-93')!;
        assert.equal(bank.lanes, 2);
        assert.ok(layout.connections.some(c => c.id === 'umekita-93-stairs'));
        const floor = layout.areas.find(a => a.id === 'walkway-ac-b2-bay')!;
        for (const p of layout.platforms.filter(p => p.level === 'underground-platform')) {
            assert.equal(clipping.intersection([[ring(floor.outline)]], [[ring(platformOutline(p))]]).length, 0);
        }
    }
);

test(
    'JR retains three Central Court to Crost flights separately from the paid west link',
    () => {
        for (const id of ['crost-67', 'crost-stairs-68', 'crost-stairs-69']) {
            const c = layout.connections.find(c => c.id === id);
            assert.ok(c, id);
            assert.deepEqual(new Set([c.from.level, c.to.level]), new Set(['concourse', 'underground-hall']));
            const lower = c.from.level === 'underground-hall' ? c.from : c.to;
            assert.ok(layout.areas.some(a => a.level === 'district-underground' && pointInPolygon(lower, a.outline)));
        }
    }
);
