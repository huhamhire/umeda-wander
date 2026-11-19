import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { WalkingPlace } from '../../src/application/navigation/walking-route.ts';
import { bindWalkingRoutePanel } from '../../src/presentation/components/walking-route-panel.ts';

class Field extends EventTarget {
    children: Field[] = [];
    attributes = new Map<string, string>();
    value: string;
    textContent: string;
    hidden = false;
    disabled = false;
    checked = false;
    id = '';

    constructor(text = '', value = '') {
        super();
        this.textContent = text;
        this.value = value;
    }

    append(...children: Field[]): void { this.children.push(...children); }
    replaceChildren(...children: Field[]): void { this.children = children; }
    setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
    removeAttribute(name: string): void { this.attributes.delete(name); }
    focus(): void { this.dispatchEvent(new Event('focus')); }
    select(): void {}
    click(): void { this.dispatchEvent(new Event('click')); }
}

test('walking endpoints can be searched, filtered, cleared in place and chosen on the map', t => {
    const ids = [
        'walking-places', 'walking-add', 'walking-station', 'walking-floor', 'walking-kind',
        'walking-pick', 'walking-map-choice', 'walking-confirm', 'walking-cancel', 'walking-pick-status',
        'walking-results', 'walking-search-status', 'walking-gates', 'walking-preview', 'walking-clear', 'walking-status'
    ];
    const elements = new Map(ids.map(id => [id, Object.assign(new Field(), { id })]));
    const panel = { querySelector: (selector: string) => elements.get(selector.slice(1)) };
    const timers = new Map<number, () => void>();
    let clock = 0;
    const window = {
        setTimeout: (fn: () => void) => {
            timers.set(++clock, fn);
            return clock;
        },
        clearTimeout: (key: number) => timers.delete(key)
    };
    const document = { createElement: () => new Field(), createElementNS: () => new Field() };
    for (const [key, value] of Object.entries({ window, document, Option: Field })) {
        Object.defineProperty(globalThis, key, { configurable: true, value });
    }
    t.after(() => {
        for (const key of ['window', 'document', 'Option']) {
            Reflect.deleteProperty(globalThis, key);
        }
    });
    const places: WalkingPlace[] = [
        { id: 'a', name: '中央入口', level: 'concourse', station: 'jr-osaka', access: 'outside', kind: 'entrance' },
        { id: 'b', name: '南改札外', level: 'concourse', station: 'jr-osaka', access: 'outside' }
    ];
    let pickPoint: ((id: string) => void) | undefined;
    const planner = bindWalkingRoutePanel(
        panel as unknown as HTMLElement, places,
        [{ id: 'concourse', label: '1F', name: 'Concourse', y: 0, station: 'jr-osaka', description: '' }],
        [{ id: 'jr-osaka', name: 'JR 大阪站' }],
        {
            preview: () => 'Route',
            clear: () => {},
            pick: (candidates, onPick) => { pickPoint = candidates && onPick; },
            kindLabel: () => 'Entrance'
        }
    );
    const rows = elements.get('walking-places')!;
    const results = elements.get('walking-results')!;
    const field = (i: number) => rows.children[i]!.children[0]!.children;
    const [label, input, clear] = field(0);
    planner.enableMap();
    assert.equal(label!.textContent, '起点');
    assert(clear!.hidden);
    input!.focus();
    assert(results.hidden);
    input!.dispatchEvent(new Event('compositionstart'));
    input!.value = '中央';
    input!.dispatchEvent(Object.assign(new Event('input'), { isComposing: true }));
    assert.equal(timers.size, 0);
    input!.dispatchEvent(new Event('compositionend'));
    assert(results.hidden);
    const search = timers.get(clock)!;
    timers.delete(clock);
    search();
    assert.equal(results.children.length, 1);
    results.children[0]!.click();
    assert.deepEqual(planner.snapshot().ids, ['a', null]);
    assert.equal(input!.value, '中央入口');
    assert(!clear!.hidden);
    elements.get('walking-pick')!.click();
    pickPoint!('b');
    elements.get('walking-confirm')!.click();
    assert.deepEqual(planner.snapshot().ids, ['a', 'b']);
    assert(!elements.get('walking-preview')!.disabled);
    clear!.click();
    assert.deepEqual(planner.snapshot().ids, [null, 'b']);
    assert(elements.get('walking-preview')!.disabled);
    const station = elements.get('walking-station')!;
    station.value = 'jr-osaka';
    station.dispatchEvent(new Event('change'));
    assert.equal(results.children.length, 2);
    elements.get('walking-add')!.click();
    assert.deepEqual(planner.snapshot().ids, [null, null, 'b']);
    field(1)[2]!.click();
    assert.deepEqual(planner.snapshot().ids, [null, 'b']);
});
