import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Point2 } from '../../../domain/map/model.ts';
import type { PanoramicElevatorPair } from '../../../infrastructure/buildings/building-data.ts';
import { buildFloorGeometry } from '../floor-geometry.ts';

/** Use semicircular ends and straight sides, keeping the longer axis perpendicular to the facade. */
function capsuleOutline(width: number, depth: number): Point2[] {
    const radius = width / 2;
    const straight = (depth - width) / 2;
    return [1, -1].flatMap((side, half) => Array.from({ length: 13 }, (_, i) => {
        const angle = (half + i / 12) * Math.PI;
        return { x: radius * Math.cos(angle), z: side * straight + radius * Math.sin(angle) };
    }));
}

/** Close only the vertical glass surface, leaving the cabin visible through the curved glazing. */
function glassWall(outline: Point2[], bottom: number, top: number): T.BufferGeometry {
    const points = [bottom, top].flatMap(y => outline.flatMap(p => [p.x, y, p.z]));
    const count = outline.length;
    const indices = outline.flatMap((_, i) => {
        const next = (i + 1) % count;
        return [i, i + count, next, next, i + count, next + count];
    });
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(points, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

/** Build both facade shafts and return matching shell recesses in district coordinates. */
export function buildPanoramicElevators(pair: PanoramicElevatorPair) {
    const group = new T.Group();
    group.name = 'panoramic-elevator-pair';
    group.position.set(pair.center.x, 0, pair.center.z);
    group.rotation.y = -pair.heading;
    const outline = capsuleOutline(pair.width, pair.depth);
    const recess = capsuleOutline(pair.width + .16, pair.depth + .16);
    const inner = capsuleOutline(pair.width - .19, pair.depth - .19);
    const glass = new T.MeshStandardMaterial({
        color: 0x8eb4c2, roughness: .26, transparent: true, opacity: .48, depthWrite: false, side: T.DoubleSide,
        userData: { nightColor: 0x678a9b }
    });
    const steel = new T.MeshStandardMaterial({ color: 0x6d8288, roughness: .57, userData: { nightColor: 0x425861 } });
    const solid = new T.MeshStandardMaterial({ color: 0x536267, roughness: .86, userData: { nightColor: 0x3a484f } });
    const red = new T.MeshStandardMaterial({ color: 0xb44e56, roughness: .74, userData: { nightColor: 0x9c464e } });
    const glassTop = pair.top - 5.2;
    const roof = buildFloorGeometry(outline, [], pair.top - glassTop, glassTop);
    const base = buildFloorGeometry(outline, [], .24, pair.base - .24);
    const basement = glassWall(outline, pair.base, 0);
    const glazing = glassWall(outline, 0, glassTop);
    const bands: T.BufferGeometry[] = [];
    for (let y = .24; y < glassTop; y += 3.5) {
        bands.push(buildFloorGeometry(outline, [inner], .15, y));
    }
    // Four vertical mullions frame the glazed face and retain the capsule silhouette at a distance.
    for (const index of [0, 6, 12, 19]) {
        const p = outline[index]!;
        const mullion = new T.BoxGeometry(.11, glassTop, .11);
        bands.push(mullion.toNonIndexed().translate(p.x, glassTop / 2, p.z));
        mullion.dispose();
    }
    const frame = mergeGeometries(bands)!;
    for (const part of bands) {
        part.dispose();
    }
    const offsets = [-pair.spacing / 2, pair.spacing / 2];
    for (const [i, offset] of offsets.entries()) {
        const shaft = new T.Group();
        shaft.name = 'panoramic-elevator-' + (i + 1);
        shaft.position.x = offset;
        const lowerLanding = new T.Mesh(base, solid);
        lowerLanding.name = 'panoramic-elevator-b1-landing';
        const crown = new T.Mesh(roof, red);
        crown.name = 'panoramic-elevator-red-crown';
        crown.userData.labelOccluder = true;
        const window = new T.Mesh(glazing, glass);
        window.name = 'panoramic-elevator-glass';
        const cabin = new T.Mesh(new T.BoxGeometry(pair.width - .6, 2.45, 2.1), steel);
        cabin.name = 'panoramic-elevator-cabin';
        cabin.position.y = glassTop * (.32 + i * .35);
        shaft.add(lowerLanding, new T.Mesh(basement, solid), window, new T.Mesh(frame, steel), crown, cabin);
        group.add(shaft);
    }
    const c = Math.cos(pair.heading);
    const s = Math.sin(pair.heading);
    const openings = offsets.map(offset => recess.map(p => ({
        x: pair.center.x + (p.x + offset) * c - p.z * s,
        z: pair.center.z + (p.x + offset) * s + p.z * c
    })));
    return { group, openings };
}
