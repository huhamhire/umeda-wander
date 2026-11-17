import * as T from 'three';
import context from '../../data/geography/display-context.json' with { type: 'json' };
import { buildFloorGeometry } from './floor-geometry.ts';
import type { Point2 } from '../domain/map/model.ts';

/**
 * Build the toggleable ground skin, roads and footprints, cutting openings for vertical equipment.
 */
export function buildGeographicContext(groundOpenings: Point2[][] = []) {
    const roads = new T.Group();
    const buildings = new T.Group();
    const add = (
        group: T.Group,
        rings: number[][][],
        color: number,
        y: number,
        height: number,
        name: string,
        cuts: Point2[][] = []
    ) => {
        const points = (ring: number[][]): Point2[] => ring.map(([x, z]) => ({ x: x!, z: z! }));
        const geometry = buildFloorGeometry(points(rings[0]!), [...rings.slice(1).map(points), ...cuts], height, y);
        if (!geometry.getAttribute('position')?.count) {
            return;
        }
        const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ color, roughness: .95 }));
        mesh.name = name;
        group.add(mesh);
    };
    // The clipped opaque ground still covers all station/B1 blocks; real openings remain.
    for (const [i, polygon] of context.scope.entries()) {
        add(roads, polygon, 0xe8e7dc, -1.7, .2, `ground-skin-${i}`, groundOpenings);
    }
    for (const surface of context.surfaces) {
        const building = surface.kind === 'building';
        const road = surface.kind === 'road';
        for (const [i, polygon] of surface.geometry.entries()) {
            add(
                building ? buildings : roads,
                polygon,
                building ? 0xd6ddce : road ? 0xb9c2be : 0xe6dfc5,
                road ? -1 : -1.3,
                building ? .3 : .15,
                `${surface.kind}-${surface.id}-${i}`,
                groundOpenings
            );
        }
    }
    return { roads, buildings };
}
