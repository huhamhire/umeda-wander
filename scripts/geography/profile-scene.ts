import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import * as T from 'three';
import { layout, levels, facilities } from '../../src/infrastructure/district/geographic-map.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { buildGeographicBuilding } from '../../src/presentation/models/buildings/geographic-building-model.ts';
import { buildGeographicContext } from '../../src/presentation/models/public-areas/geographic-context.ts';
mkdirSync('build/geography', { recursive: true });
const bundle = 'build/geography/profile-map-models.mjs';
let ModelConstructor: typeof import('../../src/presentation/models/map-models.ts').MapModels;
try {
    await build({
        entryPoints: ['src/presentation/models/map-models.ts'],
        bundle: true,
        platform: 'node',
        format: 'esm',
        packages: 'external',
        outfile: bundle,
    });
    ({ MapModels: ModelConstructor } = await import(pathToFileURL(resolve(bundle)).href));
}
finally {
    if (existsSync(bundle)) {
        unlinkSync(bundle);
    }
}
const start = performance.now();
const root = new T.Scene();
const scene = new ModelConstructor({ scene: root, layout, levels, facilities, maxAnisotropy: 1 });
for (const c of scene.connectors) {
    c.update((id: string) => levels.find(l => l.id === id)!.y, 'all');
}
const context = buildGeographicContext(scene.groundCutouts);
root.add(
    ...Object.values(context),
    ...geographicBuildings.map(b => buildGeographicBuilding(b, layout.exteriorOpenings))
);
const milliseconds = performance.now() - start;
let meshes = 0;
let triangles = 0;
let vertices = 0;
root.traverse((o: T.Object3D) => {
    if (!(o instanceof T.Mesh)) {
        return;
    }
    const g = o.geometry;
    const count = o instanceof T.InstancedMesh ? o.count : 1;
    meshes++;
    vertices += (g.getAttribute('position')?.count ?? 0) * count;
    triangles += (g.index?.count ?? g.getAttribute('position')?.count ?? 0) / 3 * count;
});
const result = {
    node: process.version,
    platform: process.platform,
    scope: 'CPU geometry construction only; labels, WebGL/GPU and browser interaction excluded',
    milliseconds,
    meshes,
    vertices,
    triangles
};
const output = process.argv.find(a => a.startsWith('--output='))?.slice('--output='.length) ?? 'scene-profile.json';
if (!/^[\w-]+\.json$/.test(output)) {
    throw new Error('Expected a JSON basename for profile output');
}
writeFileSync('build/geography/' + output, JSON.stringify(result, null, 2));
console.log(result);
