import * as T from 'three';
import clipping from 'polygon-clipping';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WalkwayCanopy } from '../../../domain/map/model.ts';
import { passageOutline } from '../../../domain/map/geometry.ts';
import { buildFloorGeometry } from '../floor-geometry.ts';

/** Lightweight segmented roof and perimeter supports leave the walking centreline unobstructed. */
export function buildWalkwayCanopy(canopy: WalkwayCanopy): T.Group {
    const group = new T.Group();
    group.name = canopy.id;
    const roofSegments: clipping.Polygon[] = [];
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
        const cap = canopy.width / 2;
        const dx = (b.x - a.x) / length * cap;
        const dz = (b.z - a.z) / length * cap;
        // Fill bends without adding a roof over the open pavement beyond an endpoint.
        const start = i === 1 ? a : { x: a.x - dx, z: a.z - dz };
        const end = i === canopy.points.length - 1 ? b : { x: b.x + dx, z: b.z + dz };
        roofSegments.push([passageOutline(start, end, canopy.width).map(p => [p.x, p.z])]);
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
                const postX = x - Math.sin(angle) * offset;
                const postZ = z + Math.cos(angle) * offset;
                // Preserve an adjoining bridge mouth while continuing the roof over it.
                if (canopy.postClearances?.some(({ point, radius }) => Math.hypot(point.x - postX, point.z - postZ) < radius)) {
                    continue;
                }
                beam(postX, canopy.clearHeight / 2, postZ, .14, canopy.clearHeight, .14, angle);
            }
        }
    }
    const roofs = clipping.union(roofSegments[0]!, ...roofSegments.slice(1)).map(([outline, ...holes]) =>
        buildFloorGeometry(
            outline!.map(([x, z]) => ({ x, z })),
            holes.map(ring => ring.map(([x, z]) => ({ x, z }))),
            .16,
            canopy.clearHeight + .08
        ));
    const glazed = canopy.glazed === true;
    const roof = new T.Mesh(
        mergeGeometries(roofs)!,
        new T.MeshStandardMaterial({
            color: glazed ? 0xaac4c5 : 0xe1e6df,
            roughness: glazed ? .45 : .9,
            transparent: glazed,
            opacity: glazed ? .58 : 1,
            depthWrite: !glazed
        })
    );
    roof.name = 'walkway-roof-panels';
    roof.userData.labelOccluder = !glazed;
    roof.castShadow = !glazed;
    group.add(roof);
    const frame = new T.Mesh(mergeGeometries(framing)!, new T.MeshStandardMaterial({ color: 0xb5c2bb, roughness: .85 }));
    frame.name = 'walkway-roof-frame';
    group.add(frame);
    [...roofs, ...framing].forEach(geometry => geometry.dispose());
    return group;
}
