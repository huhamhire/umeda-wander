import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildStyles } from '../../scripts/styles.ts';
import { renderHtmlMessages } from '../../scripts/html.ts';
import { test } from 'node:test';
import { geographicOsmData as osmCreditData } from '../../src/infrastructure/district/geographic-map.ts';
import { sourceCredits } from '../../src/infrastructure/source-credits.ts';
import { bindCreditsDialog, renderSourceCredits } from '../../src/presentation/source-credits-dialog.ts';

class Node extends EventTarget {
    children: (Node | string)[] = [];
    textContent = '';
    className = '';
    href = '';
    type = '';
    target = '';
    rel = '';
    open = false;
    readonly tagName: string;
    readonly ownerDocument: Doc;
    constructor(tagName: string, ownerDocument: Doc) {
        super();
        this.tagName = tagName;
        this.ownerDocument = ownerDocument;
    }
    append(...children: (Node | string)[]) {
        this.children.push(...children);
    }
    replaceChildren() {
        this.children = [];
    }
    focus() {
        this.ownerDocument.activeElement = this;
    }
    showModal() {
        this.open = true;
    }
    close() {
        this.open = false;
        this.dispatchEvent(new Event('close'));
    }
    querySelectorAll(): Node[] {
        return this.children.flatMap(c => typeof c === 'string' ? [] : [...(c.tagName === 'button' || c.tagName === 'a' ? [c] : []), ...c.querySelectorAll()]);
    }
}

class Doc {
    activeElement: Node | null = null;
    createElement(tag: string) {
        return new Node(tag, this);
    }
}
const text = (node: Node): string => node.textContent + node.children.map(c => typeof c === 'string' ? c : text(c)).join(' ');
test(
    'credits skip empty source-code section and keep data licences separate from unverified material',
    () => {
        const doc = new Doc();
        const container = doc.createElement('div');
        let downloads = 0;
        renderSourceCredits(container as unknown as HTMLElement, sourceCredits, () => downloads++);
        const body = text(container);
        assert(body.includes(sourceCredits.description));
        assert(!body.includes('项目源码'));
        const headings = container.children.filter((c): c is Node => typeof c !== 'string').map(s => (s.children[0] as Node).textContent);
        assert.deepEqual(headings, ['项目说明', '数据与素材许可', '参考资料']);
        const licensed = sourceCredits.data.filter(d => d.licence);
        assert.equal(licensed.length, 2);
        assert(licensed.some(d => d.licence!.url.includes('/odbl/')));
        assert(licensed.some(d => d.licence!.url.includes('/licenses/by/4.0/')));
        assert(sourceCredits.data.filter(d => !d.licence).every(d => d.status));
        for (const item of [...sourceCredits.data, ...sourceCredits.references]) {
            for (const link of [...item.links, ...item.licence ? [item.licence] : []]) {
                assert.equal(new URL(link.url).protocol, 'https:');
            }
        }
        const button = container.querySelectorAll().find(n => n.tagName === 'button')!;
        button.dispatchEvent(new Event('click'));
        assert.equal(downloads, 1);
    }
);
test(
    'dialog opens with title focus, closes with Escape/cancel/button and restores entry focus',
    () => {
        const doc = new Doc();
        const dialog = doc.createElement('dialog');
        const entry = doc.createElement('button');
        const close = doc.createElement('button');
        const heading = doc.createElement('h2');
        const last = doc.createElement('a');
        dialog.append(close, heading, last);
        bindCreditsDialog(
            dialog as unknown as HTMLDialogElement,
            entry as unknown as HTMLButtonElement,
            close as unknown as HTMLButtonElement,
            heading as unknown as HTMLElement
        );
        const key = (key: string, shiftKey = false) => {
            const event = Object.assign(new Event('keydown', { cancelable: true }), { key, shiftKey });
            dialog.dispatchEvent(event);
            return event;
        };
        entry.dispatchEvent(new Event('click'));
        assert(dialog.open);
        assert.equal(doc.activeElement, heading);
        assert(key('Tab', true).defaultPrevented);
        assert.equal(doc.activeElement, last);
        assert(key('Tab').defaultPrevented);
        assert.equal(doc.activeElement, close);
        assert(key('Escape').defaultPrevented);
        assert(!dialog.open);
        assert.equal(doc.activeElement, entry);
        for (const method of ['button', 'cancel'] as const) {
            entry.dispatchEvent(new Event('click'));
            (method === 'button' ? close : dialog).dispatchEvent(new Event(method === 'button' ? 'click' : 'cancel', { cancelable: true }));
            assert(!dialog.open);
            assert.equal(doc.activeElement, entry);
        }
    }
);
test(
    'OSM download exposes actual cached and fitted data without relabelling indoor plans',
    () => {
        const data = osmCreditData();
        assert(data.licence.endsWith('/odbl/1-0/'));
        assert(data.ground.length > 0);
        assert(Object.keys(data.buildingParts).length > 0);
        assert(data.runningLines.length > 0);
        assert(!('underground' in data));
        assert(!('facilities' in data));
        assert(!('areas' in data));
        assert(JSON.stringify(data).includes('© OpenStreetMap contributors'));
    }
);
test(
    'attribution is always visible in markup and mobile CSS reserves safe footer space',
    async () => {
        const html = renderHtmlMessages(readFileSync('src/index.html', 'utf8'));
        const css = await buildStyles();
        assert.match(html, /<dialog[^>]+aria-labelledby="credits-title"/);
        assert.match(html, /<h2 id="credits-title" tabindex="-1"/);
        assert.match(html, /<a id="credits-open"[^>]+>数据来源与版权 · © OpenStreetMap contributors<\/a>/);
        assert(
            !html.includes('href="https://www.openstreetmap.org/copyright"'),
            'no independent OSM link outside the dialog'
        );
        assert.match(css, /\.credits-dialog\[open\]\s*\{\s*display:\s*flex/);
        assert.match(css, /\.credits-content\s*\{[^}]*overflow-y:\s*auto/);
        assert.match(css, /--navigation-bottom:\s*calc\(58px \+ env\(safe-area-inset-bottom/);
        assert.match(css, /\.atlas footer \.map-credits a\s*\{\s*font-size:\s*12px;\s*max-width:\s*none/);
    }
);
