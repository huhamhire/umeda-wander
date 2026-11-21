import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import { grandFrontPlazaAccess, layout, levels, undergroundPublicAreas } from '../../src/infrastructure/district/geographic-map.ts';
test(
    'JR-facing Grand Front plaza banks retain sourced 1F–B1 relationships and supported public landings',
    () => {
        const equipment = grandFrontPlazaAccess.connections;
        assert.equal(equipment.filter(c => c.kind === 'escalator').length, 2);
        const stair = equipment.find(c => c.kind === 'stairs')!;
        assert.equal(stair.width, 6);
        for (const c of equipment) {
            assert.equal(c.blockId, 'north-atrium-b1');
            assert.equal(c.from.level, 'district-underground');
            assert.equal(c.to.level, 'district-ground');
            assert.ok(c.evidence.urls?.some(url => url.includes('/floor/umekita/b1f')));
            const run = Math.hypot(c.from.x - c.to.x, c.from.z - c.to.z);
            const slope = Math.atan2(8, run) * 180 / Math.PI;
            assert.ok(slope > 18 && slope < 31, 'do not stretch a shallow flight across the plaza');
            assert.ok(undergroundPublicAreas.some(a => pointInPolygon(c.from, a.outline) &&
                !a.holes?.some(h => pointInPolygon(c.from, h))));
            assert.ok(!layout.areas.some(a => a.kind === 'paid' && levels.find(l => l.id === a.level)!.y === -8 &&
                pointInPolygon(c.from, a.outline)));
        }
    }
);
