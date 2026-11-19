import { messageText } from '../../infrastructure/i18n/index.ts';
import { showAreaLabel } from '../../application/exploration/area-label-policy.ts';
import * as T from 'three';
import type { Facility, Level, LevelId, StationLayout, FloorOpening, StationId } from '../../domain/map/model.ts';
import { platformPoint, platformOutline, platformTangent, pointInPolygon } from '../../domain/map/geometry.ts';
import { planFloorOpenings } from '../../application/connections/connection-openings.ts';
import { planGateBoundaries } from '../../application/connections/gate-boundaries.ts';
import type { GateBoundary } from '../../application/connections/gate-boundaries.ts';
import { buildFloorGeometry } from './floor-geometry.ts';
import { VerticalConnectionModel } from './stations/vertical-connection-model.ts';
import { setRegionOwner } from '../appearance/layer-appearance.ts';
import { geographicRoofHeightAt, geographicRoofPlan, geographicRoofPoint } from './stations/roof-profile.ts';
import { stationPalettes } from '../appearance/station-palette.ts';
import { buildRailApproachModel } from './stations/rail-approach-model.ts';
import { platformRail } from '../../domain/map/rail-geometry.ts';
import { planAtriumOpenings } from '../../application/connections/atrium-openings.ts';
import { buildAtriumRailing } from './public-areas/atrium-model.ts';
import { buildCommercialConcourse } from './buildings/commercial-concourse-model.ts';
import { buildFloorLabel } from '../labels/floor-label.ts';
import { buildPublicDeckRailing } from './public-areas/public-deck-model.ts';
import { areaColor } from '../appearance/area-palette.ts';
import { ModelPrimitives } from './model-primitives.ts';
import { colors } from '../appearance/scene-palette.ts';
import { buildWalkwayCanopy } from './public-areas/walkway-canopy-model.ts';
import type { SceneLabelDefinition } from '../labels/scene-labels.ts';

export interface MapModelOptions {
    scene: T.Scene;
    levels: Level[];
    facilities: Facility[];
    layout: StationLayout;
    maxAnisotropy: number;
}

/** Construct map geometry once; expose owned groups for exploration updates and offline inspection. */
export class MapModels {
    readonly roof = new T.Group();
    readonly groups = new Map<LevelId, T.Group>();
    readonly geographicBuildingFloors: T.Group[] = [];
    readonly connectors: VerticalConnectionModel[] = [];
    readonly canopies: T.Group[] = [];
    readonly pickables: T.Object3D[] = [];
    readonly labels: SceneLabelDefinition[] = [];
    readonly openings: FloorOpening[];
    private readonly gateBoundaries: GateBoundary[];
    private readonly scene: T.Scene;
    private readonly levels: Level[];
    private readonly facilities: Facility[];
    private readonly layout: StationLayout;
    private readonly maxAnisotropy: number;
    private readonly primitives = new ModelPrimitives();

    /** Build the same station groups for H5 and CPU-only review, without constructing a renderer. */
    constructor(options: MapModelOptions) {
        this.scene = options.scene;
        this.levels = options.levels;
        this.facilities = options.facilities;
        this.layout = options.layout;
        this.maxAnisotropy = options.maxAnisotropy;
        this.openings = [
            ...planFloorOpenings(this.layout.connections, this.levels, this.layout.platforms),
            ...planAtriumOpenings(this.layout.atria ?? [])
        ];
        this.gateBoundaries = planGateBoundaries(this.facilities, this.layout.areas);
        this.buildStation();
    }

    /** Store label anchors independently of DOM creation and screen placement. */
    private label(
        text: string,
        x: number,
        y: number,
        z: number,
        level?: LevelId,
        roof = false,
        emphasis = false,
        owner?: StationId | null,
        surface?: T.Object3D
    ): void {
        this.labels.push({ text, position: new T.Vector3(x, y, z), level, roof, emphasis, owner, surface });
    }

