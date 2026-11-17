import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import catalog from '../../references/catalog.json' with { type: 'json' };

const root = resolve('references');
const ids = new Set<string>();
for (const item of catalog.items) {
    const target = resolve(root, item.path);
    if (!target.startsWith(root + sep) || !existsSync(target)) {
        throw new Error('Invalid reference path: ' + item.path);
    }
    if (ids.has(item.id)) {
        throw new Error('Duplicate reference ID: ' + item.id);
    }
    ids.add(item.id);
    const bytes = readFileSync(target);
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hash !== item.sha256 || bytes.length !== item.bytes) {
        throw new Error('Reference changed; review the source/version before updating its record: ' + item.path);
    }
    for (const url of item.sourceUrls) {
        if (new URL(url).protocol !== 'https:') {
            throw new Error('Expected public HTTPS source: ' + item.path);
        }
    }
}
console.log(`Verified ${ids.size} local reference paths and SHA-256 hashes. URL syntax only; not a live availability or permission check.`);
