import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/** List staged, unstaged and untracked paths without splitting filenames on whitespace. */
function changedPaths(): Set<string> {
    const options = ['--name-only', '-z', '--no-renames'];
    const commands = [
        ['diff', ...options, '--'],
        ['diff', '--cached', ...options, '--'],
        ['ls-files', '-z', '--others', '--exclude-standard']
    ];
    return new Set(commands.flatMap(args => execFileSync('git', args, { encoding: 'utf8' }).split('\0').filter(Boolean)));
}

/** Run the standard ESLint configuration for the selected TS paths. */
async function checkTypeScript(files: string[]): Promise<boolean> {
    if (files.length === 0) {
        return true;
    }
    const { ESLint } = await import('eslint');
    const linter = new ESLint();
    const results = await linter.lintFiles(files);
    const formatter = await linter.loadFormatter('stylish');
    const output = await formatter.format(results);
    if (output) {
        process.stderr.write(output);
    }
    return results.every(result => result.errorCount === 0);
}

/** Run the standard Stylelint configuration for the selected CSS paths. */
async function checkCss(files: string[]): Promise<boolean> {
    if (files.length === 0) {
        return true;
    }
    const { default: stylelint } = await import('stylelint');
    const result = await stylelint.lint({ files, formatter: 'string' });
    if (result.report) {
        process.stderr.write(result.report);
    }
    return !result.errored;
}

const changes = process.argv.includes('--changed') ? changedPaths() : null;
// A rule or dependency change can affect untouched files as well.
const full = !changes || ['eslint.config.js', 'stylelint.config.js', 'package-lock.json'].some(path => changes.has(path));
const files = changes ? [...changes].filter(path => existsSync(path)).sort() : [];
const tsFiles = full ? ['{src,scripts,tests,data}/**/*.ts'] : files.filter(path => /^(src|scripts|tests|data)\/.*\.ts$/.test(path));
const cssFiles = full ? ['src/**/*.css'] : files.filter(path => /^src\/.*\.css$/.test(path));
if (full) {
    console.log('Style check: all TypeScript and CSS files');
}
else {
    console.log(`Style check: ${tsFiles.length} changed TypeScript, ${cssFiles.length} changed CSS`);
}
const results = await Promise.all([checkTypeScript(tsFiles), checkCss(cssFiles)]);
if (results.includes(false)) {
    process.exitCode = 1;
}
