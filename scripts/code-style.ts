import ts from 'typescript';

export interface StyleIssue {
    line: number;
    rule: string;
    message: string;
}

/** Check the agreed readability rules using the already installed TypeScript parser. */
export function checkTypeScriptStyle(text: string, fileName: string, requireDocumentation = true): StyleIssue[] {
    const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
    const issues: StyleIssue[] = [];
    const starts = new Map<number, number>();
    const literalLines = new Set<number>();
    const report = (node: ts.Node, rule: string, message: string) => {
        issues.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, rule, message });
    };

    /** Inspect syntax instead of counting semicolons inside strings or for-loop headers. */
    function visit(node: ts.Node): void {
        if (ts.isStringLiteralLike(node) || ts.isTemplateLiteralToken(node)) {
            const start = source.getLineAndCharacterOfPosition(node.getStart(source)).line;
            const end = source.getLineAndCharacterOfPosition(node.end).line;
            for (let line = start + 1; line <= end; line++) {
                literalLines.add(line);
            }
        }
        if (ts.isStatement(node) && !ts.isBlock(node) && !ts.isEmptyStatement(node)) {
            const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line;
            starts.set(line, (starts.get(line) ?? 0) + 1);
        }
        if ((ts.isVariableStatement(node) || ts.isExpressionStatement(node) || ts.isReturnStatement(node) ||
            ts.isThrowStatement(node) || ts.isBreakStatement(node) || ts.isContinueStatement(node)) &&
            !node.getText(source).endsWith(';')) {
            report(node, 'semi', 'Terminate simple statements with a semicolon.');
        }
        if (ts.isIfStatement(node)) {
            if (!ts.isBlock(node.thenStatement) ||
                (node.elseStatement && !ts.isBlock(node.elseStatement) && !ts.isIfStatement(node.elseStatement))) {
                report(node, 'curly', 'Control-flow branches require braces.');
            }
        }
        if ((ts.isForStatement(node) || ts.isForOfStatement(node) || ts.isForInStatement(node) ||
            ts.isWhileStatement(node) || ts.isDoStatement(node)) && !ts.isBlock(node.statement)) {
            report(node, 'curly', 'Loop bodies require braces.');
        }
        const callable = ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) ||
            ts.isConstructorDeclaration(node) || ts.isGetAccessor(node) || ts.isSetAccessor(node)) && node.body) ||
            (ts.isVariableStatement(node) && ts.isSourceFile(node.parent) &&
                node.declarationList.declarations.some(declaration => declaration.initializer &&
                    (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))));
        if (requireDocumentation && callable && !ts.getJSDocCommentsAndTags(node).length) {
            report(node, 'documentation', 'Named functions and methods require purpose-oriented JSDoc.');
        }
        ts.forEachChild(node, visit);
    }

    visit(source);
    for (const [line, count] of starts) {
        if (count > 1) {
            issues.push({ line: line + 1, rule: 'max-statements-per-line', message: 'Keep one statement per line.' });
        }
    }
    const lines = text.split('\n');
    for (const [line, value] of lines.entries()) {
        if (literalLines.has(line)) {
            continue;
        }
        if (!value.trim() && line < lines.length - 1) {
            const previous = lines[line - 1]?.trim() ?? '';
            const next = lines[line + 1]?.trim() ?? '';
            if (!previous || /^[)\]}]/.test(next) || /[(\[{]$/.test(previous)) {
                issues.push({
                    line: line + 1,
                    rule: 'blank-lines',
                    message: 'Keep at most one separating blank line; do not pad delimiters with empty lines.'
                });
            }
        }
        if (/\t/.test(value.match(/^\s*/)?.[0] ?? '')) {
            issues.push({ line: line + 1, rule: 'indent', message: 'Indent with spaces, not tabs.' });
        }
        if (value.trim() && !value.trimStart().startsWith('*') && (value.match(/^ */)?.[0].length ?? 0) % 4) {
            issues.push({ line: line + 1, rule: 'indent', message: 'TypeScript indentation must use multiples of four spaces.' });
        }
        if (/[ \t]+$/.test(value)) {
            issues.push({ line: line + 1, rule: 'trailing-whitespace', message: 'Remove trailing whitespace.' });
        }
    }
    if (text.includes('\r') || !text.endsWith('\n')) {
        issues.push({ line: 1, rule: 'line-ending', message: 'Use LF and a final newline.' });
    }
    return issues;
}
