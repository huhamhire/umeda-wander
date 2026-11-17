import * as T from 'three';
import type { LevelId, RouteNode } from '../../../domain/map/model.ts';
import { ModelPrimitives } from '../model-primitives.ts';
import { colors } from '../../appearance/scene-palette.ts';

/** Own illustrative route meshes without adding edges or interpreting station layout. */
export class RouteModel {
    readonly group = new T.Group();
    private readonly nodeById: Map<string, RouteNode>;
    private readonly primitives = new ModelPrimitives();

    /** Index the existing local route nodes; no cross-station paths are created here. */
    constructor(nodes: RouteNode[]) {
        this.nodeById = new Map(nodes.map(node => [node.id, node]));
    }

    /**
     * Dispose existing route geometry and remove route objects.
     */
    private clearRoute(): void {
        this.group.traverse(obj => {
            if (obj instanceof T.Mesh) {
                obj.geometry.dispose();
            }
        });
        this.group.clear();
    }

    /**
     * Rebuild the illustrative route from selected nodes, clearing it when no route is selected.
     */
    update(ids: readonly string[] | null, levelY: (id: LevelId) => number): void {
        this.clearRoute();
        if (!ids) {
            return;
        }
        const points = ids.map(id => {
            const node = this.nodeById.get(id)!;
            return new T.Vector3(node.x, levelY(node.level) + (node.elevationOffset ?? 0) + 1.3, node.z);
        });
        for (let i = 0; i < points.length - 1; i++) {
            const a = points[i]!;
            const b = points[i + 1]!;
            this.primitives.beam(this.group, a, b, 0.38, colors.route);
            const direction = b.clone().sub(a).normalize();
            const arrow = new T.Mesh(new T.ConeGeometry(0.9, 2.1, 3), this.primitives.material(colors.route));
            arrow.position.copy(a).lerp(b, 0.66);
            arrow.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction);
            this.group.add(arrow);
        }
        for (const point of [points[0]!, points.at(-1)!]) {
            const marker = new T.Mesh(new T.SphereGeometry(0.9, 12, 8), this.primitives.material(colors.route));
            marker.position.copy(point);
            this.group.add(marker);
        }
    }
}
