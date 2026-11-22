import { MapSession } from '../../src/application/map-session.ts';
import { allowsGroundLayer, viewLayerRole } from '../../src/application/exploration/view-layer.ts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { displayElevation } from '../../src/application/exploration/display-elevation.ts';
import type { StationId } from '../../src/domain/map/model.ts';
import { edges, layout, levels } from '../../src/infrastructure/district/geographic-map.ts';
import { cameraEnvelope, manualZoomSpan } from '../../src/presentation/camera/camera-framing.ts';
import { interpolateCameraPose } from '../../src/presentation/camera/camera-transition.ts';

test('toolbar motion starts at the displayed camera and reaches the exact target on the short compass arc', () => {
    const from = {
        center: new T.Vector3(30, 10, 60),
        span: 100,
        offset: new T.Vector3().setFromSphericalCoords(300, Math.PI / 3, T.MathUtils.degToRad(170))
    };
    const to = {
        center: new T.Vector3(80, 20, 10),
        span: 400,
        offset: new T.Vector3().setFromSphericalCoords(300, Math.PI / 6, T.MathUtils.degToRad(-170))
    };
    assert.equal(interpolateCameraPose(from, to, 0), from);
    assert.equal(interpolateCameraPose(from, to, 1), to);
    const middle = interpolateCameraPose(from, to, .5);
    assert.deepEqual(middle.center.toArray(), [55, 15, 35]);
    assert.equal(middle.span, 200);
    const orientation = new T.Spherical().setFromVector3(middle.offset);
    assert(Math.abs(Math.abs(orientation.theta) - Math.PI) < 1e-9);
    assert(Math.abs(orientation.phi - Math.PI / 4) < 1e-9);
    const zoomOnly = interpolateCameraPose(from, { ...from, span: 100 / 1.18 }, .5);
    assert(zoomOnly.offset.equals(from.offset) && zoomOnly.center.equals(from.center));
    assert(zoomOnly.span > 100 / 1.18 && zoomOnly.span < 100);
});

test('a shallow wide view can zoom out past the automatic vertical fit and zoom in again', () => {
    // The wide desktop overview at 5° needs a larger span than the vertical fit alone allows.
    const baseSpan = 1080;
    const verticalSpan = 380;
    const minimumZoom = baseSpan / verticalSpan;
    const zoomedOut = manualZoomSpan(verticalSpan, 1 / 1.18, verticalSpan, baseSpan, minimumZoom);
    assert(zoomedOut > verticalSpan);
    assert(Math.abs(manualZoomSpan(zoomedOut, 1.18, verticalSpan, baseSpan, minimumZoom) - verticalSpan) < 1e-9);
    assert.equal(manualZoomSpan(verticalSpan, 0.1, verticalSpan, baseSpan, minimumZoom), 760);
});

test('changing viewport fit cannot cause zoom to move in the opposite direction', () => {
    const existingSpan = 1200;
    assert.equal(manualZoomSpan(existingSpan, 0.9, 500, 600, 1.2), existingSpan);
    assert.equal(manualZoomSpan(existingSpan, 2, 500, 600, 1.2), 600);
});
test(
    'floor cuts retain an identical camera envelope within each station focus',
    () => {
        for (const station of [
            null,
            'jr-osaka',
            'hankyu-umeda',
            'metro-umeda',
            'hanshin-umeda',
            'higashi-umeda',
            'nishi-umeda',
            'kitashinchi'
        ] as (StationId | null)[]) {
            for (const explode of [0, 0.48, 1]) {
                const elevation = (id: typeof levels[number]['id']) => displayElevation(levels, id, explode);
                const all = cameraEnvelope(layout, levels, { level: 'all', focusStation: station }, elevation).map(p => p.toArray());
                assert.ok(all.length > 0, station ?? 'district');
                for (const level of levels) {
                    assert.deepEqual(
                        cameraEnvelope(layout, levels, { level: level.id, focusStation: station }, elevation).map(p => p.toArray()),
                        all
                    );
                }
            }
        }
    }
);

test(
    'station focus changes framing and applies the station’s default floor selection',
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
    }
);

test('ground visibility follows underground station defaults and manual exploration levels', () => {
    const session = new MapSession(edges);
    for (const station of ['metro-umeda', 'hanshin-umeda', 'higashi-umeda', 'nishi-umeda', 'kitashinchi'] as const) {
        session.focusStation(station);
        assert(!allowsGroundLayer(levels, session.state), station);
        assert(!allowsGroundLayer(levels, { ...session.state, level: 'all' }), station);
    }
    for (const level of ['underground-platform', 'metro-intermediate', 'metro-platform'] as const) {
        assert(!allowsGroundLayer(levels, { level }), level);
    }
    for (const level of ['concourse', 'mezzanine', 'bridge', 'all'] as const) {
        assert(allowsGroundLayer(levels, { level }), level);
    }
    session.focusStation(null);
    assert(allowsGroundLayer(levels, session.state));
});
