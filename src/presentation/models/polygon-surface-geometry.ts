import * as T from 'three';
import type { SurfacePolygon } from '../../domain/map/model.ts';

/** Triangulate roof and wall faces in a local plane, retaining their original 3D coordinates. */
export function surfaceGeometry(polygons: SurfacePolygon[]): T.BufferGeometry {
    const positions: number[] = [];
    for (const polygon of polygons) {
        const rings = polygon.map(ring => ring.map(point => new T.Vector3(point.x, point.y, point.z)));
        const contour = rings[0]!;
        const origin = contour[0]!;
        const normal = new T.Vector3();
        const edge = new T.Vector3();
        const next = new T.Vector3();
        for (let i = 1; i < contour.length - 1; i++) {
            edge.subVectors(contour[i]!, origin);
            next.subVectors(contour[i + 1]!, origin);
            normal.add(edge.cross(next));
        }
        if (normal.lengthSq() < 1e-8) {
            continue;
        }
        normal.normalize();
        const nextVertex = contour.find(point => point.distanceToSquared(origin) > 1e-8)!;
        const axis = nextVertex.clone().sub(origin).normalize();
        const across = normal.clone().cross(axis);
        const projected = rings.map(ring => ring.map(point => {
            const delta = point.clone().sub(origin);
            return new T.Vector2(delta.dot(axis), delta.dot(across));
        }));
        const vertices = rings.flat();
        for (const face of T.ShapeUtils.triangulateShape(projected[0]!, projected.slice(1))) {
            for (const index of face) {
                positions.push(...vertices[index]!.toArray());
            }
        }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
}
