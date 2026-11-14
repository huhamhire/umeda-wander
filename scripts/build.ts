import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function buildPage(): Promise<void> {
  const result = await build({ entryPoints: ['src/main.ts'], bundle: true, write: false,
    format: 'iife', platform: 'browser', target: 'es2022', minify: true, legalComments: 'inline' });
  const js = result.outputFiles[0]?.text;
  if (!js) throw new Error('No JavaScript generated');
  const [template, css, threeLicense, polygonLicense, predicatesLicense, splayReadme] = await Promise.all([
    readFile('src/index.html', 'utf8'), readFile('src/styles.css', 'utf8'),
    readFile('node_modules/three/LICENSE', 'utf8'),
    readFile('node_modules/polygon-clipping/LICENSE.md', 'utf8'),
    readFile('node_modules/robust-predicates/LICENSE', 'utf8'),
    readFile('node_modules/splaytree/Readme.md', 'utf8'),
  ]);
  const splayLicense=splayReadme.split('## License')[1];
  if(!splayLicense)throw new Error('Missing splaytree license text');
  const license=`Three.js\n${threeLicense}\npolygon-clipping\n${polygonLicense}\nrobust-predicates\n${predicatesLicense}\nsplaytree\n${splayLicense}`;
  const html = template.replace('<!-- STYLES -->', '<link rel="stylesheet" href="./styles.css" />')
    .replace('<!-- APP -->', '<script defer src="./app.js"></script>')
    .replace('<!-- LICENSE -->', () => `<!-- Third-party licenses\n${license.replaceAll('--', '—')}\n-->`);
  await mkdir('dist', { recursive: true });
  await Promise.all([writeFile('dist/index.html', html), writeFile('dist/app.js', js), writeFile('dist/styles.css', css)]);
  console.log(`Built dist/index.html + app.js + styles.css (${(Buffer.byteLength(html + js + css) / 1024).toFixed(0)} KB total)`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await buildPage();
