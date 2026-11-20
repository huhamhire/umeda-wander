import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { browserMapData } from '../../scripts/browser-map-data.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { edges, facilities, layout, levels, nodes } from '../../src/infrastructure/district/geographic-map.ts';

test('compacting browser source data preserves the assembled map and building footprints', async () => {
    const result = await build({
        stdin: {
            contents: [
                'export { geographicBuildings } from "./src/infrastructure/buildings/index.ts";',
                'export { edges, facilities, layout, levels, nodes } from "./src/infrastructure/district/geographic-map.ts";'
            ].join('\n'),
            resolveDir: process.cwd()
        },
        bundle: true,
        write: false,
        format: 'esm',
        platform: 'browser',
        plugins: [browserMapData]
    });
    const source = Buffer.from(result.outputFiles[0]!.contents).toString('base64');
    const compact = await import(`data:text/javascript;base64,${source}`);
    for (const [name, full] of Object.entries({ geographicBuildings, edges, facilities, layout, levels, nodes })) {
        assert.deepEqual(compact[name], full, name);
    }
});
