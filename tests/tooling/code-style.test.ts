import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkTypeScriptStyle } from '../../scripts/code-style.ts';

test(
    'readability checks reject padded parameter lists and consecutive blank lines',
    () => {
        const source = [
            '/** Return the supplied value. */',
            'export function padded(',
            '    value: number',
            '',
            '',
            '): number {',
            '    return value;',
            '}',
            '',
        ].join('\n');
        assert(checkTypeScriptStyle(source, 'sample.ts').some(issue => issue.rule === 'blank-lines'));
    }
);

test(
    'readability checks reject compressed statements, missing braces and undocumented functions',
    () => {
        const source = 'export function bad() { let a = 1; a++; if (a) return; }\n';
        const rules = checkTypeScriptStyle(source, 'sample.ts').map(issue => issue.rule);
        assert(rules.includes('max-statements-per-line'));
        assert(rules.includes('curly'));
        assert(rules.includes('documentation'));
    }
);

test(
    'readability checks preserve literal whitespace and allow semicolons in for-loop headers',
    () => {
        const source = [
            '/** Process each item without changing the embedded payload. */',
            'export function valid(): void {',
            '    const payload = `first;',
            '',
            '',
            ' two spaces are part of this payload;`;',
            '    for (let i = 0; i < 2; i++) {',
            '        console.log(payload, i);',
            '    }',
            '}',
            '',
        ].join('\n');
        assert.deepEqual(checkTypeScriptStyle(source, 'sample.ts'), []);
    }
);
