import * as T from 'three';
import type { Level, LevelId, Platform, VerticalConnection } from '../../../domain/map/model.ts';
import { elevatorShaftWidth, elevatorWellHalfWidth } from '../../../application/connections/connection-openings.ts';
import { connectionHeading } from '../../../application/connections/connection-orientation.ts';
import { connectionLanes, escalatorTreadWidth } from '../../../application/connections/connection-lanes.ts';
import { viewLayerRole } from '../../../application/exploration/view-layer.ts';

const unitBox = new T.BoxGeometry(1, 1, 1);
const materials = new Map<number, T.MeshStandardMaterial>();
const instanceTransform = new T.Matrix4();
/**
 * Reuse procedural materials for equal colours instead of allocating one per component.
 */
function material(color: number): T.MeshStandardMaterial {
    let result = materials.get(color);
    if (!result) {
        result = new T.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.15 });
        materials.set(color, result);
    }
    return result;
}

/**
 * Create a named box component, set its transform and shadows, then add it to the parent group.
 */
function box(
    group: T.Group,
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number
): T.Mesh {
    const mesh = new T.Mesh(unitBox, material(color));
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
}

/**
 * Create an updatable instanced box group for repeated steps and edge details.
 */
function instances(group: T.Group, name: string, count: number, color: number): T.InstancedMesh {
    const mesh = new T.InstancedMesh(unitBox, material(color), count);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    mesh.frustumCulled = false;
    group.add(mesh);
    return mesh;
}

/**
 * Write one instance’s scale and position without modifying shared unit geometry.
 */
function place(
    mesh: T.InstancedMesh,
    index: number,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number
): void {
    instanceTransform.makeScale(w, h, d);
    instanceTransform.setPosition(x, y, z);
    mesh.setMatrixAt(index, instanceTransform);
}

