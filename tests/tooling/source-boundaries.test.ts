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
