import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BuildingOpening } from '../../domain/map/model.ts';
import type { BuildingVolume } from '../../infrastructure/buildings/building-data.ts';
import { pointInPolygon } from '../../domain/map/geometry.ts';

/** Shallow, untextured fins give white models rhythm without a photographic facade. */
export function buildingFacade(volume: BuildingVolume, openings: BuildingOpening[], material: T.Material): T.Mesh | undefined {
    if (volume.facade !== 'vertical' && volume.facade !== 'grid') {
        return undefined;
    }
    const fins: T.BufferGeometry[] = [];
    const outline = volume.outline;
    const bounds = [...new Set([volume.base, volume.top, ...openings.flatMap(d => [d.base, d.top])]
        .filter(y => y >= volume.base && y <= volume.top))].sort((a, b) => a - b);
    for (const [i, a] of outline.entries()) {
        const b = outline[(i + 1) % outline.length]!;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const count = Math.floor(Math.hypot(dx, dz) / 3);
        for (let j = 1; j < count; j++) {
            const p = { x: a.x + dx * j / count, z: a.z + dz * j / count };
            for (let k = 1; k < bounds.length; k++) {
                const low = bounds[k - 1]!;
                const high = bounds[k]!;
                if (openings.some(d => d.base < high && d.top > low && pointInPolygon(p, d.outline))) {
                    continue;
                }
                const g = new T.BoxGeometry(.28, high - low, .6);
                g.rotateY(-Math.atan2(dz, dx));
                g.translate(p.x, (low + high) / 2, p.z);
                fins.push(g);
            }
        }
    }
    if (!fins.length) {
        return undefined;
    }
    const mesh = new T.Mesh(mergeGeometries(fins)!, material);
    mesh.name = 'white-model-facade-fins';
    fins.forEach(g => g.dispose());
    return mesh;
}