/** Procedural facility model. Coordinates are local to the lower landing. */
export class VerticalConnectionModel {
    readonly connection: VerticalConnection;
    readonly group = new T.Group();
    private body = new T.Group();
    private lowLanding = new T.Group();
    private highLanding = new T.Group();
    private low: VerticalConnection['from'];
    private high: VerticalConnection['to'];
    private run: number;
    private heading: number;
    private steps?: T.InstancedMesh;
    private risers?: T.InstancedMesh;
    private stripes?: T.InstancedMesh;
    private grooves?: T.InstancedMesh;
    private middleLanding?: T.Mesh;
    private belts: T.Mesh[] = [];
    private endCaps: T.Mesh[] = [];
    private sidePanels?: T.Mesh;
    private underframe: T.Mesh[] = [];
    private shaft?: T.Mesh;
    private shaftPosts: T.Mesh[] = [];
    private shaftCaps: T.Group[] = [];
    private cabin = new T.Group();
    private readonly count: number;
    private readonly treadWidth: number;
    private lanes: VerticalConnectionModel[] = [];
    private previousLowY?: number;
    private previousHighY?: number;
    private previousFocus?: LevelId | 'all';
    private previousForceVisible?: boolean;
    private readonly levels: Level[];
    /**
     * Build equipment from both landings in its platform frame, expanding escalator banks into complete child models.
     */
    constructor(connection: VerticalConnection, levels: Level[], platforms: Platform[]) {
        this.connection = connection;
        this.levels = levels;
        const fromY = levels.find(l => l.id === connection.from.level)!.y + (connection.from.elevationOffset ?? 0);
        const toY = levels.find(l => l.id === connection.to.level)!.y + (connection.to.elevationOffset ?? 0);
        this.count = connection.kind === 'stairs' ? Math.max(4, Math.ceil(Math.abs(toY - fromY) / 0.24)) : 28;
        this.treadWidth = connection.width ? connection.width - 0.6 : connection.kind === 'escalator' ? escalatorTreadWidth : 2.15;
        [this.low, this.high] = fromY < toY ? [connection.from, connection.to] : [connection.to, connection.from];
        this.run = Math.hypot(this.high.x - this.low.x, this.high.z - this.low.z);
        this.heading = connectionHeading(connection, platforms, fromY, toY);
        this.group.name = `${connection.kind}-${connection.id}`;
        this.body.name = 'connection-body';
        this.lowLanding.name = 'lower-landing';
        this.highLanding.name = 'upper-landing';
        this.group.add(this.body, this.lowLanding, this.highLanding);
        const lanes = connectionLanes(connection);
        if (lanes.length > 1) {
            this.lanes = lanes.map(lane => new VerticalConnectionModel(lane, levels, platforms));
            this.group.clear();
            for (const lane of this.lanes) {
                this.group.add(lane.group);
            }
            return;
        }
        if (connection.kind === 'elevator') {
            this.buildElevator();
        }
        else {
            this.buildStairway();
        }
    }
    /**
     * Build landing details, distinguishing elevator thresholds from escalator comb plates.
     */
    private landing(group: T.Group, elevator = false): void {
        if (elevator) {
            const w = elevatorShaftWidth;
            const sillBack = w / 2 - 0.08;
            const sillFront = elevatorWellHalfWidth + 0.06;
            // Keep the threshold just above the nominal floor to avoid coplanar faces.
            box(group, 'landing-sill', 0, -0.14, (sillBack + sillFront) / 2, w * 0.8, 0.1, sillFront - sillBack, 0xbcc8bb);
            for (const x of [-w * 0.3875, w * 0.3875]) {
                box(group, 'landing-door-frame', x, 1.25, w / 2 + 0.05, 0.16, 2.5, 0.2, 0x557f7a);
            }
            box(group, 'landing-door-lintel', 0, 2.5, w / 2 + 0.05, w * 0.8125, 0.18, 0.2, 0x557f7a);
            for (const x of [-w * 0.175, w * 0.175]) {
                box(group, 'landing-split-door', x, 1.2, w / 2 + 0.05, w * 0.34, 2.3, 0.08, 0xb8c7bd);
            }
            box(group, 'landing-direction-light', 0, 2.78, w / 2 + 0.05, w * 0.2, 0.23, 0.15, 0x6ca594);
        }
        else {
            box(group, 'comb-plate', 0, 0, 0, 1.65, 0.16, this.treadWidth + 0.4, 0xc0cbc1);
            if (this.connection.kind === 'escalator') {
                for (let i = 0; i < 7; i++) {
                    box(group, 'comb-teeth', 0, 0.1, (i / 6 - 0.5) * this.treadWidth, 1.35, 0.035, 0.06, 0xd5bd71);
                }
            }
        }
    }
    /**
     * Build full treads, handrails and underframes, adding glass or intermediate landings for the equipment type.
     */
    private buildStairway(): void {
        const escalator = this.connection.kind === 'escalator';
        this.steps = instances(this.body, 'tread-surfaces', this.count, escalator ? 0x5a706b : 0xaeb9a4);
        this.risers = instances(this.body, 'step-risers', this.count, escalator ? 0x82958a : 0x99a98d);
        this.stripes = instances(this.body, 'tread-edge-stripes', this.count, escalator ? 0xddc579 : 0xd5dcc9);
        if (escalator) {
            this.grooves = instances(this.body, 'tread-grooves', this.count * 6, 0x98a99d);
        }
        for (const side of [-1, 1]) {
            for (const offset of escalator ? [0.48, 1.28] : [1.1]) {
                for (const section of !escalator && this.connection.stairLandingLength ? [0, 1, 2] : [-1]) {
                    const belt = new T.Mesh(unitBox, material(escalator ? 0x344d48 : 0x63816b));
                    belt.name = 'continuous-handrail';
                    belt.userData.side = side;
                    belt.userData.height = offset;
                    belt.userData.section = section;
                    this.body.add(belt);
                    this.belts.push(belt);
                }
            }
            for (const section of !escalator && this.connection.stairLandingLength ? [0, 1, 2] : [-1]) {
                const support = new T.Mesh(unitBox, material(0x889a90));
                support.userData.side = side;
                support.userData.section = section;
                support.name = 'escalator-underframe';
                this.body.add(support);
                this.underframe.push(support);
            }
            if (escalator) {
                for (const end of [0, 1]) {
                    const cap = new T.Mesh(new T.TorusGeometry(0.4, 0.09, 6, 12, Math.PI), material(0x344d48));
                    cap.rotation.z = end ? -Math.PI / 2 : Math.PI / 2;
                    cap.userData.end = end;
                    cap.userData.side = side;
                    cap.name = 'rounded-handrail-return';
                    this.body.add(cap);
                    this.endCaps.push(cap);
                }
            }
        }
        if (escalator) {
            const geometry = new T.BufferGeometry();
            geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(36), 3));
            const glass = new T.MeshStandardMaterial({
                color: 0x96bdb8,
                transparent: true,
                opacity: 0.36,
                depthWrite: false,
                side: T.DoubleSide,
                roughness: 0.4
            });
            this.sidePanels = new T.Mesh(geometry, glass);
            this.sidePanels.name = 'escalator-glass-balustrades';
            this.sidePanels.renderOrder = 1;
            this.body.add(this.sidePanels);
        }
        this.landing(this.lowLanding);
        this.landing(this.highLanding);
        if (!escalator && this.connection.stairLandingLength) {
            this.middleLanding = box(this.body, 'intermediate-stair-landing', 0, 0, 0, 1, 0.18, this.treadWidth + 0.2, 0xb8c1af);
        }
    }
    /**
     * Build the transparent shaft, posts, doors and cabin using the shared shaft width.
     */
    private buildElevator(): void {
        const glass = new T.MeshStandardMaterial({
            color: 0x93bdb8,
            transparent: true,
            opacity: 0.16,
            depthWrite: false,
            roughness: 0.3,
            side: T.DoubleSide
        });
        this.shaft = new T.Mesh(unitBox, glass);
        this.shaft.name = 'transparent-elevator-shaft';
        this.shaft.renderOrder = 2;
        this.body.add(this.shaft);
        const half = elevatorShaftWidth / 2;
        for (const x of [-half, half]) {
            for (const z of [-half, half]) {
                this.shaftPosts.push(box(this.body, 'shaft-corner-post', x, 0, z, 0.12, 1, 0.12, 0x668b81));
            }
        }
        for (let i = 0; i < 2; i++) {
            const ring = new T.Group();
            for (const side of [-half, half]) {
                box(ring, 'shaft-ring', side, 0, 0, 0.15, 0.18, elevatorShaftWidth, 0x718f82);
                box(ring, 'shaft-ring', 0, 0, side, elevatorShaftWidth, 0.18, 0.15, 0x718f82);
            }
            this.body.add(ring);
            this.shaftCaps.push(ring);
        }
        this.cabin.name = 'elevator-cabin';
        this.body.add(this.cabin);
        // Cabin details use a four-unit reference plan; shrink X/Z, retain door height.
        this.cabin.scale.set(elevatorShaftWidth / 4, 1, elevatorShaftWidth / 4);
        box(this.cabin, 'cabin-floor', 0, 0, 0, 2.9, 0.18, 2.9, 0x476b63);
        box(this.cabin, 'cabin-ceiling', 0, 2.45, 0, 2.9, 0.14, 2.9, 0xe2e4ce);
        for (const x of [-1.38, 1.38]) {
            box(this.cabin, 'cabin-side', x, 1.2, 0, 0.09, 2.35, 2.7, 0xa2b9a8);
        }
        box(this.cabin, 'cabin-rear-wall', 0, 1.2, -1.38, 2.7, 2.35, 0.08, 0xb8c6b3);
        for (const x of [-0.65, 0.65]) {
            box(this.cabin, 'cabin-door', x, 1.18, 1.4, 1.25, 2.25, 0.06, 0xd4dccb);
        }
        box(this.cabin, 'cabin-door-seam', 0, 1.2, 1.45, 0.04, 2.3, 0.04, 0x5c8072);
        this.landing(this.lowLanding, true);
        this.landing(this.highLanding, true);
        if (this.connection.lowerDoorFacingRad !== undefined) {
            this.lowLanding.rotation.y = this.heading + Math.PI / 2 - this.connection.lowerDoorFacingRad;
        }
        else if (this.connection.reverseLowerDoor) {
            this.lowLanding.rotation.y = Math.PI;
        }
    }
    /**
     * Update full equipment across expanded floors, retaining visible elevator shafts and both landings.
     */
    update(elevation: (id: LevelId) => number, focus: LevelId | 'all', forceVisible = false, preview = false): void {
        if (this.lanes.length) {
            for (const lane of this.lanes) {
                lane.update(elevation, focus, forceVisible, preview);
            }
            this.group.visible = this.lanes.some(lane => lane.group.visible);
            return;
        }
        const lowY = elevation(this.low.level) + (this.low.elevationOffset ?? 0) + 0.65;
        const highY = elevation(this.high.level) + (this.high.elevationOffset ?? 0) + 0.65;
        const rise = highY - lowY;
        const previousRise = (this.previousHighY ?? 0) - (this.previousLowY ?? 0);
        this.group.position.y = lowY;
        // A vertical stretch keeps both landings attached without rebuilding tread instances during slider input.
        if (preview && this.connection.kind !== 'elevator' && previousRise > .01) {
            this.group.scale.y = rise / previousRise;
            return;
        }
        this.group.scale.y = 1;
        if (lowY === this.previousLowY && highY === this.previousHighY && focus === this.previousFocus && forceVisible === this.previousForceVisible) {
            return;
        }
        this.previousForceVisible = forceVisible;
        this.previousLowY = lowY;
        this.previousHighY = highY;
        this.previousFocus = focus;
        this.group.position.set(this.low.x, lowY, this.low.z);
        this.group.rotation.y = -this.heading;
        const showAll = focus === 'all';
        // Local steps belong to their exploration floor, even above its base elevation.
        const lowVisible = viewLayerRole(this.levels, { level: focus }, this.low.level) !== 'hidden';
        const highVisible = viewLayerRole(this.levels, { level: focus }, this.high.level) !== 'hidden';
        this.lowLanding.visible = lowVisible;
        this.highLanding.visible = highVisible;
        this.lowLanding.position.set(this.connection.kind === 'elevator' ? 0 : -0.75, 0, 0);
        this.highLanding.position.set(this.connection.kind === 'elevator' ? 0 : this.run + 0.75, rise, 0);
        this.body.visible = lowVisible;
        this.group.visible = showAll || this.lowLanding.visible || this.highLanding.visible;
        if (this.connection.kind === 'elevator') {
            const visible = forceVisible || lowVisible || highVisible;
            this.group.visible = visible;
            this.body.visible = visible;
            this.lowLanding.visible = visible;
            this.highLanding.visible = visible;
            const bottom = -0.4;
            const top = rise + 3.1;
            this.shaft!.position.set(0, (bottom + top) / 2, 0);
            this.shaft!.scale.set(elevatorShaftWidth, top - bottom, elevatorShaftWidth);
            this.shaftPosts.forEach(post => {
                post.position.y = (bottom + top) / 2;
                post.scale.y = top - bottom;
            });
            this.shaftCaps[0]!.position.y = bottom;
            this.shaftCaps[1]!.position.y = top;
            this.cabin.visible = true;
            this.cabin.position.y = Math.min(rise * 0.45, Math.max(0, top - 2.8));
        }
        else {
            const first = 0;
            const last = 1;
            this.highLanding.visible = this.body.visible;
            this.lowLanding.visible = this.body.visible;
            const gap = this.connection.kind === 'stairs' ? Math.min(this.connection.stairLandingLength ?? 0, this.run * 0.3) : 0;
            const split = Math.floor(this.count / 2);
            const pitch = (this.run - gap) / this.count;
            const stepRise = rise / this.count;
            if (this.middleLanding) {
                this.middleLanding.position.set(split * pitch + gap / 2, split * stepRise, 0);
                this.middleLanding.scale.x = gap;
            }
            this.steps!.count = this.count;
            this.risers!.count = this.count;
            this.stripes!.count = this.count;
            if (this.grooves) {
                this.grooves.count = this.count * 6;
            }
            for (let i = 0; i < this.count; i++) {
                const x = (i + 0.5) * pitch + (i >= split ? gap : 0);
                const y = (i + 0.5) * stepRise;
                place(this.steps!, i, x, y, 0, pitch * 1.01, 0.16, this.treadWidth);
                place(this.risers!, i, x - pitch / 2, y - stepRise / 2, 0, 0.08, stepRise + 0.04, this.treadWidth);
                place(this.stripes!, i, x - pitch * 0.42, y + 0.095, 0, 0.065, 0.025, this.treadWidth - 0.02);
                if (this.grooves) {
                    for (let j = 0; j < 6; j++) {
                        place(
                            this.grooves,
                            i * 6 + j,
                            x,
                            y + 0.095,
                            -this.treadWidth * 0.4 + j * this.treadWidth * 0.16,
                            pitch * 0.7,
                            0.02,
                            0.035
                        );
                    }
                }
            }
            for (const mesh of [this.steps, this.risers, this.stripes, this.grooves]) {
                if (mesh) {
                    mesh.instanceMatrix.needsUpdate = true;
                }
            }
            const beam = (mesh: T.Mesh, offset: number, side: number, width: number, height: number) => {
                const across = this.treadWidth / 2 + 0.35;
                const section = mesh.userData.section ?? -1;
                const xs = [0, split * pitch, split * pitch + gap, this.run];
                const ys = [0, split * stepRise, split * stepRise, rise];
                const a = new T.Vector3(
                    section < 0 ? this.run * first : xs[section]!,
                    (section < 0 ? rise * first : ys[section]!) + offset,
                    side * across
                );
                const b = new T.Vector3(
                    section < 0 ? this.run * last : xs[section + 1]!,
                    (section < 0 ? rise * last : ys[section + 1]!) + offset,
                    side * across
                );
                mesh.position.copy(a).lerp(b, 0.5);
                mesh.scale.set(a.distanceTo(b), height, width);
                mesh.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
            };
            this.belts.forEach(mesh => beam(mesh, mesh.userData.height, mesh.userData.side, 0.16, 0.15));
            this.underframe.forEach(mesh => beam(mesh, -0.28, mesh.userData.side, 0.18, 0.3));
            this.endCaps.forEach(mesh => {
                mesh.visible = mesh.userData.end ? last >= 1 : first <= 0;
                mesh.position.set(
                    mesh.userData.end ? this.run : 0,
                    (mesh.userData.end ? rise : 0) + 0.88,
                    mesh.userData.side * (this.treadWidth / 2 + 0.35)
                );
            });
            if (this.sidePanels) {
                const points: number[] = [];
                for (const side of [-1, 1]) {
                    const z = side * (this.treadWidth / 2 + 0.32);
                    const x0 = this.run * first;
                    const x1 = this.run * last;
                    const y0 = rise * first;
                    const y1 = rise * last;
                    points.push(
                        x0,
                        y0 + 0.35,
                        z,
                        x1,
                        y1 + 0.35,
                        z,
                        x1,
                        y1 + 1.2,
                        z,
                        x0,
                        y0 + 0.35,
                        z,
                        x1,
                        y1 + 1.2,
                        z,
                        x0,
                        y0 + 1.2,
                        z
                    );
                }
                const attribute = this.sidePanels.geometry.getAttribute('position') as T.BufferAttribute;
                attribute.array.set(points);
                attribute.needsUpdate = true;
                this.sidePanels.geometry.computeVertexNormals();
                this.sidePanels.geometry.computeBoundingSphere();
            }
        }
        this.group.updateMatrixWorld(true);
    }
}
