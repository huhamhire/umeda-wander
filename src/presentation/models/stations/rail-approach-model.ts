import * as T from 'three';
import polygonClipping from 'polygon-clipping';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Point2, RailApproach } from '../../../domain/map/model.ts';
import { offsetRailSample, sampleRailSegment, railApproachFootprints } from '../../../domain/map/rail-geometry.ts';
import { buildFloorGeometry } from '../floor-geometry.ts';
import { buildRailSleepers, sleeperPitch, type RailSleeper } from './rail-sleepers.ts';

/**
 * Reuse procedural materials for equal colours instead of allocating one per component.
 */
const material = (color: number) => new T.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.08 });
/** Static rails share the station layer; all switch ballast is unioned before meshing. */
export function buildRailApproachModel(approach: RailApproach): T.Group {
    const group = new T.Group();
    group.name = `rail-approach-${approach.id}`;
    const samples = approach.segments.map(segment => sampleRailSegment(approach, segment));
    const beds = railApproachFootprints(approach);
    const ring = (points: Point2[]): [
        number,
        number
    ][] => points.map(p => [p.x, p.z]);
    const polygons = beds.map(b => [ring(b)]);
    const union = polygonClipping.union(polygons[0]!, ...polygons.slice(1));
    const bedParts = union.map(polygon => buildFloorGeometry(
        polygon[0]!.map(([x, z]) => ({ x, z })),
        polygon.slice(1).map(hole => hole.map(([x, z]) => ({ x, z }))),
        0.3,
        -0.77
    ));
    const railParts: T.BufferGeometry[] = [];
    const sleepers: RailSleeper[] = [];
    for (const path of samples) {
        for (const side of [-0.7, 0.7]) {
            const curve = new T.CatmullRomCurve3(
                path.map(sample => {
                    const p = offsetRailSample(sample, side);
                    return new T.Vector3(p.x, -0.36, p.z);
                }),
                false,
                'centripetal'
            );
            railParts.push(new T.TubeGeometry(curve, 48, 0.06, 4, false));
        }
        const lengths = path.slice(1).map(({ point }, i) => Math.hypot(point.x - path[i]!.point.x, point.z - path[i]!.point.z));
        const { pitch } = sleeperPitch(lengths.reduce((sum, length) => sum + length, 0));
        let next = pitch / 2;
        let travelled = 0;
        for (let i = 1; i < path.length; i++) {
            const a = path[i - 1]!;
            const b = path[i]!;
            const length = lengths[i - 1]!;
            while (next <= travelled + length) {
                const t = (next - travelled) / length;
                sleepers.push({
                    point: { x: a.point.x + (b.point.x - a.point.x) * t, z: a.point.z + (b.point.z - a.point.z) * t },
                    angle: Math.atan2(b.point.z - a.point.z, b.point.x - a.point.x)
                });
                next += pitch;
            }
            travelled += length;
        }
    }
    const ballastColor = new T.Color(0xb9bcae).lerp(new T.Color(approach.color), 0.16).getHex();
    for (const [parts, name, color] of [[bedParts, 'ballast', ballastColor], [railParts, 'paired-rails', 0x6d7c77]] as const) {
        const geometry = mergeGeometries([...parts]);
        if (!geometry) {
            continue;
        }
        const mesh = new T.Mesh(geometry, material(color));
        mesh.name = name;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        parts.forEach(part => part.dispose());
    }
    group.add(buildRailSleepers('approach-sleepers', sleepers, material(0x939c8e)));
    return group;
}
