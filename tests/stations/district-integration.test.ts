import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { displayElevation } from '../../src/application/display-elevation.ts';
import { MapSession } from '../../src/application/map-session.ts';
import { viewLayerRole } from '../../src/application/view-layer.ts';
import { edges, layout, levels } from '../../src/infrastructure/district/geographic-map.ts';
import { cameraEnvelope } from '../../src/presentation/camera-framing.ts';
test(
    'two navigation tabs share station focusing through the facility station dropdown',
    () => {
        const html = readFileSync(new URL('../../src/index.html', import.meta.url), 'utf8');
        assert(!html.includes('station-picker'));
        assert(!html.includes('data-route='));
        assert.deepEqual([...html.matchAll(/id="(tab-[^"]+)"/g)].map(m => m[1]), ['tab-layers', 'tab-facilities']);
        assert.equal([...html.matchAll(/id="facility-station"/g)].length, 1);
        assert(!html.includes('panel-stations'));
        assert(!html.includes('data-focus='));
    }
);
test(
    'station focus changes framing while all three station scenes remain visible',
    () => {
        const session = new MapSession(edges);
        const initialExplode = session.state.explode;
        const all = cameraEnvelope(layout, levels, session.state, id => displayElevation(levels, id, initialExplode));
        for (const station of ['jr-osaka', 'hankyu-umeda', 'metro-umeda'] as const) {
            session.focusStation(station);
            assert.equal(session.state.explode, initialExplode);
            if (station === 'metro-umeda') {
                assert.equal(session.state.level, 'metro-hall');
                assert.equal(viewLayerRole(levels, session.state, 'metro-hall'), 'current');
                assert.equal(viewLayerRole(levels, session.state, 'metro-intermediate'), 'current');
                assert.equal(viewLayerRole(levels, session.state, 'metro-platform'), 'context');
                assert.equal(viewLayerRole(levels, session.state, 'hankyu-platform'), 'hidden');
            }
            else {
                assert.equal(session.state.level, 'all');
                for (const level of levels) {
                    assert.equal(viewLayerRole(levels, session.state, level.id), 'normal');
                }
            }
            const focused = cameraEnvelope(layout, levels, session.state, id => displayElevation(levels, id, initialExplode));
            assert(focused.length > 0 && focused.length < all.length);
            assert(focused.every(p => p.toArray().every(Number.isFinite)));
        }
        session.focusStation(null);
        assert.equal(
            cameraEnvelope(layout, levels, session.state, id => displayElevation(levels, id, initialExplode)).length,
            all.length
        );
    }
);
test(
    'underground layer focus preserves lower structures across the shared district',
    () => {
        assert.equal(
            viewLayerRole(levels, { level: 'metro-hall', focusStation: 'metro-umeda' }, 'underground-platform'),
            'context'
        );
        assert.equal(viewLayerRole(levels, { level: 'metro-hall' }, 'hankyu-platform'), 'hidden');
        const points = cameraEnvelope(
            layout,
            levels,
            { level: 'metro-hall', focusStation: 'hankyu-umeda' },
            id => displayElevation(levels, id, 0.5)
        );
        assert(points.length > 0, 'framing falls back safely if focused station is above a selected cut plane');
    }
);
