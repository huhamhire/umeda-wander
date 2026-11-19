import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildStyles } from '../../scripts/styles.ts';

test(
    'component CSS bundles locally with mobile navigation, map controls and modal scrolling intact',
    async () => {
        const entry = readFileSync('src/styles/index.css', 'utf8');
        const domains = [
            ['foundations', '.atlas'],
            ['components/chrome', '.topbar'],
            ['components/map', '.map-tools'],
            ['components/navigation', '.sidebar'],
            ['components/credits', '.credits-dialog'],
        ];
        const css = await buildStyles();
        const narrowStyles = [...css.matchAll(/@media \(max-width: 760px\) \{([\s\S]*?)\n\}/g)].map(match => match[1]);
        for (const [domain, selector] of domains) {
            assert(entry.includes(`@import "./${domain}/index.css";`));
            const domainEntry = readFileSync(`src/styles/${domain}/index.css`, 'utf8');
            assert.match(domainEntry, /@import "\.\/base\.css";\s*@import "\.\/mobile\.css" \(max-width: 760px\);/);
            assert(narrowStyles.some(rules => rules?.includes(`${selector} {`)), `${selector} needs narrow-screen styles`);
        }
        assert(!css.includes('@import'));
        assert(!/url\(https?:/.test(css));
        assert.match(css, /\.sidebar\s*\{/);
        for (const rules of css.matchAll(/\.(?:sidebar|sidebar-content)\s*\{([^}]*)\}/g)) {
            assert.doesNotMatch(rules[1]!, /overflow-y:\s*auto/);
        }
        assert.match(css, /\.sidebar-tabs\s*\{[^}]*flex:\s*none/);
        assert.match(css, /\.sidebar\s*\{[^}]*padding-block:\s*15px/);
        assert.match(css, /\.sidebar-content > \[role=tabpanel\]\s*\{[^}]*padding-inline:\s*var\(--sidebar-inline-inset\);[^}]*overflow-y:\s*auto/);
        assert(narrowStyles.some(rules => /\.sidebar-content\s*\{[^}]*padding-block:\s*6px 8px/.test(rules ?? '')));
        assert.match(css, /\.navigation-toggle\s*\{\s*display:\s*none/);
        assert(narrowStyles.some(rules => /\.navigation-toggle\s*\{[^}]*min-height:\s*44px/.test(rules ?? '')));
        assert(narrowStyles.some(rules => /\.sidebar\[data-collapsed\] \.sidebar-content\s*\{\s*display:\s*none/.test(rules ?? '')));
        assert.match(css, /\.map-tools\s*\{/);
        assert.match(css, /\.walking-itinerary\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) max-content/);
        assert.match(css, /\.walking-panel ol\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
        assert.match(css, /#walking-preview:enabled\s*\{[^}]*background:\s*var\(--color-tab-active\)/);
        assert.match(css, /\.walking-route-actions\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto auto/);
        assert.match(css, /#viewport canvas\s*\{[^}]*cursor:\s*grab/);
        assert.match(css, /canvas\[data-clickable\]\s*\{\s*cursor:\s*pointer[^}]*\}[\s\S]*canvas\[data-dragging\]\s*\{\s*cursor:\s*grabbing[^}]*\}[\s\S]*canvas\[data-orbiting\]\s*\{\s*cursor:\s*move/);
        assert.match(css, /\.credits-content\s*\{[^}]*overflow-y:\s*auto/);
        assert.match(css, /--navigation-height/);
        const panel = css.match(/--color-panel:\s*rgb\(var\((--palette-[\w-]+)\)\s*\/\s*[\d.]+%\)/);
        assert(panel?.[1]);
        assert(css.includes(`${panel[1]}:`));
        assert.match(css, /\.panel\s*\{[^}]*background:\s*var\(--color-panel\)/);
    }
);
