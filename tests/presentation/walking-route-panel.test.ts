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
    bottom = 0;
    captured?: number;

    constructor(text = '', value = '') {
        super();
        this.textContent = text;
        this.value = value;
    }

    append(...children: Field[]): void { this.children.push(...children); }
    replaceChildren(...children: Field[]): void { this.children = children; }
    setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
    removeAttribute(name: string): void { this.attributes.delete(name); }
    setPointerCapture(pointer: number): void { this.captured = pointer; }
    getBoundingClientRect(): Pick<DOMRect, 'bottom'> { return { bottom: this.bottom }; }
    focus(): void { this.dispatchEvent(new Event('focus')); }
    select(): void {}
    click(): void { this.dispatchEvent(new Event('click')); }
}

test('walking endpoints can be searched, filtered, cleared in place and chosen on the map', t => {
    const ids = [
        'walking-places', 'walking-add', 'walking-station', 'walking-floor', 'walking-kind',
        'walking-pick',
        'walking-results', 'walking-search-status', 'walking-gates', 'walking-preview', 'walking-clear', 'walking-status',
        'walking-gate-action', 'walking-allow-gates'
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
        { id: 'b', name: '南改札外', level: 'concourse', station: 'jr-osaka', access: 'outside' },
        { id: 'c', name: '联络通道', level: 'concourse', station: 'jr-osaka', access: 'outside' }
    ];
    let pickPoint: ((id: string) => void) | undefined;
    const gatePolicies: boolean[] = [];
    let clears = 0;
    const planner = bindWalkingRoutePanel(
        panel as unknown as HTMLElement, places,
        [{ id: 'concourse', label: '1F', name: 'Concourse', y: 0, station: 'jr-osaka', description: '' }],
        [{ id: 'jr-osaka', name: 'JR 大阪站' }],
        [{ id: 'locker', name: '存包柜', level: 'concourse', kind: 'locker' }],
        {
            preview: (_places, allowPaid) => {
                gatePolicies.push(allowPaid);
                return allowPaid ? { message: 'Route' } : { message: 'Ticket gate required', gateRequired: true };
            },
            clear: () => { clears++; },
            pick: (candidates, onPick) => { pickPoint = candidates && onPick; },
            kindLabel: () => 'Entrance'
        }
    );
    const rows = elements.get('walking-places')!;
    const results = elements.get('walking-results')!;
    const field = (i: number) => rows.children[i]!.children[0]!.children.slice(1);
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
    const pick = elements.get('walking-pick')!;
    pick.click();
    assert.equal(pick.attributes.get('aria-pressed'), 'true');
    pick.click();
    assert.equal(pick.attributes.get('aria-pressed'), 'false');
    assert.equal(pickPoint, undefined);
    assert.deepEqual(planner.snapshot().ids, ['a', null]);
    pick.click();
    const chooseMapPoint = pickPoint!;
    chooseMapPoint('b');
    assert.deepEqual(planner.snapshot().ids, ['a', 'b']);
    assert.equal(field(1)[1]!.value, '南改札外');
    assert.equal(pick.attributes.get('aria-pressed'), 'false');
    assert.equal(pickPoint, undefined);
    chooseMapPoint('c');
    assert.deepEqual(planner.snapshot().ids, ['a', 'b']);
    assert(!elements.get('walking-preview')!.disabled);
    const gateAction = elements.get('walking-gate-action')!;
    const gates = elements.get('walking-gates')!;
    assert(gates.checked);
    assert(gateAction.hidden);
    elements.get('walking-preview')!.click();
    assert(gateAction.hidden);
    gates.checked = false;
    gates.dispatchEvent(new Event('change'));
    elements.get('walking-preview')!.click();
    assert(!gateAction.hidden);
    assert(!planner.snapshot().allowPaid);
    elements.get('walking-allow-gates')!.click();
    assert(planner.snapshot().allowPaid);
    assert(gateAction.hidden);
    assert.deepEqual(gatePolicies, [true, false, true]);
    clear!.click();
    assert.deepEqual(planner.snapshot().ids, [null, 'b']);
    assert(elements.get('walking-preview')!.disabled);
    const station = elements.get('walking-station')!;
    station.value = 'jr-osaka';
    station.dispatchEvent(new Event('change'));
    assert.equal(results.children.length, 4);
    const unavailable = results.children.find(option => option.attributes.get('aria-disabled') === 'true');
    assert(unavailable);
    assert.equal(unavailable.children[1]!.children[0]!.textContent, '存包柜');
    assert.match(unavailable.children[1]!.children[1]!.textContent, /暂未接入路线/);
    unavailable.click();
    assert.deepEqual(planner.snapshot().ids, [null, 'b']);
    const kind = elements.get('walking-kind')!;
    pick.click();
    kind.value = 'locker';
    kind.dispatchEvent(new Event('change'));
    assert(!pick.disabled);
    pick.click();
    assert.equal(results.children.length, 1);
    assert(pick.disabled);
    field(0)[1]!.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { key: 'Enter' }));
    assert.deepEqual(planner.snapshot().ids, [null, 'b']);
    elements.get('walking-add')!.click();
    assert.deepEqual(planner.snapshot().ids, [null, null, 'b']);
    field(1)[2]!.click();
    assert.deepEqual(planner.snapshot().ids, [null, 'b']);
    gates.checked = false;
    planner.reset();
    assert(planner.snapshot().allowPaid);

    planner.usePlace(places[0]!, 'start');
    planner.usePlace(places[1]!, 'end');
    planner.usePlace(places[2]!, 'stop');
    const gesture = (grip: Field, type: string, clientY: number) => {
        grip.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { button: 0, pointerId: 3, clientY }));
    };
    const gripAt = (index: number) => {
        for (const [i, row] of rows.children.entries()) {
            row.bottom = 50 * (i + 1);
        }
        return rows.children[index]!.children[0]!.children[0]!;
    };
    const firstGrip = gripAt(0);
    const beforeDrag = clears;
    gesture(firstGrip, 'pointerdown', 25);
    assert.equal(firstGrip.captured, 3);
    gesture(firstGrip, 'pointermove', 125);
    assert.equal(rows.children[2]!.attributes.get('data-drop'), 'after');
    gesture(firstGrip, 'pointerup', 125);
    assert.deepEqual(planner.snapshot().ids, ['c', 'b', 'a']);
    assert.equal(clears, beforeDrag + 1);
    assert.equal(field(0)[0]!.textContent, '起点');
    assert.equal(field(2)[0]!.textContent, '终点');
    const middleGrip = gripAt(1);
    gesture(middleGrip, 'pointerdown', 75);
    gesture(middleGrip, 'pointermove', 25);
    gesture(middleGrip, 'pointercancel', 25);
    assert.deepEqual(planner.snapshot().ids, ['c', 'b', 'a']);
    assert(rows.children.every(row => !row.attributes.has('data-drop')));
    const lastGrip = gripAt(2);
    gesture(lastGrip, 'pointerdown', 125);
    gesture(lastGrip, 'pointermove', 75);
    gesture(lastGrip, 'pointerup', 75);
    assert.deepEqual(planner.snapshot().ids, ['c', 'a', 'b']);
    field(1)[1]!.focus();
    elements.get('walking-pick')!.click();
    pickPoint!('b');
    assert.deepEqual(planner.snapshot().ids, ['c', 'b', 'b']);
    assert.equal(field(1)[1]!.value, '南改札外');
});
