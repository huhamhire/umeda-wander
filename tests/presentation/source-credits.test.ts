import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildStyles } from '../../scripts/styles.ts';
import { renderHtmlMessages } from '../../scripts/html.ts';
import { test } from 'node:test';
import { geographicOsmData as osmCreditData } from '../../src/infrastructure/geography/osm-export.ts';
import { bindCreditsDialog } from '../../src/presentation/components/source-credits-dialog.ts';

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
test(
    'the standalone credits resource preserves source links and verified licences without audit notes',
    () => {
        const body = readFileSync('src/content/source-credits.zh-CN.html', 'utf8');
        assert(body.includes('非官方交互式步行地图'));
        assert(!body.includes('项目源码'));
        const headings = [...body.matchAll(/<h3>([^<]+)<\/h3>/g)].map(match => match[1]);
        assert.deepEqual(headings, ['项目说明', '数据与素材许可', '参考资料']);
        assert.equal([...body.matchAll(/<p>许可：/g)].length, 2);
        assert(body.includes('https://opendatacommons.org/licenses/odbl/1-0/'));
        assert(body.includes('https://creativecommons.org/licenses/by/4.0/'));
        assert(body.includes('© OpenStreetMap contributors'));
        assert(body.includes('西日本旅客鉄道株式会社'));
        assert(!/未查到|待核实|待确认|下载|本地 SVG|\{\{credits\./.test(body));
        assert(body.includes('href="./osm-derived-data.json"'));
        for (const [, href, attributes] of body.matchAll(/<a href="([^"]+)"([^>]*)>/g)) {
            if (href !== './osm-derived-data.json') {
                assert.equal(new URL(href!).protocol, 'https:');
            }
            assert(attributes!.includes('rel="noopener noreferrer"'));
        }
        const template = renderHtmlMessages(readFileSync('src/index.html', 'utf8'));
        assert.match(template, /id="credits-close"[^>]*aria-label="关闭数据来源与版权">\s*<span aria-hidden="true">×<\/span>\s*<\/button>/);
        assert(template.includes('<!-- SOURCE CREDITS -->'));
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
        assert.match(html, /<a\s+id="credits-open"[^>]+>数据来源与版权 · © OpenStreetMap contributors<\/a>/);
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
