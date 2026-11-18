import { build } from 'esbuild';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { buildStyles } from './styles.ts';
import { renderLocalizedPage } from './html.ts';
import { geographicOsmData } from '../src/infrastructure/district/geographic-map.ts';
import type { Locale } from '../src/domain/i18n/message.ts';

/** Regenerate the menu from live station sources with a clean locale and module cache. */
async function buildNavigation(locale: Locale): Promise<string> {
    const script = fileURLToPath(new URL('./navigation-data.ts', import.meta.url));
    const { stdout } = await promisify(execFile)(process.execPath, [script], {
        env: { ...process.env, UMEDA_BUILD_LOCALE: locale },
        encoding: 'utf8'
    });
    return stdout;
}

/**
 * Build deployable page resources and retain dependency licences separately from source files.
 */
export async function buildPage(): Promise<void> {
    const result = await build({
        entryPoints: { app: 'src/main.ts' },
        outdir: 'dist',
        chunkNames: 'chunks/[name]-[hash]',
        bundle: true,
        splitting: true,
        write: false,
        format: 'esm',
        platform: 'browser',
        target: 'es2022',
        minify: true,
        legalComments: 'inline'
    });
    const [template, chineseCredits, japaneseCredits, englishCredits, css, threeLicense, polygonLicense, predicatesLicense, splayReadme] = await Promise.all([
        readFile('src/index.html', 'utf8'),
        readFile('src/content/source-credits.zh-CN.html', 'utf8'),
        readFile('src/content/source-credits.ja.html', 'utf8'),
        readFile('src/content/source-credits.en.html', 'utf8'),
        buildStyles(),
        readFile('node_modules/three/LICENSE', 'utf8'),
        readFile('node_modules/polygon-clipping/LICENSE.md', 'utf8'),
        readFile('node_modules/robust-predicates/LICENSE', 'utf8'),
        readFile('node_modules/splaytree/Readme.md', 'utf8'),
    ]);
    const [chineseNavigation, japaneseNavigation, englishNavigation] = await Promise.all([
        buildNavigation('zh-CN'),
        buildNavigation('ja'),
        buildNavigation('en')
    ]);
    const splayLicense = splayReadme.split('## License')[1];
    if (!splayLicense) {
        throw new Error('Missing splaytree license text');
    }
    const license = `Three.js\n${threeLicense}\npolygon-clipping\n${polygonLicense}\nrobust-predicates\n${predicatesLicense}\nsplaytree\n${splayLicense}`;
    const html = renderLocalizedPage(template, {
        'zh-CN': chineseCredits,
        ja: japaneseCredits,
        en: englishCredits
    }, {
        'zh-CN': chineseNavigation,
        ja: japaneseNavigation,
        en: englishNavigation
    })
        .replace('<!-- STYLES -->', '<link rel="stylesheet" href="./styles.css" />')
        .replace(
            '<!-- APP -->',
            '<script type="module" src="./app.js"></script>'
        )
        .replace(
            '<!-- LICENSE -->',
            () => `<!-- Third-party licenses\n${license.replaceAll('--', '—')}\n-->`
        );
    const appPath = resolve('dist/app.js');
    const app = result.outputFiles.find(file => file.path === appPath);
    if (!app) {
        throw new Error('Missing application entry module');
    }
    await mkdir('dist/chunks', { recursive: true });
    // Publish chunks before the entry starts pointing to them during a dev rebuild.
    await Promise.all(result.outputFiles.filter(file => file !== app).map(file => writeFile(file.path, file.contents)));
    await Promise.all([
        writeFile('dist/index.html', html),
        writeFile(app.path, app.contents),
        writeFile('dist/styles.css', css),
        writeFile('dist/osm-derived-data.json', JSON.stringify(geographicOsmData()))
    ]);
    console.log('Built dist/index.html, application modules, styles and OSM derived data');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await buildPage();
}
