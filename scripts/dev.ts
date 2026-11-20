import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';
import { buildPage } from './build.ts';

/** Pick a response encoding, honoring explicitly excluded representations. */
function assetEncoding(header: string | undefined): 'br' | 'gzip' | 'identity' | undefined {
    const weights = new Map((header ?? '').toLowerCase().split(',').map(item => {
        const [name, ...parameters] = item.trim().split(';');
        const quality = parameters.map(value => value.trim()).find(value => value.startsWith('q='));
        return [name?.trim(), quality === undefined ? 1 : Number(quality.slice(2))] as const;
    }));
    const wildcard = weights.get('*');
    const choices = [
        { name: 'br', weight: weights.get('br') ?? wildcard ?? 0 },
        { name: 'gzip', weight: weights.get('gzip') ?? wildcard ?? 0 },
        { name: 'identity', weight: weights.get('identity') ?? (wildcard === 0 ? 0 : Number.EPSILON) }
    ] as const;
    return choices.filter(({ weight }) => weight > 0 && weight <= 1).sort((a, b) => b.weight - a.weight)[0]?.name;
}

/** Compress the response in memory without creating an additional file in dist. */
async function encodeAsset(body: Buffer, encoding: 'br' | 'gzip' | 'identity'): Promise<Buffer> {
    if (encoding === 'br') {
        return promisify(brotliCompress)(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 6 } });
    }
    if (encoding === 'gzip') {
        return promisify(gzip)(body);
    }
    return body;
}

await buildPage();
let pending: ReturnType<typeof setTimeout>;
let queue = Promise.resolve();
watch(
    'src',
    { recursive: true },
    () => {
        clearTimeout(pending);
        pending = setTimeout(() => {
            queue = queue.then(buildPage).catch(console.error);
        }, 150);
    }
);
const server = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (path === '/favicon.ico') {
        res.writeHead(204).end();
        return;
    }
    const files: Record<string, {
        file: string;
        mime: string;
    }> = {
        '/': { file: 'index.html', mime: 'text/html; charset=utf-8' },
        '/index.html': { file: 'index.html', mime: 'text/html; charset=utf-8' },
        '/app.js': { file: 'app.js', mime: 'text/javascript; charset=utf-8' },
        '/styles.css': { file: 'styles.css', mime: 'text/css; charset=utf-8' },
        '/osm-derived-data.json': { file: 'osm-derived-data.json', mime: 'application/json; charset=utf-8' },
    };
    const chunk = /^\/chunks\/[a-z0-9_-]+\.js$/i.test(path);
    const resource = chunk ? { file: path.slice(1), mime: files['/app.js']!.mime } : files[path];
    if (!resource) {
        res.writeHead(404).end();
        return;
    }
    const compressed = chunk || resource.file === 'osm-derived-data.json';
    const encoding = compressed ? assetEncoding(req.headers['accept-encoding']) : 'identity';
    if (!encoding) {
        res.writeHead(406, { Vary: 'Accept-Encoding' }).end();
        return;
    }
    try {
        const body = await encodeAsset(await readFile(`dist/${resource.file}`), encoding);
        res.writeHead(200, {
            'Content-Type': resource.mime,
            'Cache-Control': 'no-store',
            'Content-Length': body.length,
            ...(compressed ? { Vary: 'Accept-Encoding' } : {}),
            ...(encoding !== 'identity' ? { 'Content-Encoding': encoding } : {})
        });
        res.end(body);
    }
    catch {
        res.writeHead(500).end('Build unavailable');
    }
});
server.listen(
    Number(process.env.PORT ?? 5173),
    '0.0.0.0',
    () => {
        const address = server.address();
        if (address && typeof address !== 'string') {
            console.log(`Local: http://127.0.0.1:${address.port}`);
            console.log(`Listening: 0.0.0.0:${address.port} (LAN: use this computer's IP address)`);
        }
    }
);