    /**
     * Assemble slabs, platforms, public areas, equipment and labels with independent level and region ownership.
     */
    private buildStation(): void {
        for (const level of this.levels) {
            const group = setRegionOwner(new T.Group(), level.station ?? 'jr-osaka');
            this.groups.set(level.id, group);
            this.scene.add(group);
        }
        for (const hall of this.layout.concourses ?? []) {
            const model = setRegionOwner(buildCommercialConcourse(hall, this.layout.concourses), null);
            this.groups.get(hall.level)!.add(model);
            this.geographicBuildingFloors.push(model);
        }
        for (const passage of this.layout.passages ?? []) {
            if (passage.kind === 'underground' || (passage.kind === 'deck' && !passage.label)) {
                continue;
            }
            const boundary = passage.points.find(p => p.boundaryName);
            const point = boundary ?? passage.points[Math.floor(passage.points.length / 2)]!;
            this.label(
                boundary?.boundaryName ?? passage.name,
                point.x,
                3 + (point.elevationOffset ?? 0),
                point.z,
                point.level,
                false,
                !!boundary,
                null
            );
        }
        const screenGlass = new T.MeshStandardMaterial({
            color: 0x9dc5cc,
            transparent: true,
            opacity: 0.38,
            depthWrite: false,
            roughness: 0.3
        });
        for (const area of this.layout.areas) {
            const buildingContext = area.id.startsWith('deck-context-') || area.blockId === 'building:hankyu-concourse';
            const floorGroup = buildingContext ? new T.Group() : this.groups.get(area.level)!;
            if (buildingContext) {
                this.groups.get(area.level)!.add(floorGroup);
                this.geographicBuildingFloors.push(floorGroup);
            }
            const cuts = [
                ...area.holes ?? [],
                ...this.openings.filter(opening => opening.level === area.level).map(opening => opening.outline)
            ];
            const geometry = buildFloorGeometry(area.outline, cuts, area.height ?? 0.55, area.elevationOffset ?? 0);
            if (!geometry.getAttribute('position')) {
                continue;
            }
            const palette = stationPalettes[this.levels.find(l => l.id === area.level)?.station ?? 'jr-osaka'];
            const mesh = new T.Mesh(
                geometry,
                this.primitives.material(area.kind === 'paid' ? palette.paid : areaColor(area, this.levels.find(l => l.id === area.level)!.y < 0))
            );
            mesh.userData.labelOccluder = true;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const owner = area.blockId || area.kind === 'commercial' || area.evidence.source === 'district' ? null : this.levels.find(l => l.id === area.level)!.station ?? 'jr-osaka';
            setRegionOwner(mesh, owner);
            floorGroup.add(mesh);
            if (area.railings) {
                this.groups.get(area.level)!.add(setRegionOwner(buildPublicDeckRailing(area, this.layout, this.levels), null));
            }
            if (showAreaLabel(area, this.levels.find(level => level.id === area.level)!.y)) {
                if (area.labelStyle === 'floor') {
                    if (typeof document !== 'undefined') {
                        floorGroup.add(setRegionOwner(
                            buildFloorLabel(
                                area,
                                area.labelAngleRad ?? Math.PI / 2 - 58.35 * Math.PI / 180,
                                this.maxAnisotropy
                            ),
                            owner
                        ));
                    }
                    continue;
                }
                const x = area.outline.reduce((sum, point) => sum + point.x, 0) / area.outline.length;
                const z = area.outline.reduce((sum, point) => sum + point.z, 0) / area.outline.length;
                this.label(
                    area.name,
                    x,
                    (area.height ?? 0.55) + (area.elevationOffset ?? 0) + 1,
                    z,
                    area.level,
                    false,
                    area.id === 'central-public' || area.id === 'bridge-public' || area.id === 'central-mezz' || area.id === 'south-central-raised',
                    owner,
                    buildingContext ? floorGroup : undefined
                );
            }
        }
        for (const platform of this.layout.platforms) {
            const { x, z, length, width, tracks, level } = platform;
            const platformGroup = this.groups.get(level)!;
            const position = (along: number, across: number) => platformPoint(platform, along, across);
            const block = (along: number, y: number, across: number, w: number, h: number, d: number, color: number) => {
                if (platform.planBow && w > 4) {
                    const count = Math.ceil(w / 3);
                    let result!: T.Mesh;
                    for (let i = 0; i < count; i++) {
                        const u = along - w / 2 + w * (i + .5) / count;
                        const p = position(u, across);
                        result = this.primitives.box(platformGroup, p.x, y, p.z, w / count + .02, h, d, color);
                        result.rotation.y = -platformTangent(platform, u);
                    }
                    return result;
                }
                const p = position(along, across);
                const mesh = this.primitives.box(platformGroup, p.x, y, p.z, w, h, d, color);
                mesh.rotation.y = -platformTangent(platform, along);
                return mesh;
            };
            const outline = platformOutline(platform);
            const slab = new T.Mesh(
                buildFloorGeometry(
                    outline,
                    this.openings.filter(opening => opening.level === level).map(opening => opening.outline),
                    0.95,
                    -0.475
                ),
                this.primitives.material(level === 'underground-platform' ? 0x90b6c5 : stationPalettes[this.levels.find(l => l.id === level)?.station ?? 'jr-osaka'].platform)
            );
            slab.name = `platform-slab-${platform.id}`;
            slab.castShadow = true;
            slab.receiveShadow = true;
            platformGroup.add(slab);
            slab.userData.labelOccluder = true;
            for (const [index, number] of tracks.entries()) {
                const { side, across, length: railLength, center: railCenter } = platformRail(platform, index);
                block(railCenter, -0.62, across, railLength, 0.3, 2.5, 0xb9bcae);
                for (const offset of [-0.7, 0.7]) {
                    block(railCenter, -0.36, across + offset, railLength, 0.12, 0.12, 0x6d7c77);
                }
                for (let railX = railCenter - railLength / 2; railX <= railCenter + railLength / 2; railX += 2.2) {
                    block(railX, -0.45, across, 0.45, 0.13, 2.2, 0x939c8e);
                }
                if (platform.terminal) {
                    block((platform.terminalEnd === 'end' ? 1 : -1) * (length / 2 - 3), 0.3, across, 0.45, 1.4, 2, 0x855c57);
                }
                if (platform.lineColor) {
                    block(0, 0.58, side * (width / 2 - 0.75), length - 2, 0.06, 0.16, platform.lineColor);
                }
                block(0, 0.53, side * (width / 2 - 0.4), length - 1, 0.08, 0.3, 0xe9d694);
                const label = position(length / 2 - 2, across);
                this.label(messageText('facilities.labels.trackNumber', { number: number }), label.x, 1, label.z, level);
                if (level === 'underground-platform' || platform.screenDoors === 'full-height') {
                    // Full-height underground screen doors: overhead frame, glazing and sliding leaves.
                    block(0, 3.55, side * (width / 2 - 0.2), length - 1, 0.25, 0.3, 0x648e9b);
                    for (let px = -length / 2 + 2; px < length / 2 - 2; px += 3) {
                        const edge = side * (width / 2 - 0.2);
                        block(px, 2, edge, 0.16, 3.1, 0.25, 0x648e9b);
                        for (const offset of [0.75, 2.15]) {
                            const panel = block(px + offset, 2, edge, 1.32, 2.9, 0.1, 0x9dc5cc);
                            panel.material = screenGlass;
                            panel.castShadow = false;
                            panel.renderOrder = 1;
                            block(px + offset, 1.1, edge, 1.32, 0.08, 0.18, 0x648e9b);
                        }
                        block(px + 1.45, 2, edge, 0.055, 2.9, 0.15, 0x648e9b);
                        block(px + 1.45, 3.3, edge, 0.55, 0.12, 0.2, 0x8cbba7);
                    }
                }
                if (platform.screenDoors === 'half-height') {
                    for (let px = -length / 2 + 2; px < length / 2 - 2; px += 3) {
                        const edge = side * (width / 2 - 0.2);
                        block(px, 1.2, edge, 0.15, 1.4, 0.23, 0x779a9d);
                        const panel = block(px + 1.4, 1.15, edge, 2.6, 1.2, 0.1, 0x9dc5cc);
                        panel.material = screenGlass;
                        panel.castShadow = false;
                        block(px + 1.4, 1.8, edge, 2.6, 0.12, 0.18, 0x779a9d);
                    }
                }
            }
            // Shared alighting strips use the adjacent track edges without drawing
            // another copy of those rails.
            if (!tracks.length && platform.screenDoors === 'half-height') {
                for (const side of platform.screenDoorSides ?? []) {
                    const edge = side * (width / 2 - 0.2);
                    for (let px = -length / 2 + 2; px < length / 2 - 2; px += 3) {
                        block(px, 1.2, edge, 0.15, 1.4, 0.23, 0x779a9d);
                        const panel = block(px + 1.4, 1.15, edge, 2.6, 1.2, 0.1, 0x9dc5cc);
                        panel.material = screenGlass;
                        panel.castShadow = false;
                        block(px + 1.4, 1.8, edge, 2.6, 0.12, 0.18, 0x779a9d);
                    }
                }
            }
            if (level === 'platform') {
                const canopyCuts = planFloorOpenings(
                    this.layout.connections,
                    this.levels,
                    this.layout.platforms,
                    [{ id: level, y: this.levels.find(l => l.id === level)!.y + 3.2 }]
                ).map(o => o.outline);
                for (const canopy of [{ x: -48, length: 18 }, { x: 31, length: 15 }]) {
                    const half = (width - 1.4) / 2;
                    const footprint = [
                        position(canopy.x - canopy.length / 2, -half),
                        position(canopy.x + canopy.length / 2, -half),
                        position(canopy.x + canopy.length / 2, half),
                        position(canopy.x - canopy.length / 2, half)
                    ];
                    const geometry = buildFloorGeometry(footprint, canopyCuts, 0.3, 3.05);
                    if (geometry.getAttribute('position')) {
                        const mesh = new T.Mesh(geometry, this.primitives.material(0xe7e9dc));
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        platformGroup.add(mesh);
                        mesh.userData.labelOccluder = true;
                    }
                    for (const dx of [-5, 5]) {
                        if (!canopyCuts.some(cut => pointInPolygon(position(canopy.x + dx, 0), cut))) {
                            block(canopy.x + dx, 1.8, 0, 0.3, 2.7, 0.3, colors.steel);
                        }
                    }
                }
            }
            block(length / 5, 0.9, 0, 3, 0.65, 0.85, 0x789887);
            block(-6, 3, 0, 5, 0.75, 0.35, 0x416c67);
            const label = position(-length / 2 + 8, 0);
            this.label(
                platform.name ?? (tracks.join(' / ') + messageText('facilities.labels.trackSuffix')),
                label.x,
                3.7,
                label.z,
                level,
                false,
                true
            );
        }
        for (const approach of this.layout.railApproaches ?? []) {
            this.groups.get(approach.level)!.add(buildRailApproachModel(approach));
            if (!approach.id.startsWith('map-rail-') || approach.level === 'platform' || approach.level === 'underground-platform' || approach.level === 'hankyu-platform') {
                this.label(approach.name, approach.labelPoint.x, 2.5, approach.labelPoint.z, approach.level, false, true);
            }
        }
        for (const canopy of this.layout.canopies ?? []) {
            const model = setRegionOwner(buildWalkwayCanopy(canopy), null);
            this.groups.get(canopy.level)!.add(model);
            this.canopies.push(model);
        }
        for (const guide of this.layout.guides ?? []) {
            for (const p of guide.points) {
                if (p.caption) {
                    this.label(p.caption, p.x, 3, p.z, p.level, false, true);
                }
            }
        }
        for (const atrium of this.layout.atria ?? []) {
            for (const opening of atrium.openings) {
                this.groups.get(opening.level)!.add(buildAtriumRailing(atrium, opening.level, this.layout.areas, this.layout.connections));
            }
        }
        // Handrails frame the narrow elevated passages, not imaginary full floor plates.
        for (const id of ['mezzanine', 'bridge'] as const) {
            const group = this.groups.get(id)!;
            const sides = id === 'bridge' ? [-12, 9] : [-50.5, -22];
            for (const x of sides) {
                const inOpening = (z: number) => {
                    if (this.openings.some(opening => opening.level === id && pointInPolygon({ x, z }, opening.outline))) {
                        return true;
                    }
                    const floorAt = (px: number) => this.layout.areas.some(a => a.level === id && pointInPolygon({ x: px, z }, a.outline));
                    // A passage branch is not an outer railing edge.
                    if (!floorAt(x) || (floorAt(x - 0.2) && floorAt(x + 0.2))) {
                        return true;
                    }
                    return this.layout.connections.some(c => [c.from, c.to].some(p => p.level === id && Math.abs(p.x - x) < 3.5 && Math.abs(p.z - z) < 2.4));
                };
                const half = id === 'bridge' ? 37 : 31;
                for (let z = -half; z < half; z += 1) {
                    if (!inOpening(z + 0.5)) {
                        this.primitives.box(group, x, 1.45, z + 0.5, 0.14, 0.12, 1, 0x78968a);
                    }
                }
                for (let z = -30; z <= 30; z += 6) {
                    if (!inOpening(z)) {
                        this.primitives.box(group, x, 0.95, z, 0.12, 0.9, 0.12, 0x9fb3a0);
                    }
                }
            }
        }
        const boundaries = new Map(this.gateBoundaries.map(boundary => [boundary.boundaryId, boundary]));
        for (const boundary of boundaries.values()) {
            this.buildGateFences(boundary);
        }
        for (const facility of this.facilities) {
            if (!facility.id.startsWith('connection-')) {
                this.buildFacility(facility);
            }
        }
        for (const connection of this.layout.connections) {
            const model = new VerticalConnectionModel(connection, this.levels, this.layout.platforms);
            this.connectors.push(model);
            this.scene.add(model.group);
        }
        this.buildRoof();
        this.roof.position.set(geographicRoofPlan.center.x, 0, geographicRoofPlan.center.z);
        this.roof.rotation.y = -geographicRoofPlan.angle;
        this.roof.scale.set(geographicRoofPlan.width / 126, 1, geographicRoofPlan.depth / 72);
        for (const label of this.labels.filter(l => l.roof)) {
            const point = geographicRoofPoint(label.position.x, label.position.z);
            label.position.x = point.x;
            label.position.z = point.z;
        }
        for (const group of [...this.groups.values(), this.roof]) {
            this.primitives.batchStaticMeshes(group);
        }
        for (const facility of this.facilities) {
            const target = new T.Mesh(new T.BoxGeometry(7, 5, 7), new T.MeshBasicMaterial({ visible: false }));
            target.position.set(facility.x, 2.5 + (facility.elevationOffset ?? 0), facility.z);
            target.userData.facility = facility;
            this.groups.get(facility.level)!.add(target);
            this.pickables.push(target);
        }
    }

