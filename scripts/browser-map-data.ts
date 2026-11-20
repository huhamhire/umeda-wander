import { readFile } from 'node:fs/promises';
import type { Plugin } from 'esbuild';
import type runtimePlan from '../data/geography/runtime-plan.json';
import type railwayFeatures from '../data/geography/railways/features.json';

/** Pack only the source geometry and attributes consumed by browser-side map assembly. */
export const browserMapData: Plugin = {
    name: 'browser-map-data',
    /** Replace geographic JSON imports in the browser bundle without changing the source snapshots. */
    setup(build) {
        build.onLoad({ filter: /[\\/]geography[\\/]runtime-plan\.json$/ }, async ({ path }) => {
            const plan = JSON.parse(await readFile(path, 'utf8')) as typeof runtimePlan;
            const ground = plan.ground.flatMap(({ id, geometry }) =>
                geometry.type === 'Polygon' || geometry.type === 'MultiPolygon' ? [{ id, geometry }] : []
            );
            return { loader: 'json', contents: JSON.stringify({ ground, underground: plan.underground }) };
        });
        build.onLoad({ filter: /[\\/]railways[\\/](features|subways)\.json$/ }, async ({ path }) => {
            const features = JSON.parse(await readFile(path, 'utf8')) as typeof railwayFeatures;
            const lines = features.map(({ id, coordinates, tags }) => ({
                id,
                coordinates,
                tags: { name: tags.name, operator: tags.operator }
            }));
            return { loader: 'json', contents: JSON.stringify(lines) };
        });
    }
};
