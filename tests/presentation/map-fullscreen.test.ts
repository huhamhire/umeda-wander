import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bindMapFullscreen } from '../../src/presentation/components/map-fullscreen.ts';

class ElementStub extends EventTarget {
    attributes = new Map<string, string>();
    title = '';

    hasAttribute(name: string): boolean {
        return this.attributes.has(name);
    }

    setAttribute(name: string, value: string): void {
        this.attributes.set(name, value);
    }

    toggleAttribute(name: string, active: boolean): void {
        if (active) {
            this.setAttribute(name, '');
        }
        else {
            this.attributes.delete(name);
        }
    }
}

function setup(mode: 'native' | 'unavailable' | 'rejected') {
    const atlas = new ElementStub();
    const button = new ElementStub();
    const changes: boolean[] = [];
    const doc = Object.assign(new EventTarget(), {
        fullscreenEnabled: mode !== 'unavailable',
        fullscreenElement: null as object | null,
        documentElement: {
            async requestFullscreen(options: FullscreenOptions) {
                assert.equal(options.navigationUI, 'hide');
                if (mode === 'rejected') {
                    throw new Error('Fullscreen blocked');
                }
                doc.fullscreenElement = this;
                doc.dispatchEvent(new Event('fullscreenchange'));
            }
        },
        async exitFullscreen() {
            doc.fullscreenElement = null;
            doc.dispatchEvent(new Event('fullscreenchange'));
        }
    });
    bindMapFullscreen(atlas as unknown as HTMLElement, button as unknown as HTMLButtonElement, active => {
        changes.push(active);
    }, doc as unknown as Document);
    return {
        atlas,
        button,
        changes,
        doc,
        async click() {
            button.dispatchEvent(new Event('click'));
            await Promise.resolve();
        }
    };
}

test('the mobile button enters and exits native fullscreen and follows system exits', async () => {
    const { atlas, button, changes, doc, click } = setup('native');
    await click();
    assert.equal(doc.fullscreenElement, doc.documentElement);
    assert(atlas.hasAttribute('data-map-fullscreen'));
    assert.equal(button.attributes.get('aria-pressed'), 'true');
    await click();
    assert.equal(doc.fullscreenElement, null);
    assert(!atlas.hasAttribute('data-map-fullscreen'));
    await click();
    doc.fullscreenElement = null;
    doc.dispatchEvent(new Event('fullscreenchange'));
    assert.equal(button.attributes.get('aria-pressed'), 'false');
    assert.deepEqual(changes, [true, false, true, false]);
});

test('the same button restores the navigation after viewport-only fullscreen', async () => {
    for (const mode of ['unavailable', 'rejected'] as const) {
        const { atlas, button, changes, doc, click } = setup(mode);
        await click();
        assert.equal(doc.fullscreenElement, null);
        assert(atlas.hasAttribute('data-map-fullscreen'));
        assert.equal(button.attributes.get('aria-pressed'), 'true');
        await click();
        assert(!atlas.hasAttribute('data-map-fullscreen'));
        assert.equal(button.attributes.get('aria-pressed'), 'false');
        assert.deepEqual(changes, [true, false]);
    }
});
