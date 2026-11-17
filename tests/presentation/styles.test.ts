import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildStyles } from '../../scripts/styles.ts';

test(
    'component CSS bundles locally with mobile navigation, map controls and modal scrolling intact',
    async () => {
        const entry = readFileSync('src/styles/index.css', 'utf8');
        assert.equal((entry.match(/@import/g) ?? []).length, 5);
        const css = await buildStyles();
        assert(!css.includes('@import'));
        assert(!/url\(https?:/.test(css));
        assert.match(css, /\.sidebar\s*\{/);
        assert.match(css, /\.map-tools\s*\{/);
        assert.match(css, /\.credits-content\s*\{[^}]*overflow-y:\s*auto/);
        assert.match(css, /--navigation-height/);
        assert.match(css, /@media\s*\(max-width:\s*760px\)/);
    }
);
