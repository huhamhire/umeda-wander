import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { buildPage } from './build.ts';
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
    };
    const resource = files[path];
    if (!resource) {
        res.writeHead(404).end();
        return;
    }
    try {
        const body = await readFile(`dist/${resource.file}`);
        res.writeHead(200, { 'Content-Type': resource.mime, 'Cache-Control': 'no-store' });
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
