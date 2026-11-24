import * as T from 'three';
import clipping from 'polygon-clipping';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PlanRegion, PublicPark } from '../../../domain/map/model.ts';
import { parkTerrainElevation } from '../../../domain/map/park-terrain.ts';
import { buildFloorGeometry } from '../floor-geometry.ts';

const ground = new T.MeshStandardMaterial({ color: 0x91a66f, roughness: .96 });
const lawn = new T.MeshStandardMaterial({ color: 0xaec683, roughness: .96 });
const pavement = new T.MeshStandardMaterial({ color: 0xded6ba, roughness: .92 });
const water = new T.MeshStandardMaterial({ color: 0x68a4a6, roughness: .45 });
const cascade = new T.MeshStandardMaterial({ color: 0x9ac9c9, roughness: .55 });
const stone = new T.MeshStandardMaterial({ color: 0x8c9184, roughness: .97 });
const bark = new T.MeshStandardMaterial({ color: 0x7d7160, roughness: .92 });
const foliage = new T.MeshStandardMaterial({ roughness: .94 });

/** Build a small tree group using stable placement and two instanced meshes. */
function addParkTrees(group: T.Group, park: PublicPark): void {
    const { trees } = park;
    const trunk = new T.InstancedMesh(new T.CylinderGeometry(.13, .22, 1, 6), bark, trees.length);
    const crown = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), foliage, trees.length);
    const colors = [0x637e52, 0x789254, 0x95a866, 0xa7ac72];
    const transform = new T.Object3D();
    trees.forEach(({ x, z, height }, index) => {
        const base = parkTerrainElevation(park, { x, z });
        transform.position.set(x, base + height * .28, z);
        transform.scale.setScalar(height * .55);
        transform.updateMatrix();
        trunk.setMatrixAt(index, transform.matrix);
        transform.position.y = base + height * .72;
        transform.scale.set(height * .31, height * .40, height * .33);
        transform.rotation.y = index * 1.7;
        transform.updateMatrix();
        crown.setMatrixAt(index, transform.matrix);
        crown.setColorAt(index, new T.Color(colors[index % colors.length]!));
    });
    trunk.castShadow = true;
    crown.castShadow = true;
    trunk.name = 'tree-trunks';
    crown.name = 'tree-crowns';
    group.add(trunk, crown);
}

/** Tessellate every draped surface on the same grid so paths and grass follow the terrain profile. */
function terrainGeometry(park: PublicPark, region: PlanRegion, offset: number): T.BufferGeometry {
    const polygon = [region.outline, ...region.holes ?? []].map(ring => ring.map(({ x, z }): clipping.Pair => [x, z]));
    const cell = 3;
    const parts: T.BufferGeometry[] = [];
    const minX = Math.floor(Math.min(...region.outline.map(point => point.x)) / cell) * cell;
    const maxX = Math.max(...region.outline.map(point => point.x));
    const minZ = Math.floor(Math.min(...region.outline.map(point => point.z)) / cell) * cell;
    const maxZ = Math.max(...region.outline.map(point => point.z));
    for (let x = minX; x < maxX; x += cell) {
        for (let z = minZ; z < maxZ; z += cell) {
            const square: clipping.Polygon = [[[x, z], [x + cell, z], [x + cell, z + cell], [x, z + cell]]];
            for (const [outline, ...holes] of clipping.intersection(polygon, square)) {
                const rings = [outline!, ...holes].map(ring => ring.slice(0, -1).map(([x, z]) => new T.Vector2(x, z)));
                const vertices = rings.flat();
                const faces = T.ShapeUtils.triangulateShape(rings[0]!, rings.slice(1));
                if (!faces.length) {
                    continue;
                }
                const heights = vertices.map(vertex => parkTerrainElevation(park, { x: vertex.x, z: vertex.y }) + offset);
                const positions = faces.flatMap(([a, b, c]) => [c!, b!, a!].flatMap(index => [
                    vertices[index]!.x, heights[index]!, vertices[index]!.y
                ]));
                const geometry = new T.BufferGeometry();
                geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
                parts.push(geometry);
            }
        }
    }
    const geometry = mergeGeometries(parts) ?? new T.BufferGeometry();
    geometry.computeVertexNormals();
    return geometry;
}

/** Draw the planted slopes and depressed waterside in the park's single ground exploration group. */
export function buildParkLandscape(park: PublicPark): T.Group {
    const group = new T.Group();
    group.name = park.id;
    const surface = (name: string, geometry: T.BufferGeometry, material: T.Material) => {
        const mesh = new T.Mesh(geometry, material);
        mesh.name = name;
        mesh.receiveShadow = true;
        group.add(mesh);
    };
    const pondY = park.landform.pondY;
    surface('park-ground', terrainGeometry(park, { outline: park.outline, holes: [park.pond.outline] }, 0), ground);
    surface('pond', buildFloorGeometry(park.pond.outline, [], .12, pondY - .12), water);
    park.lawns.forEach(region => surface('lawn', terrainGeometry(park, { ...region, holes: [park.pond.outline] }, .06), lawn));
    park.paths.forEach(region => surface('park-path', terrainGeometry(park, region, .10), pavement));
    const { from, to, drop } = park.waterfall;
    const width = Math.hypot(to.x - from.x, to.z - from.z);
    const angle = Math.atan2(to.z - from.z, to.x - from.x);
    const falls = new T.Group();
    falls.name = 'waterfall';
    falls.position.set((from.x + to.x) / 2, pondY, (from.z + to.z) / 2);
    falls.rotation.y = -angle;
    const ledge = new T.Mesh(new T.BoxGeometry(width + .4, drop, .85), stone);
    ledge.position.y = drop / 2;
    const curtain = new T.Mesh(new T.BoxGeometry(width, drop, .17), cascade);
    curtain.position.set(0, drop / 2 + .05, -.46);
    falls.add(ledge, curtain);
    group.add(falls);
    addParkTrees(group, park);
    return group;
}
