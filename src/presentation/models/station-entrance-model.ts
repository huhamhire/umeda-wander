import * as T from 'three';
import type { BuildingEntrance } from '../../infrastructure/buildings/building-data.ts';

/**
 * Map entrance-local along/across coordinates into the building’s district frame.
 */
export function entrancePoint(e: BuildingEntrance, u: number, v: number) {
    const c = Math.cos(e.angle);
    const s = Math.sin(e.angle);
    return { x: e.center.x + u * c - v * s, z: e.center.z + u * s + v * c };
}

/**
 * Construct the entrance forecourt region to subtract from the building shell.
 */
export function entranceVoid(e: BuildingEntrance) {
    return [[-e.width / 2, -e.depth], [e.width / 2, -e.depth], [e.width / 2, 5], [-e.width / 2, 5]].map(([u, v]) => entrancePoint(e, u!, v!));
}

/** Recessed south portal structure and glass canopy; no solid wall across the entrance. */
export function buildStationEntrance(e: BuildingEntrance) {
    const group = new T.Group();
    group.name = 'south-station-entrance';
    const stone = new T.MeshStandardMaterial({ color: 0xc4c9bc, roughness: .95 });
    const metal = new T.MeshStandardMaterial({ color: 0xdce1d7, roughness: .7 });
    const glass = new T.MeshStandardMaterial({
        color: 0xb6cecb,
        transparent: true,
        opacity: .32,
        depthWrite: false,
        side: T.DoubleSide,
        roughness: .35
    });
    const box = (name: string, u: number, v: number, y: number, w: number, h: number, d: number) => {
        const p = entrancePoint(e, u, v);
        const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), stone);
        mesh.rotation.y = -e.angle;
        mesh.position.set(p.x, y, p.z);
        mesh.name = name;
        mesh.castShadow = true;
        group.add(mesh);
    };
    for (const u of [-e.width / 2, 0, e.width / 2]) {
        box('entrance-pier', u, -4, e.height / 2, 1.8, e.height, 2.2);
    }
    box('entrance-overhang', 0, -2, e.height - .4, e.width + 4, 1.2, 8);
    const beam = (u: number, v: number, y: number, U: number, V: number, Y: number) => {
        const a = entrancePoint(e, u, v);
        const b = entrancePoint(e, U, V);
        const start = new T.Vector3(a.x, y, a.z);
        const end = new T.Vector3(b.x, Y, b.z);
        const delta = end.clone().sub(start);
        const mesh = new T.Mesh(new T.CylinderGeometry(.1, .1, delta.length(), 5), metal);
        mesh.position.copy(start).add(end).multiplyScalar(.5);
        mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
        group.add(mesh);
    };
    const w = e.width / 2 + 2;
    const rear = -7;
    const front = 5;
    const high = 6.2;
    const low = 4.8;
    const corners = [
        entrancePoint(e, -w, rear),
        entrancePoint(e, w, rear),
        entrancePoint(e, w, front),
        entrancePoint(e, -w, front)
    ];
    const positions = new Float32Array([
        corners[0]!.x,
        high,
        corners[0]!.z,
        corners[1]!.x,
        high,
        corners[1]!.z,
        corners[2]!.x,
        low,
        corners[2]!.z,
        corners[0]!.x,
        high,
        corners[0]!.z,
        corners[2]!.x,
        low,
        corners[2]!.z,
        corners[3]!.x,
        low,
        corners[3]!.z
    ]);
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    const canopy = new T.Mesh(geometry, glass);
    canopy.name = 'entrance-glazed-canopy';
    group.add(canopy);
    for (let u = -w; u <= w; u += 4) {
        beam(u, rear, high, u, front, low);
    }
    for (const v of [rear, front]) {
        beam(-w, v, v === rear ? high : low, w, v, v === rear ? high : low);
    }
    for (const u of [-w, w]) {
        beam(u, front, 0, u, front, low);
    }
    return group;
}
