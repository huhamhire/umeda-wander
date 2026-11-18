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
        assert.match(css, /\.map-tools\s*\{/);
        assert.match(css, /\.credits-content\s*\{[^}]*overflow-y:\s*auto/);
        assert.match(css, /--navigation-height/);
        const panel = css.match(/--color-panel:\s*rgb\(var\((--palette-[\w-]+)\)\s*\/\s*[\d.]+%\)/);
        assert(panel?.[1]);
        assert(css.includes(`${panel[1]}:`));
        assert.match(css, /\.panel\s*\{[^}]*background:\s*var\(--color-panel\)/);
    }
);
