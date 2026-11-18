export default {
    plugins: ['@stylistic/stylelint-plugin'],
    rules: {
        '@stylistic/indentation': 2,
        'declaration-block-single-line-max-declarations': 0,
        '@stylistic/declaration-block-semicolon-newline-after': 'always',
        '@stylistic/linebreaks': 'unix',
        '@stylistic/no-missing-end-of-source-newline': true
    }
};
