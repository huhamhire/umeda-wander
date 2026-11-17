import type { FloorOpening } from '../../../domain/map/model.ts';
import { buildFloorGeometry } from '../floor-geometry.ts';

/** The station base and its paving lines must not cover real descent openings. */
export function stationPlinthParts(openings: FloorOpening[]) {
    const cuts = openings.filter(o => o.level === 'concourse').map(o => o.outline);
    const slab = (x: number, z: number, w: number, d: number, h: number, y: number, color: number) => ({
        geometry: buildFloorGeometry(
            [
                { x: x - w / 2, z: z - d / 2 },
                { x: x + w / 2, z: z - d / 2 },
                { x: x + w / 2, z: z + d / 2 },
                { x: x - w / 2, z: z + d / 2 }
            ],
            cuts,
            h,
            y
        ),
        color,
    });
    const parts = [slab(4, 0, 130, 130, 2, -3.5, 0xe0dfcf), slab(4, 0, 127, 127, 0.5, -1.6, 0xefecdb)];
    for (let x = -58; x <= 66; x += 8) {
        parts.push(slab(x, 0, 0.06, 122, 0.02, -1.07, 0xd9dece));
    }
    for (let z = -60; z <= 60; z += 8) {
        parts.push(slab(4, z, 124, 0.06, 0.02, -1.06, 0xd9dece));
    }
    return parts;
}
