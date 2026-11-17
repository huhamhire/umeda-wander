import { build } from 'esbuild';

/** Bundle local CSS modules into the single deployable stylesheet. */
export async function buildStyles(): Promise<string> {
    const result = await build({
        entryPoints: ['src/styles/index.css'],
        bundle: true,
        write: false,
        minify: false,
        legalComments: 'inline',
    });
    const css = result.outputFiles[0]?.text;
    if (!css) {
        throw new Error('No CSS generated');
    }
    return css;
}
