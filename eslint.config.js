import stylistic from '@stylistic/eslint-plugin';
import typescript from '@typescript-eslint/parser';
import jsdoc from 'eslint-plugin-jsdoc';

export default [
    {
        files: ['{src,scripts,tests,data}/**/*.ts'],
        languageOptions: { parser: typescript },
        plugins: { '@stylistic': stylistic },
        rules: {
            curly: ['error', 'all'],
            '@stylistic/max-statements-per-line': ['error', { max: 1 }],
            '@stylistic/semi': ['error', 'always'],
            '@stylistic/indent': ['error', 4, { SwitchCase: 1 }],
            '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],
            '@stylistic/padded-blocks': ['error', 'never'],
            '@stylistic/no-trailing-spaces': 'error',
            '@stylistic/linebreak-style': ['error', 'unix'],
            '@stylistic/eol-last': ['error', 'always']
        }
    },
    {
        files: ['{src,scripts,data}/**/*.ts'],
        plugins: { jsdoc },
        rules: {
            'jsdoc/require-jsdoc': ['error', {
                require: { FunctionDeclaration: true, MethodDefinition: true },
                checkConstructors: true,
                checkGetters: true,
                checkSetters: true,
                exemptEmptyConstructors: false,
                enableFixer: false,
                contexts: [
                    ':matches(Program, Program > ExportNamedDeclaration) > VariableDeclaration > VariableDeclarator > ' +
                        ':matches(ArrowFunctionExpression, FunctionExpression)',
                    'Property:matches([method=true], [kind="get"], [kind="set"]) > FunctionExpression'
                ]
            }]
        }
    }
];
