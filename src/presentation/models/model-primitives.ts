import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Shared procedural mesh construction without map state or DOM dependencies. */
export class ModelPrimitives {
    private readonly materials = new Map<number, T.MeshStandardMaterial>();

    /**
     * Reuse procedural materials for equal colours instead of allocating one per component.
     */
    material(color: number): T.MeshStandardMaterial {
        let value = this.materials.get(color);
        if (!value) {
            value = new T.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02 });
            this.materials.set(color, value);
        }
        return value;
    }

    /**
     * Create a named box component, set its transform and shadows, then add it to the parent group.
     */
    box(group: T.Group, x: number, y: number, z: number, w: number, h: number, d: number, color: number): T.Mesh {
        const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), this.material(color));
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    }

    /**
     * Place a slender beam between two endpoints, deriving its length and orientation from them.
     */
    beam(group: T.Group, a: T.Vector3, b: T.Vector3, radius: number, color: number): T.Mesh {
        const delta = b.clone().sub(a);
        const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, delta.length(), 5), this.material(color));
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
        group.add(mesh);
        return mesh;
    }

    /**
     * Batch static geometry by material to reduce draw calls while preserving region groups.
     */
    batchStaticMeshes(group: T.Group): void {
        const batches = new Map<T.Material, T.Mesh[]>();
        for (const child of group.children) {
            if (!(child instanceof T.Mesh) || child.userData.dynamic || child.userData.labelOccluder || Array.isArray(child.material)) {
                continue;
            }
            const batch = batches.get(child.material) ?? [];
            batch.push(child);
            batches.set(child.material, batch);
        }
        for (const [material, meshes] of batches) {
            if (meshes.length < 2) {
                continue;
            }
            const parts = meshes.map(mesh => {
                mesh.updateMatrix();
                return mesh.geometry.clone().applyMatrix4(mesh.matrix);
            });
            const geometry = mergeGeometries(parts);
            parts.forEach(part => part.dispose());
            if (!geometry) {
                continue;
            }
            meshes.forEach(mesh => {
                group.remove(mesh);
                mesh.geometry.dispose();
            });
            const merged = new T.Mesh(geometry, material);
            merged.castShadow = true;
            merged.receiveShadow = true;
            group.add(merged);
        }
    }
}
