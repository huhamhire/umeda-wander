import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import * as T from 'three';
import { layout, levels, facilities } from '../../src/infrastructure/district/geographic-map.ts';
import { planFloorOpenings } from '../../src/application/connection-openings.ts';
import { planAtriumOpenings } from '../../src/application/atrium-openings.ts';
import { planGateBoundaries } from '../../src/application/gate-boundaries.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { buildGeographicBuilding } from '../../src/presentation/models/geographic-building-model.ts';
import { buildGeographicContext } from '../../src/presentation/geographic-context.ts';
mkdirSync('build/geography', { recursive: true });
const bundle = 'build/geography/profile-map-scene.mjs';
let SceneConstructor: typeof import('../../src/presentation/map-scene.ts').MapScene;
try {
    await build({
        entryPoints: ['src/presentation/map-scene.ts'],
        bundle: true,
        platform: 'node',
        format: 'esm',
        packages: 'external',
        outfile: bundle,
    });
    ({ MapScene: SceneConstructor } = await import(pathToFileURL(resolve(bundle)).href));
}
finally {
    if (existsSync(bundle)) {
        unlinkSync(bundle);
    }
}
const start = performance.now();
const scene = Object.create(SceneConstructor.prototype);
const openings = [
    ...planFloorOpenings(layout.connections, levels, layout.platforms),
    ...planAtriumOpenings(layout.atria ?? [])
];
Object.assign(
    scene,
    {
        layout,
        levels,
        facilities,
        openings,
        gateBoundaries: planGateBoundaries(facilities, layout.areas),
        scene: new T.Scene(),
        base: new T.Group(),
        roof: new T.Group(),
        groups: new Map(),
        materials: new Map(),
        commercialMassing: [],
        geographicBuildingFloors: [],
        publicPassages: [],
        connectors: [],
        pickables: [],
        labels: [],
        renderer: { capabilities: { getMaxAnisotropy: () => 1 } },
        label: () => { }
    }
);
Reflect.get(scene, 'buildStation').call(scene);
for (const c of scene.connectors) {
    c.update((id: string) => levels.find(l => l.id === id)!.y, 'all');
}
const context = buildGeographicContext(openings.filter(o => levels.find(l => l.id === o.level)!.y === 0).map(o => o.outline));
scene.scene.add(
    ...Object.values(context),
    ...geographicBuildings.map(b => buildGeographicBuilding(b, layout.exteriorOpenings))
);
const milliseconds = performance.now() - start;
let meshes = 0;
let triangles = 0;
let vertices = 0;
scene.scene.traverse((o: T.Object3D) => {
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
const output = process.argv.find(a => a.startsWith('--output='))?.slice('--output='.length) ?? 'stage-two-profile.json';
if (!/^[\w-]+\.json$/.test(output)) {
    throw new Error('Expected a JSON basename for profile output');
}
writeFileSync('build/geography/' + output, JSON.stringify(result, null, 2));
console.log(result);