    /**
     * Build a facility’s procedural model and selection target without duplicating existing vertical equipment.
     */
    private buildFacility(facility: Facility): void {
        const group = this.groups.get(facility.level)!;
        if (facility.kind === 'gate') {
            const palette = stationPalettes[this.levels.find(l => l.id === facility.level)?.station ?? 'jr-osaka'];
            const boundary = this.gateBoundaries.find(item => item.gateId === facility.id)!;
            const rotation = boundary.rotationRad;
            for (let i = 0; i < (facility.gateCount ?? 6); i++) {
                const offset = (i - ((facility.gateCount ?? 6) - 1) / 2) * 1.7;
                const x = boundary.center.x + Math.cos(rotation) * offset;
                const z = boundary.center.z + Math.sin(rotation) * offset;
                this.primitives.box(group, x, 1.3, z, 0.7, 1.5, 2.7, palette.gate).rotation.y = -rotation;
                this.primitives.box(group, x, 2.09, z, 0.6, 0.1, 2, palette.gateTop).rotation.y = -rotation;
            }
            if (!['gate', 'bridge'].includes(facility.id)) {
                this.label(facility.name, facility.x, 3, facility.z, facility.level);
            }
        }
        else if (facility.kind === 'ticket') {
            this.primitives.box(group, facility.x, 2.7, facility.z, 12, 0.4, 4, colors.white);
            for (let i = 0; i < 4; i++) {
                this.primitives.box(group, facility.x - 5 + i * 2.3, 3.5, facility.z, 1.2, 1, 0.3, 0x69877a);
            }
            this.label(facility.name, facility.x, 4.7, facility.z, facility.level);
        }
        else if (facility.kind === 'ticket-machine') {
            const angle = facility.rotationRad ?? 0;
            const point = (along: number, across: number) => ({
                x: facility.x + along * Math.cos(angle) - across * Math.sin(angle),
                z: facility.z + along * Math.sin(angle) + across * Math.cos(angle)
            });
            const cabinet = (along: number, y: number, across: number, w: number, h: number, d: number, color: number) => {
                const p = point(along, across);
                this.primitives.box(group, p.x, y, p.z, w, h, d, color).rotation.y = -angle;
            };
            for (const offset of [-1.8, 0, 1.8]) {
                cabinet(offset, 1.8, 0, 1.45, 2.5, 0.85, 0x668b87);
                cabinet(offset, 2.2, 0.46, 1.04, 0.72, 0.045, 0xd5e9dd);
                cabinet(offset, 1.48, 0.49, 0.66, 0.1, 0.05, 0x3c5c54);
                cabinet(offset, 3.1, 0, 1.4, 0.12, 0.88, 0x91b397);
            }
        }
        else if (facility.kind === 'information') {
            const rotation = -(facility.rotationRad ?? 0);
            const base = this.primitives.box(group, facility.x, 1.17, facility.z, 4.2, 1.15, 1.25, 0x678984);
            base.rotation.y = rotation;
            const top = this.primitives.box(group, facility.x, 1.83, facility.z, 4.6, 0.18, 1.55, colors.white);
            top.rotation.y = rotation;
        }
        else if (facility.kind === 'convenience-store') {
            this.label(facility.name, facility.x, 3.3, facility.z, facility.level, false, true);
        }
    }

