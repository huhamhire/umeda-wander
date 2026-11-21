import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindSidebarTabs } from '../../src/presentation/components/sidebar-tabs.ts';

class Button extends EventTarget {
    tabIndex = -1;
    attributes = new Map<string, string>();
    focused = false;
    setAttribute(key: string, value: string) {
        this.attributes.set(key, value);
    }
    focus() {
        this.focused = true;
    }
}
test(
    'the second sidebar tab reveals facilities and hides the floor page',
    () => {
        const buttons = [new Button(), new Button()];
        const panels = [{ hidden: false }, { hidden: true }];
        const select = bindSidebarTabs(buttons, panels);
        buttons[1]!.dispatchEvent(new Event('click'));
        assert.deepEqual(panels.map(p => p.hidden), [true, false]);
        assert.deepEqual(buttons.map(b => b.attributes.get('aria-selected')), ['false', 'true']);
        assert.deepEqual(buttons.map(b => b.tabIndex), [-1, 0]);
        select(0);
        assert.deepEqual(panels.map(p => p.hidden), [false, true]);
    }
);
test(
    'sidebar arrow, Home and End keys keep focus and panels in sync',
    () => {
        const buttons = [new Button(), new Button(), new Button()];
        const panels = [{ hidden: false }, { hidden: true }, { hidden: true }];
        bindSidebarTabs(buttons, panels);
        for (const [from, key, to] of [
            [0, 'ArrowRight', 1],
            [1, 'ArrowRight', 2],
            [2, 'Home', 0],
            [0, 'ArrowLeft', 2],
            [0, 'End', 2]
        ] as const) {
            const event = Object.assign(new Event('keydown', { cancelable: true }), { key });
            buttons[from]!.dispatchEvent(event);
            assert(event.defaultPrevented);
            assert(buttons[to]!.focused);
            assert.deepEqual(panels.map(p => p.hidden), panels.map((_, i) => i !== to));
        }
    }
);

test(
    'walking routes have their own tab and facility search precedes its filters',
    () => {
        const html = readFileSync(new URL('../../src/index.html', import.meta.url), 'utf8');
        assert(!html.includes('station-picker'));
        assert(!html.includes('data-route='));
        assert.deepEqual([...html.matchAll(/id="(tab-[^"]+)"/g)].map(m => m[1]), ['tab-layers', 'tab-facilities', 'tab-walking']);
        assert(html.indexOf('id="facility-picker"') < html.indexOf('id="facility-station"'));
        assert(html.includes('id="walking-search"'));
        const options = html.match(/<details[^>]*id="walking-options"[^>]*>([\s\S]*?)<\/details>/);
        assert(options && !options[0].split('>')[0]!.includes(' open'));
        assert(options[1]!.includes('id="walking-station"'));
        assert(!options[1]!.includes('id="walking-search"'));
        assert(!html.includes('id="walking-pick"'));
        assert.equal([...html.matchAll(/id="facility-station"/g)].length, 1);
        assert(!html.includes('panel-stations'));
        assert(!html.includes('data-focus='));
    }
);
