import { readdirSync, readFileSync } from 'node:fs';
import { checkTypeScriptStyle } from './code-style.ts';

/** Enumerate maintained source files while leaving generated output and reference assets untouched. */
function sourceFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = `${directory}/${entry.name}`;
        return entry.isDirectory() ? sourceFiles(file) : [file];
    });
}

const files = ['src', 'scripts', 'tests', 'data'].flatMap(sourceFiles);
const diagnostics: string[] = [];
for (const file of files.filter(file => file.endsWith('.ts'))) {
    for (const issue of checkTypeScriptStyle(readFileSync(file, 'utf8'), file, !file.startsWith('tests/'))) {
        diagnostics.push(`${file}:${issue.line} [${issue.rule}] ${issue.message}`);
    }
}
for (const file of files.filter(file => file.endsWith('.css'))) {
    const text = readFileSync(file, 'utf8');
    for (const [line, value] of text.split('\n').entries()) {
        if (/\t/.test(value) || (value.match(/^ */)?.[0].length ?? 0) % 2) {
            diagnostics.push(`${file}:${line + 1} [indent] CSS uses two-space indentation.`);
        }
        if ((value.match(/;/g)?.length ?? 0) > 1) {
            diagnostics.push(`${file}:${line + 1} [declarations] Keep one CSS declaration per line.`);
        }
    }
    if (text.includes('\r') || !text.endsWith('\n')) {
        diagnostics.push(`${file}:1 [line-ending] Use LF and a final newline.`);
    }
}
if (diagnostics.length) {
    console.error(diagnostics.join('\n'));
    process.exitCode = 1;
} else {
    console.log('TypeScript and CSS readability checks passed.');
}
