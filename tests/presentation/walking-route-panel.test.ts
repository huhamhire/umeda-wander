import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { WalkingPlace } from '../../src/application/navigation/walking-route.ts';
import { bindWalkingRoutePanel } from '../../src/presentation/components/walking-route-panel.ts';

class Field extends EventTarget {
    children: Field[] = [];
    attributes = new Map<string, string>();
    value: string;
    textContent: string;
    title = '';
    hidden = false;
    disabled = false;
    checked = false;
    id = '';
    bottom = 0;
    opened = false;
    open = false;
    clientWidth = 320;
    clientLeft = 0;
    style: Record<string, string> = {};
    classList = { add() {}, remove() {} };
    captured?: number;

    constructor(text = '', value = '') {
        super();
        this.textContent = text;
        this.value = value;
    }

    append(...children: Field[]): void { this.children.push(...children); }
    replaceChildren(...children: Field[]): void { this.children = children; }
    setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
    getAttribute(name: string): string | undefined { return this.attributes.get(name); }
    querySelector(): Field | undefined { return this.children[0]; }
    matches(selector: string): boolean { return selector === ':popover-open' && this.opened; }
    showPopover(): void { this.opened = true; }
    hidePopover(): void { this.opened = false; }
    removeAttribute(name: string): void { this.attributes.delete(name); }
    setPointerCapture(pointer: number): void { this.captured = pointer; }
    getBoundingClientRect(): Pick<DOMRect, 'left' | 'top' | 'bottom' | 'width' | 'height'> {
        return { left: 0, top: 0, bottom: this.bottom, width: this.clientWidth, height: 42 };
    }
    focus(): void { this.dispatchEvent(new Event('focus')); }
    select(): void {}
    click(): void { this.dispatchEvent(new Event('click')); }
}

