import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PublicLandmark } from '../../../domain/map/model.ts';

/** Build the static B1 Water Tree at Izumi-no-hiroba (泉の広場), with an open floor around its trunk. */
export function buildWaterTree(landmark: PublicLandmark): T.Group {
    const group = new T.Group();
    group.name = landmark.id;
    group.position.set(landmark.x, .55, landmark.z);
    const steel = new T.MeshStandardMaterial({ color: 0xb8d3db, metalness: .48, roughness: .27 });
    const core = new T.Mesh(new T.CylinderGeometry(.28, .37, 2.87, 18), steel);
    core.name = 'water-tree-trunk';
    core.position.y = 1.435;
    group.add(core);
    const tubes: T.BufferGeometry[] = [];
    for (let i = 0; i < 26; i++) {
        const angle = i * Math.PI / 13;
        const radius = 3.12 + .32 * Math.sin(i * 2.1);
        const x = Math.cos(angle);
        const z = Math.sin(angle);
        const branch = new T.CubicBezierCurve3(
            new T.Vector3(.32 * x, 0, .32 * z),
            new T.Vector3(.37 * x, 2.35, .37 * z),
            new T.Vector3(.66 * radius * x, 3.37, .66 * radius * z),
            new T.Vector3(radius * x, 3.42, radius * z)
        );
        tubes.push(new T.TubeGeometry(branch, 16, .042, 5, false));
    }
    const branches = new T.Mesh(mergeGeometries(tubes)!, steel);
    branches.name = 'water-tree-branches';
    group.add(branches);
    for (const tube of tubes) {
        tube.dispose();
    }
    const leaves = new T.InstancedMesh(new T.OctahedronGeometry(1), new T.MeshStandardMaterial({
        color: 0xf5fcfd,
        emissive: 0x408d9f,
        emissiveIntensity: .32,
        metalness: .25,
        roughness: .26
    }), 132);
    leaves.name = 'water-tree-mirrored-leaves';
    const pose = new T.Object3D();
    const tones = [new T.Color(0xc2ecf1), new T.Color(0x6ac4e3), new T.Color(0xeffafa)];
    for (let i = 0; i < leaves.count; i++) {
        const angle = i * 2.399963;
        const radius = .7 + 2.7 * Math.sqrt(i / leaves.count);
        pose.position.set(radius * Math.cos(angle), 3.04 + .36 * Math.sin(i * 1.9), radius * Math.sin(angle));
        pose.rotation.set(.2 + i, angle, i * .64);
        pose.scale.set(.12, .18, .06);
        pose.updateMatrix();
        leaves.setMatrixAt(i, pose.matrix);
        leaves.setColorAt(i, tones[i % tones.length]!);
    }
    group.add(leaves);
    const reflection = new T.Mesh(new T.RingGeometry(1.9, 3.7, 48), new T.MeshBasicMaterial({
        color: 0x69bbd6,
        transparent: true,
        opacity: .21,
        depthWrite: false
    }));
    reflection.name = 'water-tree-floor-light';
    reflection.rotation.x = -Math.PI / 2;
    reflection.position.y = .012;
    group.add(reflection);
    return group;
}
