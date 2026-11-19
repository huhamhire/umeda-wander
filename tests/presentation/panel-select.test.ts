import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bindPanelSelect, matchingOptions } from '../../src/presentation/components/panel-select.ts';

test('facility search matches visible localized names and ignores internal facility codes', () => {
    const choices = [
        { label: '中央口改札機', code: 'JR-010' },
        { label: '中央口改札内エスカレーター · 5/6番線', code: 'JR-018' },
        { label: 'M16 · West gate', code: 'M16-002' },
    ];
    assert.deepEqual(matchingOptions(choices, '中央口 ５／６'), [choices[1]]);
    assert.deepEqual(matchingOptions(choices, 'WEST ｍ１６'), [choices[2]]);
    assert.deepEqual(matchingOptions(choices, 'JR-010'), []);
    assert.deepEqual(matchingOptions(choices, ' '), choices);
});

class ElementStub extends EventTarget {
    id = '';
    value = '';
    textContent = '';
    hidden = false;
    opened = false;
    clientLeft = 0;
    clientWidth = 190;
    children: ElementStub[] = [];
    bounds = { left: 0, top: 0, bottom: 30, width: 200 };
    attributes = new Map([['aria-label', 'Facility']]);
    style = { left: '', width: '' };
    classList = { add() {}, remove() {} };
    append(...children: ElementStub[]) { this.children.push(...children); }
    replaceChildren(...children: ElementStub[]) { this.children = children; }
    querySelector() { return this.children[0]; }
    getAttribute(name: string) { return this.attributes.get(name); }
    setAttribute(name: string, value: string) { this.attributes.set(name, value); }
    removeAttribute(name: string) { this.attributes.delete(name); }
    getBoundingClientRect() { return this.bounds; }
    getClientRects() { return [this.bounds]; }
    matches(selector: string) { return selector === ':popover-open' && this.opened; }
    showPopover() { this.opened = true; }
    hidePopover() { this.opened = false; }
    focus() {}
}

test('unscoped candidates wait for committed text, with debounce and no stale selection', t => {
    const timers = new Map<number, () => void>();
    let lastTimer = 0;
    const trigger = new ElementStub();
    const panel = new ElementStub();
    trigger.append(new ElementStub());
    const window = Object.assign(new EventTarget(), {
        getComputedStyle: () => ({ paddingLeft: '15px', paddingRight: '15px' }),
        setTimeout: (callback: () => void) => {
            timers.set(++lastTimer, callback);
            return lastTimer;
        },
        clearTimeout: (id: number) => timers.delete(id)
    });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: window });
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: { createElement: () => new ElementStub(), documentElement: { clientHeight: 700 } }
    });
    t.after(() => {
        Reflect.deleteProperty(globalThis, 'window');
        Reflect.deleteProperty(globalThis, 'document');
    });
    const picker = bindPanelSelect(trigger as unknown as HTMLButtonElement, panel as unknown as HTMLElement, {
        label: 'Search',
        empty: 'No results'
    });
    const choices = [{ value: 'a', label: '案内所' }, { value: 'b', label: '寄存柜' }];
    const [input, list, status] = panel.children[0]!.children;
    const click = () => trigger.dispatchEvent(new Event('click'));
    const type = (text: string, isComposing = false) => {
        input!.value = text;
        input!.dispatchEvent(Object.assign(new Event('input'), { isComposing }));
    };
    const enter = () => input!.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Enter' }));
    picker.setOptions(choices, '', { searchPrompt: 'Choose a station or search' });
    click();
    assert.equal(panel.children[0]!.style.left, '15px');
    assert.equal(panel.children[0]!.style.width, '160px');
    assert.equal(list!.children.length, 0);
    assert.equal(status!.textContent, 'Choose a station or search');
    input!.dispatchEvent(new Event('compositionstart'));
    type('案', true);
    enter();
    assert.equal(timers.size, 0);
    assert.equal(picker.value, '');
    input!.dispatchEvent(new Event('compositionend'));
    assert.equal(timers.size, 1);
    type('案内');
    assert.equal(timers.size, 1);
    assert.equal(list!.children.length, 0);
    const callback = timers.get(lastTimer)!;
    timers.delete(lastTimer);
    callback();
    assert.deepEqual(list!.children.map(item => item.textContent), ['案内所']);
    type('　');
    assert.equal(list!.children.length, 0);
    type('不存在');
    enter();
    assert.equal(status!.textContent, 'No results');
    assert.equal(picker.value, '');
    type('寄');
    picker.setOptions(choices, '');
    assert.equal(timers.size, 0);
    click();
    assert.equal(list!.children.length, 2);
    window.dispatchEvent(new Event('scroll'));
    assert(panel.children[0]!.opened);
    trigger.bounds = { ...trigger.bounds, top: -32, bottom: -2 };
    window.dispatchEvent(new Event('scroll'));
    assert(!panel.children[0]!.opened);
});
