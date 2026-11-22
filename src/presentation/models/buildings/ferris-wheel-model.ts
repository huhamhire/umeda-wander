import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { FerrisWheel } from '../../../infrastructure/buildings/building-data.ts';
import { passageOutline } from '../../../domain/map/geometry.ts';

const rimRadius = .38;
const cabinWidth = 2.45;
const cabinDepth = 2.65;
const cabinHeight = 2.1;
const cabinDrop = 1.5;

/** Leave a stepped chase for the full rotation of both the rim and the hanging cabins. */
export function ferrisWheelRoofRecess(wheel: FerrisWheel) {
    const c = Math.cos(wheel.heading);
    const s = Math.sin(wheel.heading);
    const halfWidth = Math.max(wheel.depth / 2 + rimRadius, cabinDepth / 2) + .65;
    /** Measure the half-chord in the lower wheel arc at this height. */
    const halfChord = (radius: number, y: number) => {
        const offset = Math.max(0, wheel.centerHeight - y);
        return Math.sqrt(Math.max(0, radius ** 2 - offset ** 2));
    };
    return wheel.roofRecessLevels.slice(1).map((top, i) => {
        const rim = halfChord(wheel.radius + rimRadius, top);
        const cabin = halfChord(wheel.radius, top + cabinDrop + cabinHeight / 2) + cabinWidth / 2;
        const reach = Math.max(rim, cabin) + .65;
        const a = { x: wheel.center.x - reach * c, z: wheel.center.z - reach * s };
        const b = { x: wheel.center.x + reach * c, z: wheel.center.z + reach * s };
        return { outline: passageOutline(a, b, 2 * halfWidth), base: wheel.roofRecessLevels[i]!, top };
    });
}

/** Build the static red landmark without textures, animation, or new navigable floors. */
export function buildFerrisWheel(wheel: FerrisWheel): T.Group {
    const group = new T.Group();
    group.name = 'hep-five-ferris-wheel';
    group.position.set(wheel.center.x, wheel.centerHeight, wheel.center.z);
    group.rotation.y = -wheel.heading;
    const red = new T.MeshStandardMaterial({ color: 0xb85b61, roughness: .85 });
    const trim = new T.MeshStandardMaterial({ color: 0xe6dfd9, roughness: .9 });
    const bearingMaterial = new T.MeshStandardMaterial({ color: 0x788385, roughness: .92, userData: { nightColor: 0x4c5a5b } });
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
        const rim = new T.TorusGeometry(wheel.radius, rimRadius, 6, 104);
        rim.translate(0, 0, z);
        structure.push(rim);
        for (let i = 0; i < 26; i++) {
            const angle = i * Math.PI * 2 / 26;
            structure.push(rod(new T.Vector3(0, 0, z), new T.Vector3(Math.cos(angle) * wheel.radius, Math.sin(angle) * wheel.radius, z), .09));
        }
    }
    structure.push(rod(new T.Vector3(0, 0, -5), new T.Vector3(0, 0, 5), 1.1));
    for (const foot of wheel.supportFeet) {
        const y = foot.y - wheel.centerHeight;
        const bearing = new T.Mesh(new T.BoxGeometry(2.4, .65, 2.4), bearingMaterial);
        bearing.name = 'ferris-wheel-roof-bearing';
        bearing.position.set(foot.x, y + .325, foot.z);
        group.add(bearing);
        structure.push(rod(new T.Vector3(foot.x, y + .65, foot.z), new T.Vector3(0, 0, Math.sign(foot.z) * 5), .65));
    }
    for (let i = 0; i < wheel.cabins; i++) {
        const angle = i * Math.PI * 2 / wheel.cabins;
        const x = Math.cos(angle) * wheel.radius;
        const y = Math.sin(angle) * wheel.radius - cabinDrop;
        const cabin = new T.BoxGeometry(2.4, cabinHeight, 2.6);
        cabin.translate(x, y, 0);
        structure.push(cabin);
        const window = new T.BoxGeometry(cabinWidth, 1, cabinDepth);
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
