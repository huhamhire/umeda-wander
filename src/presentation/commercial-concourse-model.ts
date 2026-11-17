import * as T from 'three';
import type { CommercialConcourse } from '../domain/map/model.ts';
import { buildFloorGeometry } from './floor-geometry.ts';
import clipping from 'polygon-clipping';
import { passageOutline } from '../domain/map/geometry.ts';

/** Cutaway public hall: open walking axis, cream arches and warm window bays. */
export function buildCommercialConcourse(hall: CommercialConcourse, neighbours: CommercialConcourse[] = []): T.Group {
    const group = new T.Group();
    group.name = hall.id;
    const [a, b] = hall.axis;
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const half = hall.width / 2;
    group.position.set(a.x, 0, a.z);
    group.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    const cream = new T.MeshStandardMaterial({ color: 0xe8ddc9, roughness: 0.84 });
    const floor = new T.MeshStandardMaterial({ color: 0xe6dbc4, roughness: 0.88 });
    const dark = new T.MeshStandardMaterial({ color: 0xa89b85, roughness: 0.9 });
    const bronze = new T.MeshStandardMaterial({ color: 0x998971, roughness: 0.66 });
    const warm = new T.MeshStandardMaterial({
        color: 0xeac789,
        emissive: 0xe6bd76,
        emissiveIntensity: 0.4,
        roughness: 0.7
    });
    const glass = new T.MeshStandardMaterial({
        color: 0xe2c087,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        roughness: 0.35
    });
    const add = (geometry: T.BufferGeometry, material: T.Material, name: string) => {
        const mesh = new T.Mesh(geometry, material);
        mesh.name = name;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.labelOccluder = material !== glass;
        group.add(mesh);
        return mesh;
    };
    const box = (x: number, y: number, z: number, w: number, h: number, d: number, material: T.Material, name: string) => {
        const mesh = add(new T.BoxGeometry(w, h, d), material, name);
        mesh.position.set(x, y, z);
        return mesh;
    };
    const localOutline = [{ x: 0, z: -half }, { x: length, z: -half }, { x: length, z: half }, { x: 0, z: half }];
    const ownIndex = neighbours.findIndex(h => h.id === hall.id);
    const c = (b.x - a.x) / length;
    const s = (b.z - a.z) / length;
    const pavingCuts = neighbours.slice(0, Math.max(0, ownIndex)).map(h => h.outline.map(p => ({
        x: (p.x - a.x) * c + (p.z - a.z) * s,
        z: -(p.x - a.x) * s + (p.z - a.z) * c,
    })));
    add(buildFloorGeometry(localOutline, pavingCuts, 0.07, 0.58), floor, 'concourse-paving');
    for (let x = 2; x < length; x += 4.5) {
        box(x, 0.665, 0, 0.035, 0.02, hall.width - 0.3, dark, 'floor-grid');
    }
    for (const side of [-1, 1]) {
        box(length / 2, 0.665, side * half * 0.62, length, 0.02, 0.035, dark, 'floor-grid');
    }
    const bays = Math.ceil(length / 7.5);
    const bay = length / bays;
    const door = bay * 0.73;
    const spring = hall.height * 0.5;
    const crown = hall.height * 0.86;
    const crossingOutlines = neighbours.filter(h => h.id !== hall.id).map(h => h.outline);
    const worldPoint = (along: number) => ({
        x: a.x + (b.x - a.x) * along / length,
        z: a.z + (b.z - a.z) * along / length,
    });
    if (hall.height > 4) {
        for (const side of [-1, 1]) {
            // First bay opens into the crossing east–west concourse.
            for (let i = 1; i < bays; i++) {
                const bayOutline = passageOutline(worldPoint(i * bay), worldPoint((i + 1) * bay), hall.width + 1);
                if (crossingOutlines.some(outline => clipping.intersection(
                    [bayOutline.map(p => [p.x, p.z] as [
                        number,
                        number
                    ])],
                    [outline.map(p => [p.x, p.z] as [
                        number,
                        number
                    ])]
                ).length)) {
                    continue;
                }
                const shape = new T.Shape();
                shape.moveTo(-bay / 2, 0.65);
                shape.lineTo(-bay / 2, hall.height);
                shape.lineTo(bay / 2, hall.height);
                shape.lineTo(bay / 2, 0.65);
                shape.lineTo(door / 2, 0.65);
                shape.lineTo(door / 2, spring);
                shape.quadraticCurveTo(0, crown, -door / 2, spring);
                shape.lineTo(-door / 2, 0.65);
                shape.closePath();
                const wall = add(
                    new T.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false, curveSegments: 20 }),
                    cream,
                    'arched-facade'
                );
                wall.position.set((i + 0.5) * bay, 0, side * half - 0.175);
                const curve = new T.QuadraticBezierCurve3(
                    new T.Vector3(-door / 2, spring, 0),
                    new T.Vector3(0, crown, 0),
                    new T.Vector3(door / 2, spring, 0)
                );
                const rim = add(new T.TubeGeometry(curve, 20, 0.055, 5, false), bronze, 'arched-window-frame');
                rim.position.set((i + 0.5) * bay, 0, side * (half - 0.22));
                if (i % 3 !== 1) {
                    const pane = new T.Shape();
                    pane.moveTo(-door / 2, 0.8);
                    pane.lineTo(door / 2, 0.8);
                    pane.lineTo(door / 2, spring);
                    pane.quadraticCurveTo(0, crown, -door / 2, spring);
                    pane.closePath();
                    const mesh = add(new T.ShapeGeometry(pane, 20), glass, 'warm-display-window');
                    mesh.material.side = T.DoubleSide;
                    mesh.position.set((i + 0.5) * bay, 0, side * (half - 0.15));
                    for (const offset of [-0.25, 0, 0.25]) {
                        box(
                            (i + 0.5) * bay + door * offset,
                            spring / 2 + 0.4,
                            side * (half - 0.2),
                            0.045,
                            spring - 0.8,
                            0.065,
                            bronze,
                            'window-mullion'
                        );
                    }
                }
            }
            box(length / 2, hall.height - 0.15, side * (half - 0.22), length, 0.07, 0.09, warm, 'warm-cornice');
        }
    }
    // Sparse open beams evoke the coffered ceiling without hiding the walking space.
    for (let x = bay; x < length; x += bay) {
        box(x, hall.height, 0, 0.12, 0.12, hall.width, cream, 'open-ceiling-beam');
    }
    return group;
}
