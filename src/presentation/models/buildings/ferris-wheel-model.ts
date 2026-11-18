import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { FerrisWheel } from '../../../infrastructure/buildings/building-data.ts';

/** Build the static red landmark without textures, animation, or new navigable floors. */
export function buildFerrisWheel(wheel: FerrisWheel): T.Group {
    const group = new T.Group();
    group.name = 'hep-five-ferris-wheel';
    group.position.set(wheel.center.x, wheel.centerHeight, wheel.center.z);
    group.rotation.y = -wheel.heading;
    const red = new T.MeshStandardMaterial({ color: 0xb85b61, roughness: .85 });
    const trim = new T.MeshStandardMaterial({ color: 0xe6dfd9, roughness: .9 });
    const structure: T.BufferGeometry[] = [];
    const windows: T.BufferGeometry[] = [];
    const rod = (from: T.Vector3, to: T.Vector3, radius: number) => {
        const delta = to.clone().sub(from);
        const geometry = new T.CylinderGeometry(radius, radius, delta.length(), 5);
        geometry.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()));
        geometry.translate(...from.clone().add(to).multiplyScalar(.5).toArray());
        return geometry;
    };
    for (const z of [-wheel.depth / 2, wheel.depth / 2]) {
        const rim = new T.TorusGeometry(wheel.radius, .38, 6, 104);
        rim.translate(0, 0, z);
        structure.push(rim);
        for (let i = 0; i < 26; i++) {
            const angle = i * Math.PI * 2 / 26;
            structure.push(rod(new T.Vector3(0, 0, z), new T.Vector3(Math.cos(angle) * wheel.radius, Math.sin(angle) * wheel.radius, z), .09));
        }
        for (const x of [-18, 18]) {
            structure.push(rod(new T.Vector3(x, -32, z * 1.4), new T.Vector3(0, 0, z), .65));
        }
    }
    structure.push(rod(new T.Vector3(0, 0, -5), new T.Vector3(0, 0, 5), 1.1));
    for (let i = 0; i < wheel.cabins; i++) {
        const angle = i * Math.PI * 2 / wheel.cabins;
        const x = Math.cos(angle) * wheel.radius;
        const y = Math.sin(angle) * wheel.radius - 1.5;
        const cabin = new T.BoxGeometry(2.4, 2.1, 2.6);
        cabin.translate(x, y, 0);
        structure.push(cabin);
        const window = new T.BoxGeometry(2.45, 1, 2.65);
        window.translate(x, y + .3, 0);
        windows.push(window);
    }
    for (const [parts, material, name] of [[structure, red, 'red-wheel-structure'], [windows, trim, 'cabin-windows']] as const) {
        const mesh = new T.Mesh(mergeGeometries([...parts])!, material);
        mesh.name = name;
        mesh.castShadow = true;
        group.add(mesh);
        parts.forEach(part => part.dispose());
    }
    return group;
}
