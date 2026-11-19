import assert from 'node:assert/strict';
import { test } from 'node:test';
import { explorationElevation } from '../../src/application/exploration/exploration-level.ts';
import { filterFacilities } from '../../src/application/exploration/facility-filter.ts';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import type { FacilityKind } from '../../src/domain/map/model.ts';
import { facilities, layout, levels, stations } from '../../src/infrastructure/district/geographic-map.ts';
import { facilityCodes } from '../../src/infrastructure/facility-codes.ts';
test(
    'facility type filters intersect the selected station and exploration floor',
    () => {
        const kinds = ['all', ...new Set(facilities.map(f => f.kind))] as (FacilityKind | 'all')[];
        for (const station of stations) {
            for (const level of levels) {
                for (const kind of kinds) {
                    const actual = filterFacilities(facilities, levels, { station: station.id, level: level.id, kind });
                    const expected = facilities.filter(f => {
                        const owner = levels.find(l => l.id === f.level)!;
                        return owner.station === station.id && explorationElevation(owner) === explorationElevation(level) &&
                            (kind === 'all' || kind === f.kind || (kind === 'ticket' && f.kind === 'ticket-machine'));
                    });
                    assert.deepEqual(actual.map(f => f.id), expected.map(f => f.id));
                }
            }
        }
        assert.equal(
            filterFacilities(facilities, levels, { station: null, level: 'all', kind: 'all' }).length,
            facilities.length
        );
        assert(filterFacilities(facilities, levels, { station: 'jr-osaka', level: 'concourse', kind: 'stairs' }).some(f => f.level === 'mezzanine'));
    }
);
test(
    'every directory facility has a unique persistent number independent of filtering order',
    () => {
        const codes = facilities.map(f => facilityCodes[f.id]);
        assert(codes.every(c => /^(JR|HK|M16|HS|T20|Y11|KS|PUB)-\d{3}$/.test(c!)));
        assert.equal(new Set(codes).size, facilities.length);
        assert.equal(facilityCodes['west-gate'], 'JR-001');
        assert.equal(facilityCodes['metro-umeda-north-gate'], 'M16-001');
        for (const f of [...facilities].reverse()) {
            assert.equal(facilityCodes[f.id], codes[facilities.findIndex(v => v.id === f.id)]);
        }
    }
);
test(
    'JR police and baggage services are selectable on their public floors',
    () => {
        const expected = [
            { id: 'railway-police', level: 'concourse', kind: 'police', page: 5 },
            { id: 'crosta-luggage', level: 'concourse', kind: 'luggage-storage', page: 5 },
            { id: 'sakurabashi-lockers', level: 'concourse', kind: 'locker', page: 5 },
            { id: 'midosuji-north-lockers', level: 'concourse', kind: 'locker', page: 5 },
            { id: 'bridge-lucua-lockers', level: 'bridge', kind: 'locker', page: 2 }
        ] as const;
        for (const { id, level, kind, page } of expected) {
            const matching = filterFacilities(facilities, levels, { station: 'jr-osaka', level, kind });
            const facility = matching.find(f => f.id === id);
            assert(facility, id);
            assert.equal(facility.level, level, id);
            assert(facility.evidence.pages.includes(page), id);
            const areas = layout.areas.filter(area => area.level === level && pointInPolygon(facility, area.outline) &&
                !area.holes?.some(hole => pointInPolygon(facility, hole)));
            assert(areas.some(area => area.kind === 'public'), id);
            assert(!areas.some(area => area.kind === 'paid'), id);
        }
    }
);
test(
    'additional baggage markers use their station filters and supported district floors',
    () => {
        const groups = [
            ['hankyu-umeda', 'hankyu', 'hankyu-ground', ['tourist-center-luggage', 'bigman-lockers', 'bus-terminal-lockers']],
            ['hankyu-umeda', 'hankyu', 'hankyu-hall', ['central-lockers', 'chayamachi-lockers']],
            ['hankyu-umeda', 'hankyu', 'hankyu-platform', ['kobe-lockers', 'kyoto-lockers']],
            ['hanshin-umeda', 'hanshin', 'hanshin-hall', ['west-lockers', 'department-lockers']],
            ['hanshin-umeda', 'hanshin', 'hanshin-platform', ['east-lockers']],
            ['metro-umeda', 'metro', 'metro-hall', ['exit-3a-lockers', 'exit-8-lockers', 'exit-9-lockers']],
            ['higashi-umeda', 'tanimachi', 't20-hall', ['north-lockers', 'central-lockers', 'south-lockers']],
            ['nishi-umeda', 'yotsubashi', 'y11-hall', ['north-lockers', 'middle-lockers', 'opus-lockers', 'south-lockers']],
            ['kitashinchi', 'kitashinchi', 'kitashinchi-hall', ['west-lockers', 'east-lockers']]
        ] as const;
        const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
        const elevations = new Map(levels.map(level => [level.id, level.y]));
        for (const [station, source, level, keys] of groups) {
            for (const key of keys) {
                const id = `${station}-${key}`;
                const kind = key === 'tourist-center-luggage' ? 'luggage-storage' : 'locker';
                const matched = filterFacilities(facilities, levels, { station, level, kind });
                const facility = matched.find(f => f.id === id);
                assert(facility, id);
                assert.equal(facility.level, level, id);
                assert.equal(facility.evidence.source, source, id);
                assert(facility.evidence.pages.includes(1), id);
                const expected = key === 'kyoto-lockers' ? 'paid' : 'public';
                const areas = layout.areas.filter(area => elevations.get(area.level) === elevations.get(level) &&
                    pointInPolygon(facility, area.outline) && !area.holes?.some(hole => pointInPolygon(facility, hole)));
                assert(areas.some(area => area.kind === expected), id);
                assert(!areas.some(area => area.kind === (expected === 'paid' ? 'public' : 'paid')), id);
                assert(!openings.some(opening => (opening.level === level ||
                    (opening.level === 'district-underground' && elevations.get(level) === -8)) &&
                    pointInPolygon(facility, opening.outline)), id);
            }
        }
    }
);
test(
    'ticket filter includes counters and machines while every modeled connection landing and platform is selectable',
    () => {
        const sales = filterFacilities(facilities, levels, { station: null, level: 'all', kind: 'ticket' });
        assert(sales.some(f => f.kind === 'ticket'));
        assert(sales.some(f => f.kind === 'ticket-machine'));
        assert(sales.every(f => f.kind === 'ticket' || f.kind === 'ticket-machine'));
        for (const connection of layout.connections) {
            for (const p of [connection.from, connection.to]) {
                assert(
                    facilities.some(f => f.kind === connection.kind && f.level === p.level && Math.hypot(f.x - p.x, f.z - p.z) < 0.01 &&
                        (f.elevationOffset ?? 0) === (p.elevationOffset ?? 0)),
                    `${connection.id}: missing landing candidate`
                );
            }
        }
        for (const platform of layout.platforms) {
            assert(facilities.some(f => f.kind === 'platform' && f.platformId === platform.id));
        }
    }
);
