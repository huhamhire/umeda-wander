import * as T from 'three';
import clipping from 'polygon-clipping';
import context from '../../../../data/geography/display-context.json' with { type: 'json' };
import { buildFloorGeometry } from '../floor-geometry.ts';
import type { Point2 } from '../../../domain/map/model.ts';
import { buildingLabelPlacement } from '../../../application/public-areas/building-occupancy.ts';
import { southernGroundBuildingLabels } from '../../../infrastructure/public-areas/basement-buildings.ts';
import { buildSurfaceLabel, floorLabelColors } from '../../labels/floor-label.ts';

const groundColors = {
    skin: { light: 0xe8e7dc, dark: 0x263335 },
    road: { light: 0xb9c2be, dark: 0x39464a },
    building: { light: 0xd6ddce, dark: 0x354641 },
    public: { light: 0xe6dfc5, dark: 0x4a4636 }
} as const;
const footprintBase = -1.3;
const footprintThickness = .3;

/** Convert a display ring in district metres to model coordinates. */
const points = (ring: number[][]): Point2[] => ring.map(([x, z]) => ({ x: x!, z: z! }));

/** Find one readable patch on each named southern footprint after the ground openings are cut. */
export function groundBuildingLabelPlacements(groundOpenings: Point2[][]) {
    const cuts: clipping.Polygon[] = groundOpenings.map(outline => [outline.map(p => [p.x, p.z])]);
    return context.surfaces.flatMap(surface => {
        const name = southernGroundBuildingLabels.get(surface.id);
        if (surface.kind !== 'building' || !name) {
            return [];
        }
        const placements = surface.geometry.flatMap(polygon => {
            const host = points(polygon[0]!);
            return clipping.difference(polygon as clipping.Polygon, ...cuts)
                .map(([outline, ...holes]) => buildingLabelPlacement({ outline: points(outline!), holes: holes.map(points) }, host, 54));
        }).sort((a, b) => b.width - a.width);
        const placement = placements[0];
        return placement && placement.width >= 8 ? [{ id: surface.id, name, ...placement }] : [];
    });
}

/**
 * Build the toggleable ground skin, roads and footprints, cutting openings for vertical equipment.
 */
export function buildGeographicContext(groundOpenings: Point2[][] = [], maxAnisotropy = 1) {
    const roads = new T.Group();
    const buildings = new T.Group();
    const add = (
        group: T.Group,
        rings: number[][][],
        surface: keyof typeof groundColors,
        y: number,
        height: number,
        name: string,
        cuts: Point2[][] = []
    ) => {
        const geometry = buildFloorGeometry(points(rings[0]!), [...rings.slice(1).map(points), ...cuts], height, y);
        if (!geometry.getAttribute('position')?.count) {
            return;
        }
        const material = new T.MeshStandardMaterial({ color: groundColors[surface].light, roughness: .95 });
        const mesh = new T.Mesh(geometry, material);
        mesh.name = name;
        mesh.userData.groundSurface = surface;
        group.add(mesh);
    };
    // The clipped opaque ground still covers all station/B1 blocks; real openings remain.
    for (const [i, polygon] of context.scope.entries()) {
        add(roads, polygon, 'skin', -1.7, .2, `ground-skin-${i}`, groundOpenings);
    }
    for (const surface of context.surfaces) {
        const building = surface.kind === 'building';
        const road = surface.kind === 'road';
        for (const [i, polygon] of surface.geometry.entries()) {
            add(
                building ? buildings : roads,
                polygon,
                building ? 'building' : road ? 'road' : 'public',
                road ? -1 : footprintBase,
                building ? footprintThickness : .15,
                `${surface.kind}-${surface.id}-${i}`,
                groundOpenings
            );
        }
    }
    if (typeof document !== 'undefined') {
        for (const { id, name, anchor, angle, width } of groundBuildingLabelPlacements(groundOpenings)) {
            buildings.add(buildSurfaceLabel('ground-' + id, name, anchor, footprintBase + footprintThickness, angle, width, maxAnisotropy));
        }
    }
    return { roads, buildings };
}

/** Recolor the ground in place without replacing its clipped terrain meshes. */
export function setGeographicContextTheme(ground: ReturnType<typeof buildGeographicContext>, dark: boolean): void {
    const theme = dark ? 'dark' : 'light';
    for (const group of Object.values(ground)) {
        for (const mesh of group.children) {
            const surface = mesh.userData.groundSurface as keyof typeof groundColors;
            if (mesh instanceof T.Mesh && mesh.material instanceof T.MeshStandardMaterial && surface) {
                mesh.material.color.setHex(groundColors[surface][theme]);
            }
            if (mesh instanceof T.Mesh && mesh.material instanceof T.MeshBasicMaterial && mesh.name.startsWith('floor-label-ground-')) {
                mesh.material.color.setHex(floorLabelColors[theme]);
            }
        }
    }
}
