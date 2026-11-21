import assert from 'node:assert/strict';
import { test } from 'node:test';
import { messageText } from '../../src/infrastructure/i18n/index.ts';
import { bindMapLoading } from '../../src/presentation/components/map-loading.ts';

test('map loading updates one status line before the next work and clears when the first frame is ready', async t => {
    const frames: FrameRequestCallback[] = [];
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
        configurable: true,
        value: (callback: FrameRequestCallback) => frames.push(callback)
    });
    t.after(() => Reflect.deleteProperty(globalThis, 'requestAnimationFrame'));
    const label = { textContent: '' };
    const root = {
        hidden: false,
        querySelector: (selector: string) => selector === '[data-loading-status]' ? label : null
    };
    const loading = bindMapLoading(root as unknown as HTMLElement);
    for (const stage of ['stations', 'passages', 'equipment', 'ready'] as const) {
        const presented = loading.show(stage);
        assert.equal(label.textContent, messageText(`ui.map.loading.${stage}`));
        frames.shift()!(0);
        assert.equal(frames.length, 1);
        frames.shift()!(16);
        await presented;
    }
    loading.hide();
    assert(root.hidden);
});