test('walking endpoints can be searched, filtered, cleared in place and chosen on the map', t => {
    const ids = [
        'walking-places', 'walking-add', 'walking-station', 'walking-options', 'walking-floor', 'walking-kind',
        'walking-search',
        'walking-results', 'walking-search-status', 'walking-gates', 'walking-preview', 'walking-clear', 'walking-status',
        'walking-gate-action', 'walking-allow-gates'
    ];
    const elements = new Map(ids.map(id => [id, Object.assign(new Field(), { id })]));
    const stationButton = elements.get('walking-station')!;
    stationButton.setAttribute('aria-label', 'Station');
    stationButton.append(new Field('All stations'));
    const panel = Object.assign(new Field(), { querySelector: (selector: string) => elements.get(selector.slice(1)) });
    const timers = new Map<number, () => void>();
    let clock = 0;
    const window = Object.assign(new EventTarget(), {
        setTimeout: (fn: () => void) => {
            timers.set(++clock, fn);
            return clock;
        },
        clearTimeout: (key: number) => timers.delete(key),
        getComputedStyle: () => ({ paddingLeft: '0', paddingRight: '0' })
    });
    const document = {
        body: new Field(), createElement: () => new Field(), createElementNS: () => new Field(),
        documentElement: { clientHeight: 800, clientWidth: 500 }
    };
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
        { id: 'c', name: '联络站台', level: 'concourse', station: 'jr-osaka', access: 'inside', kind: 'platform' }
    ];
    let pickPoint: ((id: string) => void) | undefined;
    let pickIds: string[] = [];
    const gatePolicies: boolean[] = [];
    let clears = 0;
    const planner = bindWalkingRoutePanel(
        panel as unknown as HTMLElement, places,
        [{ id: 'concourse', label: '1F', name: 'Concourse', y: 0, station: 'jr-osaka', description: '' }],
        [{ id: 'jr-osaka', name: 'JR 大阪站' }],
        [
            { id: 'locker', name: '存包柜', level: 'concourse', kind: 'locker' },
            { id: 'info', name: '北侧咨询台', mapLabel: '北侧大厅', level: 'concourse', kind: 'information' },
            { id: 'stairs', name: '北侧楼梯', level: 'concourse', kind: 'stairs' },
            { id: 'escalator', name: '北侧扶梯', level: 'concourse', kind: 'escalator' },
            { id: 'lift', name: '北侧直梯', level: 'concourse', kind: 'elevator' }
        ],
        {
            preview: (_places, allowPaid) => {
                gatePolicies.push(allowPaid);
                return allowPaid ? { message: '' } : { message: 'Ticket gate required', gateRequired: true };
            },
            clear: () => { clears++; },
            pick: (candidates, onPick) => {
                pickPoint = candidates && onPick;
                pickIds = candidates?.map(candidate => candidate.id) ?? [];
            },
            kindLabel: () => 'Entrance'
        },
        undefined,
        new Map([['info', [{ id: 'a', distance: 6 }]]])
    );
    const rows = elements.get('walking-places')!;
    const results = elements.get('walking-results')!;
    const field = (i: number) => rows.children[i]!.children[0]!.children.slice(1);
    const [label, input, clear] = field(0);
    planner.enableMap();
    assert.equal(label!.textContent, '起点');
    assert(clear!.hidden);
    input!.focus();
    assert(pickPoint);
    assert(pickIds.includes('c'));
    assert(!pickIds.some(id => ['stairs', 'escalator', 'lift'].includes(id)));
    assert(results.hidden);
    input!.dispatchEvent(new Event('compositionstart'));
    assert.equal(Boolean(pickPoint), false);
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
    field(1)[1]!.focus();
    const chooseMapPoint = pickPoint!;
    chooseMapPoint('b');
    assert.deepEqual(planner.snapshot().ids, ['a', 'b']);
    assert.equal(field(1)[1]!.value, '南改札外');
    assert.equal(Boolean(pickPoint), false);
    chooseMapPoint('c');
    assert.deepEqual(planner.snapshot().ids, ['a', 'b']);
    assert(!elements.get('walking-preview')!.disabled);
    const gateAction = elements.get('walking-gate-action')!;
    const status = elements.get('walking-status')!;
    const gates = elements.get('walking-gates')!;
    assert(gates.checked);
    assert(gateAction.hidden);
    elements.get('walking-preview')!.click();
    assert(gateAction.hidden);
    assert(status.hidden);
    gates.checked = false;
    gates.dispatchEvent(new Event('change'));
    elements.get('walking-preview')!.click();
    assert(!gateAction.hidden);
    assert(!status.hidden);
    assert(!planner.snapshot().allowPaid);
    elements.get('walking-allow-gates')!.click();
    assert(planner.snapshot().allowPaid);
    assert(gateAction.hidden);
    assert(status.hidden);
    assert.deepEqual(gatePolicies, [true, false, true]);
    clear!.click();
    assert.deepEqual(planner.snapshot().ids, [null, 'b']);
    assert(elements.get('walking-preview')!.disabled);
    const station = elements.get('walking-station')!;
    station.click();
    const [stationMenu] = panel.children;
    assert(stationMenu!.opened);
    stationMenu!.children[0]!.children[1]!.click();
    assert(!stationMenu!.opened);
    assert.equal(station.children[0]!.textContent, 'JR 大阪站');
    assert.equal(results.children.length, 5);
    station.click();
    assert(stationMenu!.opened);
    elements.get('walking-options')!.dispatchEvent(new Event('toggle'));
    assert(!stationMenu!.opened);
    assert.equal(station.children[0]!.textContent, 'JR 大阪站');
    const searchField = elements.get('walking-search')!;
    searchField.focus();
    searchField.dispatchEvent(new Event('compositionstart'));
    searchField.value = '联络';
    searchField.dispatchEvent(Object.assign(new Event('input'), { isComposing: true }));
    assert(results.hidden);
    assert.equal(timers.size, 0);
    searchField.dispatchEvent(new Event('compositionend'));
    const filter = timers.get(clock)!;
    timers.delete(clock);
    filter();
    assert.equal(results.children.length, 1);
    assert.equal(results.children[0]!.children[1]!.children[0]!.textContent, '联络站台');
    assert.deepEqual(planner.snapshot().ids, [null, 'b']);
    searchField.value = '';
    searchField.dispatchEvent(new Event('input'));
    assert.equal(results.children.length, 5);
    const unavailable = results.children.find(option => option.children[1]?.children[0]?.textContent === '存包柜');
    assert(unavailable);
    assert.equal(unavailable.children[1]!.children[0]!.textContent, '存包柜');
    assert.match(unavailable.children[1]!.children[1]!.textContent, /暂未接入路线/);
    const kind = elements.get('walking-kind')!;
    field(0)[1]!.click();
    kind.value = 'locker';
    kind.dispatchEvent(new Event('change'));
    assert.deepEqual(pickIds, ['locker']);
    pickPoint!('locker');
    assert.deepEqual(planner.snapshot().ids, ['locker', 'b']);
    assert.equal(field(0)[1]!.value, '存包柜');
    assert.match(elements.get('walking-status')!.textContent, /存包柜.*暂未接入/);
    assert(elements.get('walking-preview')!.disabled);
    elements.get('walking-preview')!.click();
    assert.deepEqual(gatePolicies, [true, false, true]);
    field(0)[2]!.click();
    assert.deepEqual(planner.snapshot().ids, [null, 'b']);
    elements.get('walking-add')!.click();
    assert.deepEqual(planner.snapshot().ids, [null, null, 'b']);
    field(1)[2]!.click();
    assert.deepEqual(planner.snapshot().ids, [null, 'b']);
    gates.checked = false;
    planner.reset();
    assert(planner.snapshot().allowPaid);

    planner.usePlace(places[0]!.id, 'start');
    planner.usePlace(places[1]!.id, 'end');
    planner.usePlace(places[2]!.id, 'stop');
    const gesture = (grip: Field, type: string, clientY: number, clientX = 15) => {
        grip.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { button: 0, pointerId: 3, clientX, clientY }));
    };
    const gripAt = (index: number) => {
        for (const [i, row] of rows.children.entries()) {
            row.bottom = 50 * (i + 1);
        }
        return rows.children[index]!.children[0]!.children[0]!;
    };
    const firstGrip = gripAt(0);
    const beforeDrag = clears;
    const dragPreview = document.body.children[0]!;
    gesture(firstGrip, 'pointerdown', 25);
    assert.equal(firstGrip.captured, 3);
    assert(dragPreview.hidden);
    gesture(firstGrip, 'pointermove', 125, 35);
    assert(!dragPreview.hidden);
    assert.equal(dragPreview.children.at(-1)!.textContent, '中央入口');
    assert.equal(dragPreview.style.transform, 'translate3d(20px, 100px, 0)');
    assert.equal(rows.children[2]!.attributes.get('data-drop'), 'after');
    gesture(firstGrip, 'pointerup', 125);
    assert(dragPreview.hidden);
    assert.deepEqual(planner.snapshot().ids, ['c', 'b', 'a']);
    assert.equal(clears, beforeDrag + 1);
    assert.equal(field(0)[0]!.textContent, '起点');
    assert.equal(field(2)[0]!.textContent, '终点');
    const middleGrip = gripAt(1);
    gesture(middleGrip, 'pointerdown', 75);
    gesture(middleGrip, 'pointermove', 25);
    gesture(middleGrip, 'pointercancel', 25);
    assert(dragPreview.hidden);
    assert.deepEqual(planner.snapshot().ids, ['c', 'b', 'a']);
    assert(rows.children.every(row => !row.attributes.has('data-drop')));
    const lastGrip = gripAt(2);
    gesture(lastGrip, 'pointerdown', 125);
    gesture(lastGrip, 'pointermove', 75);
    gesture(lastGrip, 'pointerup', 75);
    assert.deepEqual(planner.snapshot().ids, ['c', 'a', 'b']);
    field(1)[1]!.focus();
    pickPoint!('b');
    assert.deepEqual(planner.snapshot().ids, ['c', 'b', 'b']);
    assert.equal(field(1)[1]!.value, '南改札外');

    planner.usePlace('info', 'start');
    assert.equal(field(0)[1]!.value, '北侧大厅');
    assert.equal(field(0)[0]!.children[0]!.children.length, 1);
    assert.match(field(0)[1]!.title, /北侧咨询台.*附近接入点/);
    assert(!elements.get('walking-preview')!.disabled);
});
