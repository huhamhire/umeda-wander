import * as T from 'three';
import type { ParkPavilion } from '../../../domain/map/model.ts';
import { surfaceGeometry } from '../polygon-surface-geometry.ts';

/** Keep the open canopy as roof and wall surfaces with no artificial filled footprint. */
export function buildParkPavilion(pavilion: ParkPavilion): T.Group {
    const group = new T.Group();
    group.name = pavilion.id;
    for (const [kind, faces, color, nightColor] of [
        ['roof', pavilion.roofs, 0xf1efe3, 0x737b76],
        ['wall', pavilion.walls, 0xdcd8c8, 0x535d56]
    ] as const) {
        const material = new T.MeshStandardMaterial({
            color,
            side: T.DoubleSide,
            roughness: .86,
            userData: { nightColor }
        });
        const mesh = new T.Mesh(surfaceGeometry(faces), material);
        mesh.name = kind;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.labelOccluder = true;
        group.add(mesh);
    }
    return group;
}
