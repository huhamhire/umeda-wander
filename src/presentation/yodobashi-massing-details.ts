import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CommercialBuilding, Point2 } from '../domain/map/model.ts';
import { buildFloorGeometry } from './floor-geometry.ts';
import polygonClipping from 'polygon-clipping';

/** Retail facade fluting, rooftop terrace and the hotel's vertical stone ribs. */
export function addYodobashiMassingDetails(group: T.Group, building: CommercialBuilding): void {
    const podium = building.podiumHeight!;
    const volume = building.volumes![0]!;
    const base = podium + 0.35;
    const top = base + volume.height;
    const unit = new T.BoxGeometry(1, 1, 1);
    const ribs: T.BufferGeometry[] = [];
    const add = (
        target: T.BufferGeometry[],
        x: number,
        y: number,
        z: number,
        w: number,
        h: number,
        d: number,
        angle = 0
    ) => {
        target.push(unit.clone().applyMatrix4(new T.Matrix4().compose(
            new T.Vector3(x, y, z),
            new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -angle),
            new T.Vector3(w, h, d)
        )));
    };
    const mesh = (geometry: T.BufferGeometry, color: number, name: string) => {
        const m = new T.Mesh(geometry, new T.MeshStandardMaterial({ color, roughness: 0.8 }));
        m.name = name;
        m.userData.labelOccluder = true;
        m.castShadow = true;
        m.receiveShadow = true;
        group.add(m);
        return m;
    };
    const facade = (outline: Point2[], bottom: number, height: number, spacing: number, width: number) => {
        const area = outline.reduce(
            (s, p, i) => {
                const q = outline[(i + 1) % outline.length]!;
                return s + p.x * q.z - q.x * p.z;
            },
            0
        );
        for (let i = 0; i < outline.length; i++) {
            const a = outline[i]!;
            const b = outline[(i + 1) % outline.length]!;
            const dx = b.x - a.x;
            const dz = b.z - a.z;
            const length = Math.hypot(dx, dz);
            const count = Math.ceil(length / spacing);
            const nx = Math.sign(area) * dz / length;
            const nz = -Math.sign(area) * dx / length;
            for (let j = 0; j <= count; j++) {
                const t = j / count;
                add(
                    ribs,
                    a.x + dx * t + nx * 0.06,
                    bottom + height / 2,
                    a.z + dz * t + nz * 0.06,
                    width,
                    height,
                    0.16,
                    Math.atan2(dz, dx)
                );
            }
        }
    };
    // Stop podium fluting above door height, leaving every bridge entrance clear.
    const podiumOutline = building.perimeterGallery?.innerOutline ?? building.outline;
    for (const part of building.podiumParts ?? [{ outline: podiumOutline, height: podium }]) {
        facade(part.outline, 2.8, part.height - 2.8, 1.4, 0.1);
    }
    facade(volume.outline, base, volume.height, 1.1, 0.16);
    const geometry = mergeGeometries(ribs)!;
    ribs.forEach(g => g.dispose());
    mesh(geometry, 0xe5e7dc, 'yodobashi-vertical-facade-ribs');
    const ring = (points: Point2[]): [
        number,
        number
    ][] => points.map(p => [p.x, p.z]);
    const front = building.podiumParts?.[0];
    const gardens = polygonClipping.intersection([ring(building.outline.slice(4, 10))], [ring(front?.outline ?? podiumOutline)]);
    for (const polygon of gardens) {
        const garden = polygon[0]!.map(([x, z]) => ({ x, z }));
        mesh(
            buildFloorGeometry(garden, [volume.outline], 0.07, (front?.height ?? podium) + 0.36),
            0xcbd8b9,
            'retail-roof-garden'
        );
    }
    // A compact roof service block and geometric helipad hint, no rooftop route.
    let edge = 0;
    for (let i = 1; i < volume.outline.length; i++) {
        const a = volume.outline[i]!;
        const b = volume.outline[(i + 1) % volume.outline.length]!;
        const c = volume.outline[edge]!;
        const d = volume.outline[(edge + 1) % volume.outline.length]!;
        if (Math.hypot(b.x - a.x, b.z - a.z) > Math.hypot(d.x - c.x, d.z - c.z)) {
            edge = i;
        }
    }
    const a = volume.outline[edge]!;
    const b = volume.outline[(edge + 1) % volume.outline.length]!;
    const angle = Math.atan2(b.z - a.z, b.x - a.x);
    const center = { x: (a.x + b.x) / 2 - Math.sin(angle) * 3.4, z: (a.z + b.z) / 2 + Math.cos(angle) * 3.4 };
    const cap: T.BufferGeometry[] = [];
    add(cap, center.x, top + 0.8, center.z, 6.2, 1.6, 5, angle);
    mesh(cap[0]!, 0xd8dfd6, 'hotel-roof-service-block');
    const pad = new T.Group();
    pad.name = 'hotel-roof-helipad';
    pad.position.set(center.x, top + 1.63, center.z);
    pad.rotation.y = -angle;
    group.add(pad);
    const paint = new T.MeshStandardMaterial({ color: 0xe3d7b8, roughness: 0.85 });
    const circle = new T.Mesh(new T.TorusGeometry(1.9, 0.04, 4, 40), paint);
    circle.rotation.x = -Math.PI / 2;
    pad.add(circle);
    for (const [x, z, w, d] of [[-0.6, 0, 0.09, 1.7], [0.6, 0, 0.09, 1.7], [0, 0, 1.2, 0.09]]) {
        const bar = new T.Mesh(unit.clone(), paint);
        bar.position.set(x!, 0.02, z!);
        bar.scale.set(w!, 0.035, d!);
        pad.add(bar);
    }
    unit.dispose();
}
