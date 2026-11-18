import { entranceVoid, buildStationEntrance } from '../stations/station-entrance-model.ts';
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { GeographicBuilding } from '../../../infrastructure/buildings/building-data.ts';
import type { BuildingOpening } from '../../../domain/map/model.ts';
import { buildFloorGeometry } from '../floor-geometry.ts';
import { buildingFacade } from './building-facade.ts';
import { buildingPalette } from '../../appearance/building-palette.ts';
import { buildFerrisWheel } from './ferris-wheel-model.ts';

/** Shared metre-scale exterior; detached from walkable floors and their openings. */
export function buildGeographicBuilding(building: GeographicBuilding, openings: BuildingOpening[] = []) {
    const group = new T.Group();
    group.name = 'geographic-building-' + building.id;
    if (building.wheel) {
        group.add(buildFerrisWheel(building.wheel));
    }
    const doors = openings.filter(o => o.buildingId === building.id);
    const materials = new Map<ReturnType<typeof buildingPalette>, {
        wall: T.Material;
        glass: T.Material;
        trim: T.Material;
    }>();
    for (const volume of building.volumes) {
        const palette = buildingPalette(building.id, volume.name);
        if (!materials.has(palette)) {
            materials.set(
                palette,
                {
                    wall: new T.MeshStandardMaterial({ color: palette.wall, roughness: .9 }),
                    glass: new T.MeshStandardMaterial({ color: palette.tower, roughness: .85, metalness: 0 }),
                    trim: new T.MeshStandardMaterial({ color: palette.trim, roughness: .9 }),
                }
            );
        }
        const { wall, glass, trim } = materials.get(palette)!;
        const section = new T.Group();
        section.name = volume.name;
        group.add(section);
        const entrance = volume.base === 0 ? building.entrance : undefined;
        const cutsAt = (y: number) => [
            ...volume.holes,
            ...(entrance && y < entrance.height ? [entranceVoid(entrance)] : []),
            ...doors.filter(d => d.base <= y && d.top > y).map(d => d.outline),
        ];
        const bounds = [...new Set([
            volume.base,
            volume.top,
            ...(entrance ? [entrance.height] : []),
            ...doors.flatMap(d => [d.base, d.top]),
        ].filter(y => y >= volume.base && y <= volume.top))].sort((a, b) => a - b);
        const pieces = bounds.slice(1).map((top, i) => ({ base: bounds[i]!, top, holes: cutsAt((top + bounds[i]!) / 2) }));
        for (const piece of pieces) {
            const towerSurface = volume.surface ? volume.surface === 'tower' : volume.base > 0;
            const body = new T.Mesh(
                buildFloorGeometry(volume.outline, piece.holes, piece.top - piece.base, piece.base),
                towerSurface ? glass : wall
            );
            body.userData.labelOccluder = true;
            body.castShadow = true;
            body.receiveShadow = true;
            section.add(body);
        }
        if (entrance) {
            group.add(buildStationEntrance(entrance));
        }
        if (volume.holes.length && building.id === 'daimaru') {
            for (const hole of volume.holes) {
                const garden = new T.Mesh(
                    buildFloorGeometry(hole, [], .3, volume.base + .1),
                    new T.MeshStandardMaterial({ color: 0x98af91, roughness: 1 })
                );
                garden.name = 'roof-court-garden';
                section.add(garden);
            }
        }
        const bands: T.BufferGeometry[] = [];
        if (volume.facade !== 'plain') {
            for (let y = volume.base + 4; y < volume.top; y += 4) {
                bands.push(buildFloorGeometry(volume.outline, cutsAt(y), .16, y));
            }
        }
        bands.push(buildFloorGeometry(volume.outline, cutsAt(volume.top - .001), .35, volume.top));
        const geometry = mergeGeometries(bands)!;
        bands.forEach(g => g.dispose());
        const defaultFins = (volume.base > 0 && ['hankyu-grand', 'daimaru'].includes(building.id))
            || building.id === 'yodobashi';
        const facadeVolume = !volume.facade && defaultFins ? { ...volume, facade: 'vertical' as const } : volume;
        const facade = buildingFacade(facadeVolume, doors, trim);
        if (facade) {
            section.add(facade);
        }
        const rim = new T.Mesh(geometry, trim);
        rim.userData.labelOccluder = true;
        section.add(rim);
    }
    for (const sign of building.signs ?? []) {
        const backing = new T.Mesh(
            new T.PlaneGeometry(sign.width, sign.height),
            new T.MeshStandardMaterial({ color: 0x405754, roughness: .9, side: T.DoubleSide })
        );
        const c = Math.cos(sign.angle);
        const s = Math.sin(sign.angle);
        backing.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(c, 0, s), new T.Vector3(0, 1, 0), new T.Vector3(-s, 0, c)));
        backing.position.set(sign.center.x - s * .6, sign.y, sign.center.z + c * .6);
        backing.name = 'station-facade-sign';
        group.add(backing);
        if (typeof document !== 'undefined') {
            const canvas = document.createElement('canvas');
            canvas.width = 2048;
            canvas.height = 256;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#f1f1e4';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const lines = sign.text.split('\n');
            ctx.font = `600 ${lines.length > 1 ? 90 : 150}px "Yu Gothic","Microsoft YaHei",sans-serif`;
            lines.forEach((line, i) => ctx.fillText(line, 1024, 128 + (i - (lines.length - 1) / 2) * 112, 1950));
            const texture = new T.CanvasTexture(canvas);
            texture.colorSpace = T.SRGBColorSpace;
            const text = new T.Mesh(
                new T.PlaneGeometry(sign.width * .95, sign.height * .9),
                new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
            );
            text.quaternion.copy(backing.quaternion);
            text.position.copy(backing.position).add(new T.Vector3(-s * .05, 0, c * .05));
            text.name = 'station-facade-sign-text';
            group.add(text);
        }
    }
    return group;
}
