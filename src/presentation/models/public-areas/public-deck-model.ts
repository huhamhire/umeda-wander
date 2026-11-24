import * as T from 'three';
import type { FloorArea, StationLayout, Level } from '../../../domain/map/model.ts';
import { deckBoundarySegments } from '../../../application/public-areas/deck-boundaries.ts';

const unit = new T.BoxGeometry(1, 1, 1);
/** Fine, pale, dense balustrades on the shared exposed perimeter; floor is rendered once by MapScene. */
export function buildPublicDeckRailing(area: FloorArea, layout: StationLayout, levels: Level[]) {
    const segments = deckBoundarySegments(area, layout.areas, levels, layout.exteriorOpenings ?? [], layout.connections, layout.canopies);
    const mesh = new T.InstancedMesh(unit, new T.MeshStandardMaterial({ color: 0xcbd6ce, roughness: 1 }), segments.length * 2);
    mesh.name = 'public-deck-railing-' + area.id;
    const matrix = new T.Matrix4();
    const q = new T.Quaternion();
    const position = new T.Vector3();
    const scale = new T.Vector3();
    segments.forEach(({ from: a, to: b }, i) => {
        const length = Math.hypot(b.x - a.x, b.z - a.z);
        q.setFromAxisAngle(new T.Vector3(0, 1, 0), -Math.atan2(b.z - a.z, b.x - a.x));
        position.set((a.x + b.x) / 2, (area.elevationOffset ?? 0) + 1.65, (a.z + b.z) / 2);
        scale.set(length + .01, .045, .045);
        matrix.compose(position, q, scale);
        mesh.setMatrixAt(i * 2, matrix);
        position.set(a.x, (area.elevationOffset ?? 0) + 1.1, a.z);
        scale.set(.035, 1.1, .035);
        matrix.compose(position, q, scale);
        mesh.setMatrixAt(i * 2 + 1, matrix);
    });
    mesh.computeBoundingSphere();
    return mesh;
}