    /**
     * Draw paid-area fences while leaving openings for all gate banks on the boundary.
     */
    private buildGateFences(boundary: GateBoundary): void {
        const group = this.groups.get(boundary.level)!;
        const color = stationPalettes[this.levels.find(l => l.id === boundary.level)?.station ?? 'jr-osaka'].fence;
        for (const segment of boundary.fences) {
            const dx = segment.to.x - segment.from.x;
            const dz = segment.to.z - segment.from.z;
            const length = Math.hypot(dx, dz);
            const rotation = -Math.atan2(dz, dx);
            for (const height of [0.95, 1.85]) {
                this.primitives.box(
                    group,
                    (segment.from.x + segment.to.x) / 2,
                    height,
                    (segment.from.z + segment.to.z) / 2,
                    length,
                    0.12,
                    0.13,
                    color
                ).rotation.y = rotation;
            }
            const count = Math.ceil(length / 1.8);
            for (let i = 0; i <= count; i++) {
                const t = i / count;
                this.primitives.box(group, segment.from.x + dx * t, 1.22, segment.from.z + dz * t, 0.12, 1.35, 0.12, color);
            }
        }
    }

    /**
     * Build the north-high station roof, skylights and trusses for overview-only display.
     */
    private buildRoof(): void {
        // Low-poly roof profile: shallow curved slope, separate strips for the skylights.
        for (let x = -63; x < 63; x += 6) {
            for (let z = -36; z < 36; z += 6) {
                const a = geographicRoofHeightAt(z);
                const b = geographicRoofHeightAt(z + 6);
                const vertices = new Float32Array([
                    x,
                    a,
                    z,
                    x + 5.9,
                    a,
                    z,
                    x + 5.9,
                    b,
                    z + 6,
                    x,
                    a,
                    z,
                    x + 5.9,
                    b,
                    z + 6,
                    x,
                    b,
                    z + 6
                ]);
                const geometry = new T.BufferGeometry();
                geometry.setAttribute('position', new T.BufferAttribute(vertices, 3));
                geometry.computeVertexNormals();
                const glass = x > -43 && x < 42 && z > -25 && z < 20;
                const material = this.primitives.material(glass ? (Math.round((x + 63) / 6) % 2 === 0 ? 0x99bdc3 : colors.glass) : colors.roof);
                material.side = T.DoubleSide;
                const mesh = new T.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.roof.add(mesh);
            }
        }
        for (const x of [-63, 63]) {
            for (let z = -36; z < 36; z += 6) {
                this.primitives.beam(this.roof, new T.Vector3(x, geographicRoofHeightAt(z), z), new T.Vector3(x, geographicRoofHeightAt(z + 6), z + 6), 0.65, colors.white);
            }
        }
        for (const z of [-36, 36]) {
            this.primitives.box(this.roof, 0, geographicRoofHeightAt(z), z, 127, 0.85, 0.8, colors.white);
            // Triangular steel truss below the roof edge.
            this.primitives.beam(
                this.roof,
                new T.Vector3(-63, geographicRoofHeightAt(z) - 3, z),
                new T.Vector3(63, geographicRoofHeightAt(z) - 3, z),
                0.23,
                colors.steel
            );
            for (let x = -63; x < 63; x += 9) {
                this.primitives.beam(
                    this.roof,
                    new T.Vector3(x, geographicRoofHeightAt(z) - 3, z),
                    new T.Vector3(x + 4.5, geographicRoofHeightAt(z) - 0.5, z),
                    0.13,
                    colors.steel
                );
                this.primitives.beam(
                    this.roof,
                    new T.Vector3(x + 4.5, geographicRoofHeightAt(z) - 0.5, z),
                    new T.Vector3(x + 9, geographicRoofHeightAt(z) - 3, z),
                    0.13,
                    colors.steel
                );
            }
        }
        this.label(
            messageText('stations.jrOsaka.name'),
            0,
            geographicRoofHeightAt(0) + 1.5,
            0,
            undefined,
            true,
            true
        );
    }
}
