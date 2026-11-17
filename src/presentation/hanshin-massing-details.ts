import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CommercialBuilding, Point2 } from '../domain/map/model.ts';

/** Curved retail fins and an orthogonal office grid; no internal store floors. */
export function addHanshinMassingDetails(group: T.Group, building: CommercialBuilding): void {
    const unit = new T.BoxGeometry(1, 1, 1);
    const glazing: T.BufferGeometry[] = [];
    const fins: T.BufferGeometry[] = [];
    const green: T.BufferGeometry[] = [];
    const box = (
        parts: T.BufferGeometry[],
        x: number,
        y: number,
        z: number,
        w: number,
        h: number,
        d: number,
        angle: number
    ) => parts.push(unit.clone().applyMatrix4(new T.Matrix4().compose(
        new T.Vector3(x, y, z),
        new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -angle),
        new T.Vector3(w, h, d)
    )));
    const facade = (outline: Point2[], bottom: number, height: number, office: boolean) => {
        const orientation = Math.sign(outline.reduce(
            (sum, a, i) => {
                const b = outline[(i + 1) % outline.length]!;
                return sum + a.x * b.z - b.x * a.z;
            },
            0
        ));
        for (const [i, a] of outline.entries()) {
            const b = outline[(i + 1) % outline.length]!;
            const dx = b.x - a.x;
            const dz = b.z - a.z;
            const length = Math.hypot(dx, dz);
            const angle = Math.atan2(dz, dx);
            const nx = orientation * dz / length;
            const nz = -orientation * dx / length;
            const count = Math.ceil(length / (office ? 1.65 : 1.5));
            for (let j = 0; j < count; j++) {
                const t = (j + 0.5) / count;
                const x = a.x + dx * t + nx * 0.13;
                const z = a.z + dz * t + nz * 0.13;
                box(glazing, x, bottom + height / 2, z, length / count * 0.9, height - 0.2, 0.12, angle);
                if (office) {
                    box(fins, x, bottom + height / 2, z, 0.1, height, 0.38, angle);
                }
                else {
                    for (let row = 0; row < Math.floor(height / 1.35); row++) {
                        const y = bottom + (row + 0.5) * 1.35;
                        box(fins, x + nx * 0.19, y, z + nz * 0.19, 0.22, 1.28, 0.65, angle + (row % 2 ? 0.24 : -0.24));
                        if ((j + row) % 5 === 0) {
                            box(green, x + nx * 0.14, y - 0.42, z + nz * 0.14, length / count * 0.56, 0.23, 0.26, angle);
                        }
                    }
                }
            }
        }
    };
    facade(building.outline, 3, building.podiumHeight! - 3, false);
    for (const v of building.volumes ?? []) {
        facade(v.outline, building.podiumHeight! + 0.4, v.height, true);
    }
    for (const [parts, color, name] of [
        [glazing, 0xa9bfbc, 'hanshin-facade-glazing'],
        [fins, 0xe5e5d9, 'hanshin-facade-fins'],
        [green, 0xb7c4a5, 'hanshin-podium-planter-bands']
    ] as const) {
        if (!parts.length) {
            continue;
        }
        const geometry = mergeGeometries(parts)!;
        parts.forEach(p => p.dispose());
        const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ color, roughness: 0.8 }));
        mesh.name = name;
        mesh.userData.labelOccluder = true;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
    }
    unit.dispose();
}
