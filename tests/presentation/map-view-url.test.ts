import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { NavigationData } from '../../src/application/exploration/navigation-data.ts';
import { bindMapViewUrl, mapViewUrl, readMapView, type SharedMapView } from '../../src/presentation/camera/map-view-url.ts';

const data: NavigationData = {
    levels: [{ id: 'concourse', label: '1F', name: 'Hall', y: 0, description: '' }],
    stations: [{ id: 'jr-osaka', name: 'Osaka' }],
    facilities: [{ id: 'entry', level: 'concourse', name: 'Entrance', kind: 'entrance' }],
    walkingPlaces: [
        { id: 'entry', name: 'Entrance', level: 'concourse', station: 'jr-osaka', access: 'outside' },
        { id: 'hall', name: 'Hall', level: 'concourse', station: 'jr-osaka', access: 'outside' }
    ]
};

const view: SharedMapView = {
    camera: { center: [694.12, 31.75, 350.961], yaw: -121.32, pitch: 62.14, zoom: 1.5, span: 342.248 },
    level: 'concourse',
    station: 'jr-osaka',
    facility: 'entry',
    explode: 0.75,
    buildings: false,
    ground: false,
    tab: 'facilities',
    filters: { station: 'jr-osaka', level: 'concourse', kind: 'entrance' },
    itinerary: { ids: ['entry', 'hall'], allowPaid: false }
};

test('shared map URLs round-trip the rendered frame and state without replacing other parameters', () => {
    const address = new URL('https://example.test/maps/index.html?lang=ja&ref=a&ref=b#atlas');
    const next = mapViewUrl(address, view);
    assert.equal(next.pathname, address.pathname);
    assert.equal(next.hash, address.hash);
    assert.equal(next.searchParams.get('lang'), 'ja');
    assert.deepEqual(next.searchParams.getAll('ref'), ['a', 'b']);
    assert(!address.searchParams.has('view'));
    assert.deepEqual(readMapView(next, data), view);
    assert.equal(readMapView(mapViewUrl(address, { ...view, camera: { ...view.camera, yaw: -121.3199999 } }), data)?.camera.yaw, -121.32);
});

test('invalid camera or version cannot poison the shared view and obsolete IDs fall back in place', () => {
    const address = mapViewUrl(new URL('https://example.test/'), view);
    const original = JSON.parse(address.searchParams.get('view')!);
    for (const invalid of [null, { ...original, v: 2 }, { ...original, camera: { ...view.camera, pitch: 90 } },
        { ...original, camera: { ...view.camera, center: [1, '2', 3] } }, { ...original, camera: { ...view.camera, span: 0 } }]) {
        address.searchParams.set('view', JSON.stringify(invalid));
        assert.equal(readMapView(address, data), undefined);
    }
    address.searchParams.set('view', 'bad json');
    assert.equal(readMapView(address, data), undefined);
    address.searchParams.set('view', JSON.stringify({
        ...original,
        station: 'missing',
        level: 'missing',
        facility: 'missing',
        filters: { station: 'missing', level: 'missing', kind: 'missing' },
        itinerary: { ids: ['entry', 'missing'] }
    }));
    assert.deepEqual(readMapView(address, data), {
        ...view,
        station: null,
        level: 'all',
        facility: undefined,
        filters: { station: null, level: 'all', kind: 'all' },
        itinerary: undefined
    });
});

test('rapid changes queue one address replacement and an unsettled frame never writes', () => {
    const location = { href: 'https://example.test/?lang=ja' };
    const historyState = { test: true };
    const writes: URL[] = [];
    const timers = new Map<number, () => void>();
    let lastTimer = 0;
    let current: SharedMapView | undefined;
    const browser = {
        location,
        history: {
            state: historyState,
            replaceState(state: unknown, _title: string, url: URL) {
                assert.equal(state, historyState);
                writes.push(url);
                location.href = url.href;
            }
        },
        setTimeout(callback: () => void, delay: number) {
            assert.equal(delay, 180);
            timers.set(++lastTimer, callback);
            return lastTimer;
        },
        clearTimeout(id: number) {
            timers.delete(id);
        }
    } as unknown as Parameters<typeof bindMapViewUrl>[1];
    const changed = bindMapViewUrl(() => current, browser);
    changed();
    timers.get(lastTimer)!();
    assert.equal(writes.length, 0);
    timers.clear();
    current = view;
    changed();
    changed();
    assert.equal(timers.size, 1);
    assert.equal(writes.length, 0);
    timers.get(lastTimer)!();
    assert.equal(writes.length, 1);
    assert.deepEqual(readMapView(writes[0]!, data), view);
    changed();
    timers.get(lastTimer)!();
    assert.equal(writes.length, 1);
});
