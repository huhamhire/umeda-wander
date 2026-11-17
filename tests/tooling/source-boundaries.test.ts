import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

function sources(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(dir, entry.name);
        return entry.isDirectory() ? sources(file) : file.endsWith('.ts') ? [file] : [];
    });
}
test(
    'source, tests and scripts cannot reintroduce the retired comparison map',
    () => {
        const archive = path.resolve('deprecated') + path.sep;
        for (const file of ['src', 'tests', 'scripts'].flatMap(sources)) {
            const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
            const check = (specifier: ts.StringLiteralLike) => {
                const target = path.resolve(path.dirname(file), specifier.text);
                assert.ok(!target.startsWith(archive), `${file} imports archived data: ${specifier.text}`);
            };
            function visit(node: ts.Node): void {
                if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
                    check(node.moduleSpecifier);
                }
                if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
                    check(node.arguments[0]);
                }
                ts.forEachChild(node, visit);
            }
            visit(source);
        }
    }
);

test('domain and application modules cannot depend on rendering or infrastructure adapters', () => {
    const root = path.resolve('src') + path.sep;
    for (const file of ['src/domain', 'src/application'].flatMap(sources)) {
        const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
        for (const statement of source.statements) {
            if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) {
                continue;
            }
            const specifier = statement.moduleSpecifier;
            if (!specifier || !ts.isStringLiteral(specifier)) {
                continue;
            }
            assert(!/^three(?:\/|$)/.test(specifier.text), `${file} imports Three.js`);
            if (!specifier.text.startsWith('.')) {
                continue;
            }
            const target = path.relative(root, path.resolve(path.dirname(file), specifier.text));
            assert(!/^(?:infrastructure|presentation)(?:[/\\]|$)/.test(target), `${file} imports ${target}`);
            if (file.startsWith(path.join('src', 'domain'))) {
                assert(!/^application(?:[/\\]|$)/.test(target), `${file} imports an application service`);
            }
        }
    }
});
