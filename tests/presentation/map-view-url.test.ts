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
    camera: { center: [694.12, 31.75, 350.961], yaw: -121.32, pitch: 62.14, span: 342.248 },
    level: 'concourse',
    station: 'jr-osaka',
    facility: 'entry',
    explode: 0.75,
    buildings: false,
    ground: false,
    itinerary: { ids: ['entry', 'hall'], allowPaid: true }
};

test('shared map URLs round-trip the rendered frame and state without replacing other parameters', () => {
    const address = new URL('https://example.test/maps/index.html?lang=ja&ref=a&ref=b&view=1&view.yaw=12#atlas');
    const next = mapViewUrl(address, view);
    assert.equal(next.pathname, address.pathname);
    assert.equal(next.hash, address.hash);
    assert.equal(next.searchParams.get('lang'), 'ja');
    assert.deepEqual(next.searchParams.getAll('ref'), ['a', 'b']);
    assert.equal(address.searchParams.get('view.yaw'), '12');
    assert(![...next.searchParams.keys()].some(key => key === 'view' || key.startsWith('view.')));
    assert.equal(next.searchParams.get('yaw'), '-121.32');
    assert.equal(next.searchParams.get('allow-paid'), '1');
    assert.deepEqual(next.searchParams.getAll('stop'), ['entry', 'hall']);
    assert.deepEqual(readMapView(next, data), view);
    assert.equal(readMapView(mapViewUrl(address, { ...view, camera: { ...view.camera, yaw: -121.3199999 } }), data)?.camera.yaw, -121.32);
});

test('invalid or incomplete cameras are rejected and obsolete IDs fall back in place', () => {
    const original = mapViewUrl(new URL('https://example.test/'), view);
    for (const [key, value] of [
        ['pitch', '90'], ['x', 'bad'], ['y', ''], ['yaw', 'Infinity'], ['span', '0']
    ] as const) {
        const address = new URL(original);
        address.searchParams.set(key, value);
        assert.equal(readMapView(address, data), undefined);
    }
    assert.equal(readMapView(new URL('https://example.test/?view=1&view.x=1'), data), undefined);
    for (const name of ['station', 'level', 'facility']) {
        original.searchParams.set(name, 'missing');
    }
    original.searchParams.append('stop', 'missing');
    assert.deepEqual(readMapView(original, data), {
        ...view,
        station: null,
        level: 'all',
        facility: undefined,
        itinerary: undefined
    });
});

test('integrators can use camera-only parameters and replace individual settings', () => {
    const address = new URL('https://example.test/?x=694&y=32&z=351&yaw=45&pitch=62&span=342');
    const parsed = readMapView(address, data)!;
    assert.equal(parsed.camera.yaw, 45);
    assert.equal(parsed.level, 'all');
    assert.equal(parsed.buildings, true);
    const prior = mapViewUrl(address, view);
    const edited = mapViewUrl(prior, parsed);
    assert.deepEqual([...edited.searchParams.keys()], ['x', 'y', 'z', 'yaw', 'pitch', 'span']);
    assert.deepEqual(readMapView(edited, data), parsed);
    const itinerary = { ids: ['hall', 'entry'], allowPaid: false };
    const route = mapViewUrl(prior, { ...parsed, itinerary });
    assert(!route.searchParams.has('allow-paid'));
    assert.deepEqual(readMapView(route, data)?.itinerary, itinerary);
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
