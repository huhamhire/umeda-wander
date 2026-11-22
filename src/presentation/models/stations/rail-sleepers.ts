import * as T from 'three';
import type { Point2 } from '../../../domain/map/model.ts';

export type RailSleeper = { point: Point2; angle: number };

/** Space sleepers around both ends of a rail segment so adjoining runs meet with a normal gap. */
export function sleeperPitch(length: number) {
    const count = Math.max(1, Math.round(length / 1.8));
    return { count, pitch: length / count };
}

/** Keep denser sleeper rows in one draw call per mesh. */
export function buildRailSleepers(name: string, sleepers: RailSleeper[], material: T.Material): T.InstancedMesh {
    const ties = new T.InstancedMesh(new T.BoxGeometry(.45, .13, 2.2), material, sleepers.length);
    ties.name = name;
    ties.castShadow = true;
    ties.receiveShadow = true;
    const transform = new T.Object3D();
    sleepers.forEach(({ point, angle }, i) => {
        transform.position.set(point.x, -.45, point.z);
        transform.rotation.y = -angle;
        transform.updateMatrix();
        ties.setMatrixAt(i, transform.matrix);
    });
    ties.instanceMatrix.needsUpdate = true;
    return ties;
}
