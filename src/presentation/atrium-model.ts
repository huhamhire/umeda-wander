import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AtriumVoid, FloorArea, LevelId, VerticalConnection } from '../domain/map/model.ts';
import { pointInPolygon } from '../domain/map/geometry.ts';

/** Guard only edges adjoining real floor, leaving all exterior stair landings open. */
export function buildAtriumRailing(atrium: AtriumVoid, level: LevelId, areas: FloorArea[], connections: VerticalConnection[]): T.Group {
    const group = new T.Group();
    group.name = `${atrium.id}-${level}`;
    const outline = atrium.openings.find(o => o.level === level)!.outline;
    const parts: T.BufferGeometry[] = [];
    const unit = new T.BoxGeometry(1, 1, 1);
    const add = (x: number, y: number, z: number, w: number, h: number, d: number, angle: number) => {
        const matrix = new T.Matrix4().compose(
            new T.Vector3(x, y, z),
            new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -angle),
            new T.Vector3(w, h, d)
        );
        parts.push(unit.clone().applyMatrix4(matrix));
    };
    for (let i = 0; i < outline.length; i++) {
        const a = outline[i]!;
        const b = outline[(i + 1) % outline.length]!;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const length = Math.hypot(dx, dz);
        const count = Math.ceil(length);
        const angle = Math.atan2(dz, dx);
        for (let j = 0; j < count; j++) {
            const t = (j + 0.5) / count;
            const x = a.x + dx * t;
            const z = a.z + dz * t;
            const outside = { x: x + dz / length * 0.3, z: z - dx / length * 0.3 };
            if (!areas.some(area => area.level === level && pointInPolygon(outside, area.outline))) {
                continue;
            }
            if (connections.some(c => [c.from, c.to].some(p => p.level === level && Math.hypot(p.x - x, p.z - z) < (c.width ?? 2.2) / 2 + 1.2))) {
                continue;
            }
            add(x, 1.65, z, length / count + 0.01, 0.12, 0.14, angle);
            if (j % 3 === 0) {
                add(x, 1.04, z, 0.12, 1.3, 0.12, 0);
            }
        }
    }
    if (parts.length) {
        const geometry = mergeGeometries(parts)!;
        parts.forEach(g => g.dispose());
        const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ color: 0x8ba99b, roughness: 0.75 }));
        mesh.castShadow = true;
        group.add(mesh);
    }
    unit.dispose();
    return group;
}
