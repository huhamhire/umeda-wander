import * as T from 'three';
import { equipmentBaseLift } from '../../../application/connections/connection-lanes.ts';
import { viewLayerRole } from '../../../application/exploration/view-layer.ts';
import type { Level, LevelId, StairSpiral, VerticalConnection } from '../../../domain/map/model.ts';

const treadMaterial = new T.MeshStandardMaterial({ color: 0xb49670, roughness: .85 });
const metalMaterial = new T.MeshStandardMaterial({ color: 0x7e6553, roughness: .68 });
const roofMaterial = new T.MeshStandardMaterial({ color: 0xac8b70, roughness: .81, side: T.DoubleSide });
const unitBox = new T.BoxGeometry(1, 1, 1);
const up = new T.Vector3(0, 1, 0);

/** Sample the authored curve in the local horizontal plane. */
function spiralPoint(spiral: StairSpiral, radius: number, t: number, y: number): T.Vector3 {
    const angle = spiral.startRad + t * spiral.sweepRad;
    return new T.Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle));
}

/** Build a sloping canopy in the upper floor frame so cutaway and ground switches apply. */
export function buildSpiralCanopy(spiral: StairSpiral, rise: number): T.Group {
    const group = new T.Group();
    const canopy = spiral.canopy!;
    const positions: number[] = [];
    const segments = 48;
    for (let index = 0; index <= segments; index++) {
        const t = index / segments;
        const y = equipmentBaseLift + canopy.clearance - rise * (1 - t);
        for (const radius of [.6, spiral.radius + 1.55]) {
            positions.push(...spiralPoint(spiral, radius, t, y).toArray());
        }
    }
    const indices: number[] = [];
    for (let index = 0; index < segments; index++) {
        const a = index * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const roof = new T.Mesh(geometry, roofMaterial);
    roof.castShadow = true;
    roof.receiveShadow = true;
    roof.userData.labelOccluder = true;
    const mast = new T.Mesh(new T.CylinderGeometry(canopy.mastRadius, canopy.mastRadius, canopy.clearance, 20), metalMaterial);
    mast.position.y = equipmentBaseLift + canopy.clearance / 2;
    group.position.set(spiral.center.x, 0, spiral.center.z);
    group.add(roof, mast);
    return group;
}

/** Render a curved flight independently of the straight stairs and keep its points on the moving slabs. */
export class SpiralStairModel {
    readonly group = new T.Group();
    readonly connection: VerticalConnection;
    private readonly treads: T.InstancedMesh;
    private readonly rails: T.InstancedMesh;
    private readonly mast?: T.Mesh;
    private readonly spiral: StairSpiral;
    private readonly width: number;
    private readonly count: number;
    private readonly levels: Level[];
    private readonly marker = new T.Object3D();
    private previousRise?: number;

    /** Allocate tread and railing instances once for the nominal flight. */
    constructor(connection: VerticalConnection, levels: Level[]) {
        this.connection = connection;
        this.levels = levels;
        this.spiral = connection.spiral!;
        this.width = connection.width ?? 2.8;
        const rise = levels.find(level => level.id === connection.to.level)!.y -
            levels.find(level => level.id === connection.from.level)!.y;
        this.count = Math.ceil(Math.max(rise / .22, Math.abs(this.spiral.sweepRad) * this.spiral.radius / .85));
        this.treads = new T.InstancedMesh(unitBox, treadMaterial, this.count);
        this.rails = new T.InstancedMesh(unitBox, metalMaterial, this.count * 3);
        for (const mesh of [this.treads, this.rails]) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = false;
            mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
        }
        this.group.name = 'stairs-' + connection.id;
        this.treads.name = 'spiral-treads';
        this.rails.name = 'spiral-railings';
        this.group.add(this.treads, this.rails);
        if (this.spiral.canopy) {
            const radius = this.spiral.canopy.mastRadius;
            this.mast = new T.Mesh(new T.CylinderGeometry(radius, radius, 1, 20), metalMaterial);
            this.group.add(this.mast);
        }
    }

    /** Keep the whole flight visible when its lower landing is visible, and move both ends with the floor groups. */
    update(elevation: (id: LevelId) => number, focus: LevelId | 'all'): void {
        const { from, to } = this.connection;
        this.group.visible = viewLayerRole(this.levels, { level: focus }, from.level) !== 'hidden';
        const low = elevation(from.level) + (from.elevationOffset ?? 0);
        const rise = elevation(to.level) + (to.elevationOffset ?? 0) - low;
        this.group.position.set(this.spiral.center.x, low + equipmentBaseLift, this.spiral.center.z);
        if (rise === this.previousRise) {
            return;
        }
        this.previousRise = rise;
        if (this.mast) {
            this.mast.scale.y = rise;
            this.mast.position.y = rise / 2;
        }
        const angleStep = this.spiral.sweepRad / this.count;
        for (let index = 0; index < this.count; index++) {
            const t = (index + .5) / this.count;
            this.marker.position.copy(spiralPoint(this.spiral, this.spiral.radius, t, rise * t));
            this.marker.rotation.set(0, -(this.spiral.startRad + t * this.spiral.sweepRad), 0);
            const treadLength = Math.abs(angleStep) * (this.spiral.radius + this.width / 2);
            this.marker.scale.set(this.width, .19, treadLength * 1.06);
            this.marker.updateMatrix();
            this.treads.setMatrixAt(index, this.marker.matrix);
            const start = index / this.count;
            const end = (index + 1) / this.count;
            for (const side of [-1, 1]) {
                const radius = this.spiral.radius + side * (this.width / 2 - .07);
                this.rail(
                    index * 3 + (side === -1 ? 0 : 1),
                    spiralPoint(this.spiral, radius, start, rise * start + 1.06),
                    spiralPoint(this.spiral, radius, end, rise * end + 1.06)
                );
            }
            const radius = this.spiral.radius + this.width / 2 - .07;
            this.rail(index * 3 + 2, spiralPoint(this.spiral, radius, t, rise * t), spiralPoint(this.spiral, radius, t, rise * t + 1.06));
        }
        this.treads.instanceMatrix.needsUpdate = true;
        this.rails.instanceMatrix.needsUpdate = true;
    }

    /** Span a railing instance between two points, including the changing vertical rise. */
    private rail(index: number, from: T.Vector3, to: T.Vector3): void {
        this.marker.position.copy(from).lerp(to, .5);
        const direction = to.sub(from);
        this.marker.scale.set(.065, direction.length(), .065);
        this.marker.quaternion.setFromUnitVectors(up, direction.normalize());
        this.marker.updateMatrix();
        this.rails.setMatrixAt(index, this.marker.matrix);
    }
}
