import * as T from 'three';
import type { FloorArea, Point2 } from '../../domain/map/model.ts';
import { messageText } from '../../infrastructure/i18n/index.ts';

export const floorLabelColors = { light: 0x4f635a, dark: 0xc8d7c9 };

/** Render a text plane against its own surface, with ordinary depth occlusion. */
export function buildSurfaceLabel(
    id: string, name: string, center: Point2, y: number, angle: number, width: number, maxAnisotropy: number
): T.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 768;
    const context = canvas.getContext('2d')!;
    context.scale(2, 2);
    const lines = name.split('\n');
    // Bake an alpha mask; the material supplies the text colour for each theme.
    context.fillStyle = '#fff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '600 100px "Yu Gothic","Microsoft YaHei",sans-serif';
    lines.forEach((line, i) => context.fillText(line, 512, 192 + (i - (lines.length - 1) / 2) * 116, 950));
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = Math.min(16, maxAnisotropy);
    const co = Math.cos(angle);
    const si = Math.sin(angle);
    const mesh = new T.Mesh(
        new T.PlaneGeometry(width, width * 384 / 1024),
        new T.MeshBasicMaterial({
            map: texture,
            color: floorLabelColors.light,
            userData: { nightColor: floorLabelColors.dark },
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        })
    );
    mesh.name = `floor-label-${id}`;
    mesh.position.set(center.x, y + .025, center.z);
    mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(co, 0, si), new T.Vector3(si, 0, -co), new T.Vector3(0, 1, 0)));
    return mesh;
}

/** Adapt a modeled floor to the same text plane used on ground footprints. */
export function buildFloorLabel(area: FloorArea, angle: number, maxAnisotropy = 1): T.Mesh {
    const ekimae = area.id.match(/osaka-ekimae-(\d)/);
    const name = ekimae
        ? messageText('publicAreas.basementBuildings.ekimaeFloorLabel', { number: ekimae[1]! })
        : area.name.replace(' · B1', '');
    const co = Math.cos(angle);
    const si = Math.sin(angle);
    const xs = area.outline.map(p => p.x * co + p.z * si);
    const width = area.labelWidth ?? Math.min(30, (Math.max(...xs) - Math.min(...xs)) * 0.84);
    const center = area.labelAnchor ?? area.outline.reduce(
        (s, p) => ({ x: s.x + p.x / area.outline.length, z: s.z + p.z / area.outline.length }),
        { x: 0, z: 0 }
    );
    return buildSurfaceLabel(area.id, name, center, (area.height ?? .55) + (area.elevationOffset ?? 0), angle, width, maxAnisotropy);
}
