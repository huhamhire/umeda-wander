import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WalkwayCanopy } from '../../../domain/map/model.ts';
import { passageOutline } from '../../../domain/map/geometry.ts';
import { buildFloorGeometry } from '../floor-geometry.ts';

/** Lightweight segmented roof and perimeter supports leave the walking centreline unobstructed. */
export function buildWalkwayCanopy(canopy: WalkwayCanopy): T.Group {
    const group = new T.Group();
    group.name = canopy.id;
    const roofs: T.BufferGeometry[] = [];
    const framing: T.BufferGeometry[] = [];
    const beam = (x: number, y: number, z: number, w: number, h: number, d: number, angle: number) => {
        const geometry = new T.BoxGeometry(w, h, d);
        geometry.rotateY(-angle);
        geometry.translate(x, y, z);
        framing.push(geometry);
    };
    for (let i = 1; i < canopy.points.length; i++) {
        const a = canopy.points[i - 1]!;
        const b = canopy.points[i]!;
        const length = Math.hypot(b.x - a.x, b.z - a.z);
        if (length < .01) {
            continue;
        }
        const angle = Math.atan2(b.z - a.z, b.x - a.x);
        roofs.push(buildFloorGeometry(passageOutline(a, b, canopy.width), [], .16, canopy.clearHeight + .08));
        const panels = Math.ceil(length / 4);
        for (let panel = 0; panel <= panels; panel++) {
            const x = a.x + (b.x - a.x) * panel / panels;
            const z = a.z + (b.z - a.z) * panel / panels;
            beam(x, canopy.clearHeight + .2, z, .1, .14, canopy.width, angle);
            if (panel % 2 !== 0) {
                continue;
            }
            for (const side of [-1, 1]) {
                const offset = side * (canopy.width / 2 - .25);
                beam(x - Math.sin(angle) * offset, canopy.clearHeight / 2, z + Math.cos(angle) * offset, .14, canopy.clearHeight, .14, angle);
            }
        }
    }
    const roof = new T.Mesh(mergeGeometries(roofs)!, new T.MeshStandardMaterial({ color: 0xe1e6df, roughness: .9 }));
    roof.name = 'walkway-roof-panels';
    roof.userData.labelOccluder = true;
    roof.castShadow = true;
    group.add(roof);
    const frame = new T.Mesh(mergeGeometries(framing)!, new T.MeshStandardMaterial({ color: 0xb5c2bb, roughness: .85 }));
    frame.name = 'walkway-roof-frame';
    group.add(frame);
    [...roofs, ...framing].forEach(geometry => geometry.dispose());
    return group;
}
