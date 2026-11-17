import { osakaStationSign } from '../../../infrastructure/buildings/daimaru/signage.ts';
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CommercialBuilding, Point2 } from '../../../domain/map/model.ts';
import { buildFloorGeometry } from '../floor-geometry.ts';

/** Facade rhythm only; retail interiors remain in the separate floor models. */
export function addDepartmentMassingDetails(group: T.Group, building: CommercialBuilding): void {
    const unit = new T.BoxGeometry(1, 1, 1);
    const windows: T.BufferGeometry[] = [];
    const piers: T.BufferGeometry[] = [];
    const podium = building.podiumHeight!;
    const hotel = building.id === 'daimaru';
    const add = (
        target: T.BufferGeometry[],
        x: number,
        y: number,
        z: number,
        w: number,
        h: number,
        d: number,
        angle: number
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
    const facade = (outline: Point2[], bottom: number, height: number, spacing: number) => {
        const sign = Math.sign(outline.reduce(
            (sum, a, i) => {
                const b = outline[(i + 1) % outline.length]!;
                return sum + a.x * b.z - b.x * a.z;
            },
            0
        ));
        for (let i = 0; i < outline.length; i++) {
            const a = outline[i]!;
            const b = outline[(i + 1) % outline.length]!;
            const dx = b.x - a.x;
            const dz = b.z - a.z;
            const length = Math.hypot(dx, dz);
            const nx = sign * dz / length;
            const nz = -sign * dx / length;
            const count = Math.max(1, Math.ceil(length / spacing));
            const angle = Math.atan2(dz, dx);
            for (let j = 0; j < count; j++) {
                const t = (j + 0.5) / count;
                const x = a.x + dx * t + nx * 0.09;
                const z = a.z + dz * t + nz * 0.09;
                for (let y = bottom + 0.6; y < bottom + height - 0.2; y += 1.4) {
                    add(windows, x, y, z, length / count * 0.76, 0.85, 0.13, angle);
                }
                add(
                    piers,
                    a.x + dx * j / count + nx * 0.13,
                    bottom + height / 2,
                    a.z + dz * j / count + nz * 0.13,
                    0.1,
                    height,
                    0.16,
                    angle
                );
            }
        }
    };
    // Start above the public bridge doors so decorative pieces cannot seal them.
    facade(building.outline, 2.9, podium - 2.9, hotel ? 8 : 7);
    for (const volume of building.volumes ?? []) {
        facade(volume.outline, podium + 0.4, volume.height, hotel ? 1.5 : building.id === 'hankyu-dept' ? 1.25 : 2.2);
    }
    for (const [parts, color, name] of [
        [windows, hotel ? 0xafc2c1 : 0xc1c2be, 'department-window-grid'],
        [piers, 0xe1dfd3, 'department-stone-piers']
    ] as const) {
        const geometry = mergeGeometries(parts);
        parts.forEach(g => g.dispose());
        if (geometry) {
            mesh(geometry, color, name);
        }
    }
    const center = building.outline.reduce(
        (s, p) => ({ x: s.x + p.x / building.outline.length, z: s.z + p.z / building.outline.length }),
        { x: 0, z: 0 }
    );
    const rim = building.outline.map(p => ({ x: center.x + (p.x - center.x) * 1.006, z: center.z + (p.z - center.z) * 1.006 }));
    const bands: T.BufferGeometry[] = [];
    for (let y = 3; y < podium; y += 1.4) {
        bands.push(buildFloorGeometry(rim, [building.outline], 0.14, y));
    }
    const bandGeometry = mergeGeometries(bands);
    bands.forEach(g => g.dispose());
    if (bandGeometry) {
        mesh(bandGeometry, hotel ? 0xc4c9bf : 0xe0d4cb, 'department-podium-layer-bands');
    }
    if (hotel) {
        const a = building.outline[0]!;
        const b = building.outline[1]!;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const length = Math.hypot(dx, dz);
        const normal = { x: -dz / length, z: dx / length };
        const sign = new T.Mesh(
            new T.PlaneGeometry(18, 3.6),
            new T.MeshBasicMaterial({ map: stationSignTexture(), side: T.DoubleSide })
        );
        sign.name = 'osaka-station-facade-sign';
        sign.userData.text = osakaStationSign.textureName;
        sign.position.set((a.x + b.x) / 2 + normal.x * 0.32, 5.5, (a.z + b.z) / 2 + normal.z * 0.32);
        sign.rotation.y = Math.atan2(normal.x, normal.z);
        group.add(sign);
    }
    unit.dispose();
}

/**
 * Paint the Osaka Station south-facade sign procedurally without loading an external image.
 */
function stationSignTexture(): T.Texture {
    // Geometry checks run without DOM; the live page paints readable native CJK text.
    if (typeof document === 'undefined') {
        return new T.DataTexture(new Uint8Array([117, 132, 125, 255]), 1, 1);
    }
    const canvas = document.createElement('canvas');
    canvas.width = 1536;
    canvas.height = 320;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#75847d';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#fffef1';
    context.font = '600 142px "Yu Gothic","Microsoft YaHei",sans-serif';
    context.fillText(osakaStationSign.japanese, 768, 120);
    context.font = '500 48px sans-serif';
    context.fillText(osakaStationSign.englishSpaced, 768, 252);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    return texture;
}
