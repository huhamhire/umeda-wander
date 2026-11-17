import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CommercialBuilding } from '../../../domain/map/model.ts';

/** Fine light mullions identify the office/hotel block without indoor floors. */
export function addJpTowerDetails(group: T.Group, building: CommercialBuilding): void {
    const unit = new T.BoxGeometry(1, 1, 1);
    const parts: T.BufferGeometry[] = [];
    for (const volume of building.volumes ?? []) {
        for (const [i, a] of volume.outline.entries()) {
            const b = volume.outline[(i + 1) % volume.outline.length]!;
            const dx = b.x - a.x;
            const dz = b.z - a.z;
            const length = Math.hypot(dx, dz);
            const count = Math.ceil(length / 1.4);
            for (let j = 0; j <= count; j++) {
                const position = new T.Vector3(
                    a.x + dx * j / count,
                    (building.podiumHeight ?? 0) + 0.4 + volume.height / 2,
                    a.z + dz * j / count
                );
                parts.push(unit.clone().applyMatrix4(new T.Matrix4().compose(
                    position,
                    new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -Math.atan2(dz, dx)),
                    new T.Vector3(0.09, volume.height, 0.3)
                )));
            }
        }
    }
    const geometry = mergeGeometries(parts);
    parts.forEach(p => p.dispose());
    unit.dispose();
    if (!geometry) {
        return;
    }
    const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ color: 0xe2e6e4, roughness: 0.75 }));
    mesh.name = 'jp-tower-mullions';
    mesh.userData.labelOccluder = true;
    mesh.castShadow = true;
    group.add(mesh);
}
