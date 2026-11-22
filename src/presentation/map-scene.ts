import { MapModels } from './models/map-models.ts';
import { SceneLabels } from './labels/scene-labels.ts';
import { MapGestures, type OrbitAnchor } from './camera/map-gestures.ts';
import { RouteModel, routeBeamRadius, routePointElevation } from './models/stations/route-model.ts';
import { createRoutePositionMarker } from './models/stations/route-position-marker.ts';
import { RoutePlaybackView } from './camera/route-playback-view.ts';
import { GuidedTour } from './camera/guided-tour.ts';
import type { TourChapter } from './components/tour-caption.ts';
import { TourLayerFade } from './appearance/tour-layer-fade.ts';
import { createRoutePlayback, type RoutePlaybackSample, type RoutePlaybackStatus } from '../application/navigation/route-playback.ts';
import { orbitAboutPoint, orbitPointOnPlane } from './camera/orbit-view.ts';
import { geographicBuildings } from '../infrastructure/buildings/index.ts';
import { publicUndergroundBlocksByStation } from '../infrastructure/district/geographic-map.ts';
import { buildGeographicBuilding } from './models/buildings/geographic-building-model.ts';
import { buildGeographicContext, setGeographicContextTheme } from './models/public-areas/geographic-context.ts';
import * as T from 'three';
import type { Facility, FacilityKind, Level, LevelId, RouteNode, StationLayout } from '../domain/map/model.ts';
import type { MapViewState } from '../application/map-session.ts';
import { displayElevation } from '../application/exploration/display-elevation.ts';
import { allowsGroundLayer, showsJrConcourseReference, viewLayerRole } from '../application/exploration/view-layer.ts';
import { LayerAppearance } from './appearance/layer-appearance.ts';
import { cameraOffset, viewBasis, resetView } from './camera/view-orientation.ts';
import { visibleElevatorConnections } from '../application/connections/elevator-visibility.ts';
import { advanceExplode } from './appearance/explode-transition.ts';
import { cameraEnvelope, clampCameraZoom, manualZoomSpan } from './camera/camera-framing.ts';
import { interpolateCameraPose, type CameraPose } from './camera/camera-transition.ts';
import { facilityFocusRect, facilityCameraCenter, minimumMapZoom } from './camera/facility-focus.ts';
import { SelectionMarker } from './components/selection-marker.ts';
import { visibleLabelOccluders } from './labels/label-occlusion.ts';
import type { ShareCamera } from './camera/map-view-url.ts';

export interface MapCameraSnapshot {
    offset: [number, number, number];
    pan: [number, number, number];
    zoom: number;
    manual?: { center: [number, number, number]; span: number; referenceSpan?: number };
    facility?: string;
    followFacility: boolean;
}

export class MapScene {
    private models: MapModels;
    private labels: SceneLabels;
    private routeModel: RouteModel;
    private readonly routePositionMarker = createRoutePositionMarker();
    private playback?: RoutePlaybackView;
    private tour?: {
        player: GuidedTour;
        orientation: T.Vector3;
        time: number;
        sampledAt: number;
        last?: ReturnType<GuidedTour['advance']>;
    };
    private tourWakeup?: number;
    private trainWakeup?: number;
    private trainEpoch?: number;
    private readonly trainView = new T.Frustum();
    private readonly trainViewProjection = new T.Matrix4();
    private trainInLastDraw = false;
    private trainOnlyFrame = false;
    private nextTourLabelUpdate = 0;
    private readonly tourLayerFade = new TourLayerFade();
    private gestures: MapGestures;
    private readonly resizeObserver: ResizeObserver;
    private renderer: T.WebGLRenderer;
    private scene = new T.Scene();
    private readonly sun = new T.DirectionalLight(0xffffff, 3.2);
    private camera = new T.OrthographicCamera(-100, 100, 100, -100, 0.1, 6000);
    private context: ReturnType<typeof buildGeographicContext>;
    private roadsVisible = true;
    private geographicExteriors = new T.Group();
    /**
     * Toggle the full ground context and synchronize the visibility of above-ground building shells and footprints.
     */
    setRoadsVisible(visible: boolean): void {
        if (this.roadsVisible === visible) {
            return;
        }
        this.stopGuidedTour();
        this.roadsVisible = visible;
        this.invalidateModels();
    }
    /** Apply the same night theme to ground, building and station model materials. */
    setDarkTheme(dark: boolean): void {
        this.renderer.toneMappingExposure = dark ? 0.68 : 1.35;
        setGeographicContextTheme(this.context, dark);
        this.appearance.setDarkTheme(dark);
        this.invalidateModels();
    }
    private appearance = new LayerAppearance();
    private labelOccluders: T.Object3D[] = [];
    private raycaster = new T.Raycaster();
    private facilityPickables: T.Object3D[] = [];
    private hoverPoint?: { x: number; y: number };
    private hoverFrame = 0;
    private state: MapViewState;
    private displayedExplode: number;
    private renderingStarted = false;
    private immediateExplode = false;
    private draggingExplode = false;
    private modelsDirty = true;
    private fitEnvelope?: T.Vector3[];
    private fullShafts = new Set<string>();
    private orientationChanged = false;
    private manualView?: {
        center: T.Vector3;
        span: number;
        referenceSpan: number;
    };
    private framing?: {
        center: T.Vector3;
        span: number;
    };
    private focusTransition = false;
    private controlTransition?: { from: CameraPose; offset: T.Vector3; startedAt: number; duration: number };
    private locatingFacility = false;
    private targetCenter?: T.Vector3;
    private zoomValue = 1;
    private baseSpan = 1;
    private minimumZoom = 1;
    private pan = new T.Vector3();
    private frame = 0;
    private disposed = false;
    private width = 1;
    private height = 1;
    private selectionMarker = new SelectionMarker();
    private facilityLabelIds?: ReadonlySet<string>;
    private selected = this.selectionMarker.group;
    private activeFacility?: Facility;
    private readonly walkingNodes: Map<string, RouteNode>;
    private walkingFacilityTargets = new Map<string, string>();
    private walkingPlatforms = new Map<T.Object3D, Facility[]>();
    private onWalkingPick?: (id: string) => void;
    private sharedCamera?: ShareCamera;
    private shareSettled = false;
    private refreshShareZoomBounds = false;
    /** Rebuild cached shadows and redraw after the renderer restores its WebGL context. */
    private readonly restoreContext = () => this.invalidateModels();
    /**
     * Create the renderer, camera and layered scene; let the page entry present initialization failures.
     */
    constructor(
        private host: HTMLElement,
        labelHost: HTMLElement,
        private levels: Level[],
        private facilities: Facility[],
        nodes: RouteNode[],
        private layout: StationLayout,
        initial: MapViewState,
        private onSelect: (facility?: Facility) => void,
        private onViewSettled?: () => void,
        onSpacingGesture?: (delta?: number) => void,
        private readonly onRoutePlayback?: (status: RoutePlaybackStatus) => void,
        private readonly onTourChange?: (active: boolean) => void,
        private readonly onTourChapter?: (chapter?: TourChapter) => void
    ) {
        this.state = { ...initial };
        this.displayedExplode = initial.explode;
        this.routeModel = new RouteModel(nodes, layout.connections);
        this.walkingNodes = new Map(nodes.map(node => [node.id, node]));
        this.scene.matrixWorldAutoUpdate = false;
        this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.domElement.addEventListener('webglcontextrestored', this.restoreContext);
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.outputColorSpace = T.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.autoUpdate = false;
        this.renderer.shadowMap.type = T.PCFSoftShadowMap;
        this.renderer.toneMapping = T.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.35;
        host.append(this.renderer.domElement);
        this.scene.add(new T.HemisphereLight(0xffffff, 0xb1b69d, 2.5));
        const sun = this.sun;
        sun.position.set(-60, 120, 65);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        Object.assign(
            sun.shadow.camera,
            {
                left: -120,
                right: 120,
                top: 120,
                bottom: -120,
                near: 1,
                far: 300
            }
        );
        sun.shadow.bias = -0.001;
        sun.shadow.normalBias = 0.12;
        this.scene.add(sun);
        this.models = new MapModels({
            scene: this.scene,
            levels: this.levels,
            facilities: this.facilities,
            layout: this.layout,
            maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy()
        });
        this.renderer.localClippingEnabled = !!this.models.loopTrain;
        this.labels = new SceneLabels(labelHost, this.models.labels);
        this.context = buildGeographicContext(
            this.models.openings.filter(o => this.levels.find(l => l.id === o.level)!.y === 0).map(o => o.outline),
            this.renderer.capabilities.getMaxAnisotropy()
        );
        this.scene.add(this.context.roads, this.context.buildings);
        for (const building of geographicBuildings) {
            const model = buildGeographicBuilding(building, this.layout.exteriorOpenings);
            this.geographicExteriors.add(model);
        }
        this.scene.add(this.geographicExteriors);
        this.scene.add(this.models.roof, this.routeModel.group, this.selected, this.routePositionMarker);
        this.scene.traverse(object => {
            if (object.userData.labelOccluder) {
                this.labelOccluders.push(object);
            }
        });
        this.models.roof.traverse(object => {
            if (object instanceof T.Mesh && !object.userData.labelOccluder) {
                this.labelOccluders.push(object);
            }
        });
        this.gestures = new MapGestures(this.renderer.domElement, {
            beginOrbit: anchor => this.beginOrbit(anchor),
            rotate: (pivot, yawRadians, pitchRadians) => {
                if (!this.manualView) {
                    return false;
                }
                orbitAboutPoint(cameraOffset, this.manualView.center, pivot, yawRadians, pitchRadians);
                this.orientationChanged = true;
                return true;
            },
            beginDrag: () => {
                this.stopGuidedTour(true);
                this.pauseRoutePlayback();
                this.interruptControlTransition();
                if (this.locatingFacility && this.framing && this.targetCenter) {
                    this.pan.add(this.framing.center.clone().sub(this.targetCenter));
                }
                this.locatingFacility = false;
                this.focusTransition = false;
            },
            pan: (dx, dy) => {
                const scale = (this.camera.top - this.camera.bottom) / this.height;
                const right = new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
                const up = new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
                const pan = this.manualView?.center ?? this.pan;
                pan.addScaledVector(right, -dx * scale);
                pan.addScaledVector(up, dy * scale);
            },
            zoom: (factor, pivot) => this.zoom(factor, pivot),
            adjustSpacing: delta => onSpacingGesture?.(delta),
            select: (x, y) => this.selectAt(x, y),
            hover: point => this.setPointerHover(point),
            invalidate: () => this.requestRender()
        });
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(host);
        this.resize();
    }

    /** Freeze the current frame and anchor centered rotation to the displayed 1F plane. */
    private beginOrbit(anchor: OrbitAnchor): T.Vector3 | undefined {
        if (!this.framing) {
            return undefined;
        }
        this.stopGuidedTour(true);
        this.pauseRoutePlayback();
        this.controlTransition = undefined;
        this.locatingFacility = false;
        this.focusTransition = false;
        this.freezeFraming(this.framing);
        if (anchor === 'canvas-center') {
            this.raycaster.setFromCamera(new T.Vector2(0, 0), this.camera);
            return orbitPointOnPlane(this.raycaster.ray, this.levelY('district-ground')) ?? this.framing.center;
        }
        // Pinch zoom keeps the visible point at the two-finger midpoint.
        this.setPointerRay(anchor.x, anchor.y);
        const hit = this.raycaster.intersectObjects(this.scene.children, true).find(item => {
            for (let object: T.Object3D | null = item.object; object; object = object.parent) {
                if (!object.visible || object === this.selected || object === this.routeModel.group || object === this.routePositionMarker) {
                    return false;
                }
            }
            const material = (item.object as T.Mesh).material;
            return material && !Array.isArray(material) && material.visible && !(material instanceof T.ShadowMaterial);
        });
        return hit?.point ?? orbitPointOnPlane(this.raycaster.ray, this.framing.center.y) ?? this.framing.center;
    }

    /** Freeze the displayed frame and keep its starting scale reachable across gestures. */
    private freezeFraming(frame: { center: T.Vector3; span: number }): void {
        this.zoomValue = this.baseSpan / frame.span;
        this.manualView = {
            center: frame.center.clone(),
            span: frame.span,
            referenceSpan: this.manualView?.referenceSpan ?? frame.span
        };
    }

    /** Start a toolbar move from the displayed pose, even when replacing a pending move. */
    private animateControl(duration: number, fromOffset: T.Vector3): void {
        if (this.framing) {
            this.controlTransition = {
                from: { ...this.framing, offset: fromOffset.clone() },
                offset: cameraOffset.clone(),
                startedAt: performance.now(),
                duration
            };
            cameraOffset.copy(fromOffset);
            this.shareSettled = false;
        }
    }

    /** Let direct input take over without jumping to the toolbar's pending target. */
    private interruptControlTransition(): void {
        if (this.controlTransition && this.framing) {
            this.freezeFraming(this.framing);
        }
        this.controlTransition = undefined;
    }

    /** Convert canvas coordinates into the shared raycaster used by orbit pivots and facility picking. */
    private setPointerRay(clientX: number, clientY: number): void {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.raycaster.setFromCamera(
            new T.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1),
            this.camera
        );
    }

    /** Resolve the same visible pick target for the cursor and for a click. */
    private pickAt(clientX: number, clientY: number): Facility | undefined {
        this.setPointerRay(clientX, clientY);
        const hits = this.raycaster.intersectObjects(this.facilityPickables, false);
        if (!this.onWalkingPick) {
            return hits[0]?.object.userData.facility as Facility | undefined;
        }
        const hit = hits.find(({ object }) => this.walkingFacilityTargets.has((object.userData.facility as Facility).id));
        const slab = this.raycaster.intersectObjects([...this.walkingPlatforms.keys()], false)[0];
        if (slab && (!hit || slab.distance < hit.distance)) {
            if (this.isPickOccluded(slab.distance)) {
                return undefined;
            }
            return this.walkingPlatforms.get(slab.object)!.reduce((closest, facility) => {
                const distance = (candidate: Facility) => Math.hypot(slab.point.x - candidate.x, slab.point.z - candidate.z);
                return distance(facility) < distance(closest) ? facility : closest;
            });
        }
        if (!hit) {
            return undefined;
        }
        return this.isPickOccluded(hit.distance) ? undefined : hit.object.userData.facility as Facility;
    }

    /** Reject targets behind the same visible opaque geometry that conceals map labels. */
    private isPickOccluded(distance: number): boolean {
        this.raycaster.far = Math.max(0, distance - .1);
        const blocked = this.raycaster.intersectObjects(visibleLabelOccluders(this.labelOccluders), false).length > 0;
        this.raycaster.far = Infinity;
        return blocked;
    }

    /** Coalesce hover hit tests to one per frame without scheduling a WebGL draw. */
    private setPointerHover(point?: { x: number; y: number }): void {
        const canvas = this.renderer.domElement;
        this.hoverPoint = point;
        if (!point) {
            cancelAnimationFrame(this.hoverFrame);
            this.hoverFrame = 0;
            canvas.removeAttribute('data-clickable');
        }
        else if (!this.hoverFrame) {
            this.hoverFrame = requestAnimationFrame(() => {
                this.hoverFrame = 0;
                const { x, y } = this.hoverPoint!;
                canvas.toggleAttribute('data-clickable', Boolean(this.pickAt(x, y)));
            });
        }
    }

    /** Select a facility or send the picked walking point to the active route field. */
    private selectAt(clientX: number, clientY: number): void {
        if (this.tour) {
            this.stopGuidedTour(true);
            return;
        }
        const target = this.pickAt(clientX, clientY);
        if (!this.onWalkingPick) {
            this.onSelect(target);
        }
        else if (target) {
            this.onWalkingPick(this.walkingFacilityTargets.get(target.id)!);
        }
    }

    /** Release input, labels, pending redraw and WebGL resources when this map is unmounted. */
    dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        window.clearTimeout(this.tourWakeup);
        window.clearTimeout(this.trainWakeup);
        this.tourLayerFade.clear();
        this.onTourChapter?.();
        this.gestures.dispose();
        this.setPointerHover();
        this.labels.dispose();
        this.renderer.domElement.removeEventListener('webglcontextrestored', this.restoreContext);
        this.appearance.dispose(this.scene);
        this.resizeObserver.disconnect();
        if (this.frame) {
            cancelAnimationFrame(this.frame);
            this.frame = 0;
        }
        const geometries = new Set<T.BufferGeometry>();
        const materials = new Set<T.Material>();
        const textures = new Set<T.Texture>();
        this.scene.traverse(object => {
            if (object instanceof T.Mesh) {
                geometries.add(object.geometry);
                for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
                    materials.add(material);
                    for (const value of Object.values(material)) {
                        if (value instanceof T.Texture) {
                            textures.add(value);
                        }
                    }
                }
            }
            if (object instanceof T.DirectionalLight) {
                object.shadow.dispose();
            }
        });
        for (const geometry of geometries) {
            geometry.dispose();
        }
        for (const material of materials) {
            material.dispose();
        }
        for (const texture of textures) {
            texture.dispose();
        }
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }
    /**
     * Receive exploration state while retaining the displayed camera when navigation changes the visible floors.
     */
    update(state: MapViewState, options: {
        immediateExplode?: boolean;
        preserveFraming?: boolean;
    } = {}): void {
        const floorChanged = this.state.level !== state.level;
        const stationChanged = this.state.focusStation !== state.focusStation;
        if (floorChanged || stationChanged || this.state.route !== state.route || this.state.roof !== state.roof ||
            this.state.explode !== state.explode) {
            this.stopGuidedTour();
            this.stopRoutePlayback();
        }
        this.modelsDirty ||= floorChanged || stationChanged ||
            this.state.roof !== state.roof || this.state.route !== state.route;
        if (floorChanged || options.preserveFraming) {
            this.locatingFacility = false;
        }
        if (floorChanged || stationChanged || options.preserveFraming) {
            this.controlTransition = undefined;
        }
        if (stationChanged) {
            this.fitEnvelope = undefined;
        }
        if ((options.preserveFraming || (floorChanged && !stationChanged)) && this.framing) {
            // Keep the frame actually on screen, including an interrupted facility transition.
            this.freezeFraming(this.framing);
            this.focusTransition = false;
        } else if (stationChanged) {
            this.manualView = undefined;
            this.focusTransition = true;
        }
        if (options.immediateExplode) {
            this.focusTransition = false;
        }
        this.state = { ...state };
        this.immediateExplode ||= options.immediateExplode === true;
        this.requestRender();
    }

    /** Start the district's scripted tour from its built-out overview. */
    startGuidedTour(): void {
        if (this.tour) {
            return;
        }
        this.stopRoutePlayback();
        this.controlTransition = undefined;
        this.focusTransition = false;
        const orientation = cameraOffset.clone();
        const overview = this.regionFramingPoints(null, id => displayElevation(this.levels, id, 0));
        const origin = this.framing && { ...this.framing, orientation, explode: this.displayedExplode };
        const now = performance.now();
        this.tour = { player: new GuidedTour(this.layout, this.levels, overview, now, origin), orientation, time: now, sampledAt: now };
        this.onTourChange?.(true);
        this.invalidateModels();
    }

    /** Give manual exploration control back, retaining the live frame when a map gesture takes over. */
    stopGuidedTour(keepFraming = false): void {
        if (!this.tour) {
            return;
        }
        if (keepFraming && this.framing) {
            this.locatingFacility = false;
            this.freezeFraming(this.framing);
        } else {
            cameraOffset.copy(this.tour.orientation);
            this.orientationChanged = true;
        }
        this.tour = undefined;
        window.clearTimeout(this.tourWakeup);
        this.tourLayerFade.clear();
        this.onTourChapter?.();
        this.immediateExplode = true;
        this.onTourChange?.(false);
        this.invalidateModels();
    }

    /** Play, pause or replay the currently drawn route without changing the itinerary. */
    toggleRoutePlayback(): void {
        this.stopGuidedTour();
        if (!this.framing || !this.state.route) {
            return;
        }
        if (this.playback?.status === 'playing') {
            this.pauseRoutePlayback();
            return;
        }
        this.controlTransition = undefined;
        if (this.playback?.status === 'paused') {
            this.playback.resume(this.framing);
        } else {
            const path = createRoutePlayback(this.routeModel.path(this.state.route), this.levels, this.layout.connections);
            if (!path) {
                return;
            }
            this.playback = new RoutePlaybackView(path, this.framing);
        }
        this.locatingFacility = false;
        this.focusTransition = false;
        this.routePositionMarker.visible = true;
        this.onRoutePlayback?.('playing');
        this.invalidateModels();
    }

    /** End playback and restore the preview's layer controls while keeping the current camera framing. */
    stopRoutePlayback(): void {
        if (!this.playback) {
            return;
        }
        this.playback = undefined;
        this.routePositionMarker.visible = false;
        if (this.framing) {
            this.freezeFraming(this.framing);
        }
        this.onRoutePlayback?.('ready');
        this.invalidateModels();
    }

    /** Give manual camera gestures control while preserving the current point on the route. */
    private pauseRoutePlayback(): void {
        if (this.playback?.status !== 'playing') {
            return;
        }
        this.playback.status = 'paused';
        if (this.framing) {
            this.freezeFraming(this.framing);
        }
        this.onRoutePlayback?.('paused');
        this.requestRender();
    }

    /** Skip expensive detail rebuilds during slider input and restore the settled scene on release. */
    setExplodeDragging(dragging: boolean): void {
        if (this.draggingExplode === dragging) {
            return;
        }
        this.draggingExplode = dragging;
        if (dragging) {
            this.interruptControlTransition();
        }
        this.sun.shadow.intensity = dragging ? 0 : 1;
        if (!dragging) {
            this.modelsDirty = true;
        }
        this.requestRender();
    }
    /**
     * Update the three-dimensional facility marker and start centring it in the usable viewport.
     */
    selectById(id: string, follow = true): void {
        const facility = this.facilities.find(candidate => candidate.id === id);
        if (!facility) {
            return;
        }
        if (follow) {
            this.controlTransition = undefined;
            this.manualView = undefined;
            this.gestures.cancelOrbit();
        }
        this.activeFacility = facility;
        this.locatingFacility = follow;
        this.focusTransition = follow;
        this.selectionMarker.restart(performance.now());
        this.invalidateModels();
    }

    /** Hide the marker and stop an interrupted facility transition at the current view. */
    clearFacilitySelection(): void {
        if (!this.activeFacility) {
            return;
        }
        if (this.locatingFacility && this.focusTransition && this.framing) {
            this.freezeFraming(this.framing);
        }
        this.activeFacility = undefined;
        this.locatingFacility = false;
        this.focusTransition = false;
        this.invalidateModels();
    }

    /** Replace general map labels with the facilities matching the current panel filters. */
    setFacilityLabelFilter(ids?: ReadonlySet<string>): void {
        if (this.facilityLabelIds === ids) {
            return;
        }
        this.facilityLabelIds = ids;
        this.labels.setFacilityFilter(ids && this.facilities.filter(facility => ids.has(facility.id)));
        this.requestRender();
    }

    /** Reuse the facility hit targets and label standalone graph nodes without adding map geometry. */
    setWalkingPickTargets(
        targets?: readonly { id: string; facilityId?: string; name: string; kind?: FacilityKind }[],
        onPick?: (id: string) => void
    ): void {
        this.onWalkingPick = targets ? onPick : undefined;
        this.walkingFacilityTargets.clear();
        const facilities = new Map(this.facilities.map(facility => [facility.id, facility]));
        const labels = targets?.flatMap(target => {
            const facility = target.facilityId && facilities.get(target.facilityId);
            const anchor = facility || this.walkingNodes.get(target.id);
            if (!anchor) {
                return [];
            }
            if (facility) {
                this.walkingFacilityTargets.set(facility.id, target.id);
            }
            return [{
                id: target.id,
                text: facility ? facility.mapLabel ?? facility.name : target.name,
                accessibleName: target.name,
                kind: target.kind,
                level: anchor.level,
                position: new T.Vector3(anchor.x, 3.15 + (anchor.elevationOffset ?? 0), anchor.z)
            }];
        });
        this.labels.setWalkingTargets(labels, this.onWalkingPick);
        this.invalidateModels();
    }
    /** Capture navigation intent and manual camera framing for a locale reload. */
    snapshotCamera(): MapCameraSnapshot {
        return {
            offset: (this.tour?.orientation ?? cameraOffset).toArray(),
            pan: this.pan.toArray(),
            zoom: this.zoomValue,
            manual: this.manualView && {
                center: this.manualView.center.toArray(),
                span: this.manualView.span,
                referenceSpan: this.manualView.referenceSpan
            },
            facility: this.activeFacility?.id,
            followFacility: this.locatingFacility
        };
    }

    /** Return the actual frame only after pointer motion and scene transitions have settled. */
    snapshotShareCamera(): ShareCamera | undefined {
        return !this.tour && this.shareSettled && !this.gestures.isMoving && !this.draggingExplode ? this.sharedCamera : undefined;
    }

    /** Restore a shared world center and vertical span without following a facility. */
    restoreShareCamera(snapshot: ShareCamera, facility?: string): void {
        const yaw = T.MathUtils.degToRad(snapshot.yaw);
        const pitch = T.MathUtils.degToRad(snapshot.pitch);
        const length = cameraOffset.length();
        const horizontal = Math.cos(pitch) * length;
        this.refreshShareZoomBounds = true;
        this.restoreCamera({
            offset: [Math.sin(yaw) * horizontal, Math.sin(pitch) * length, Math.cos(yaw) * horizontal],
            pan: [0, 0, 0],
            zoom: 1,
            manual: { center: snapshot.center, span: snapshot.span },
            facility,
            followFacility: false
        });
    }

    /** Notify the page once per settled camera change, including after a gesture ends. */
    private reportShareCamera(center: T.Vector3, span: number, settled: boolean): void {
        const wasSettled = this.shareSettled;
        this.shareSettled = settled;
        if (!settled || !this.onViewSettled) {
            return;
        }
        const yaw = T.MathUtils.radToDeg(Math.atan2(cameraOffset.x, cameraOffset.z));
        const pitch = T.MathUtils.radToDeg(Math.atan2(cameraOffset.y, Math.hypot(cameraOffset.x, cameraOffset.z)));
        const previous = this.sharedCamera;
        if (previous && wasSettled && previous.center.every((value, i) => Math.abs(value - center.getComponent(i)) < .00001) &&
            Math.abs(previous.span - span) < .00001 && Math.abs(previous.yaw - yaw) < .00001 &&
            Math.abs(previous.pitch - pitch) < .00001) {
            return;
        }
        this.sharedCamera = { center: center.toArray(), span, yaw, pitch };
        this.onViewSettled();
    }

    /** Restore the camera and marker without jumping or restarting the focus transition. */
    restoreCamera(snapshot: MapCameraSnapshot): void {
        this.controlTransition = undefined;
        cameraOffset.fromArray(snapshot.offset);
        this.pan.fromArray(snapshot.pan);
        this.zoomValue = snapshot.zoom;
        if (snapshot.manual) {
            this.manualView = {
                center: new T.Vector3().fromArray(snapshot.manual.center),
                span: snapshot.manual.span,
                referenceSpan: snapshot.manual.referenceSpan ?? snapshot.manual.span
            };
            this.baseSpan = snapshot.zoom * snapshot.manual.span;
        }
        this.activeFacility = this.facilities.find(facility => facility.id === snapshot.facility);
        this.locatingFacility = snapshot.followFacility && this.activeFacility !== undefined;
        window.dispatchEvent(new Event('map-orientation'));
        this.invalidateModels();
    }
    /** Scale the orthographic view, animating toolbar steps while keeping gestures direct. */
    zoom(factor: number, pivot?: T.Vector3, animated = false): void {
        this.stopGuidedTour(true);
        this.pauseRoutePlayback();
        this.focusTransition = false;
        if (!animated) {
            this.interruptControlTransition();
        }
        const nextZoom = clampCameraZoom(this.zoomValue * factor, this.minimumZoom);
        const beyondAutomaticFit = factor < 1 && nextZoom >= this.zoomValue
            ? (this.controlTransition ? this.cameraTarget() : this.framing) : undefined;
        const current = this.manualView ?? beyondAutomaticFit;
        if (current) {
            const { baseSpan, minimumZoom } = this.cameraFit();
            this.baseSpan = baseSpan;
            this.minimumZoom = minimumZoom;
            const span = manualZoomSpan(current.span, factor, this.manualView?.referenceSpan ?? current.span, baseSpan, minimumZoom);
            if (!this.manualView && span !== current.span) {
                this.freezeFraming(current);
                this.locatingFacility = false;
            }
            if (this.manualView) {
                if (pivot) {
                    this.manualView.center.lerp(pivot, 1 - span / current.span);
                }
                this.manualView.span = span;
                this.zoomValue = baseSpan / span;
            }
        }
        else {
            this.zoomValue = nextZoom;
        }
        if (animated) {
            this.animateControl(220, cameraOffset);
        }
        this.requestRender();
    }
    /**
     * Clear manual pan and zoom, optionally restoring the north-facing orientation.
     */
    reset(resetOrientation = false, animated = false): void {
        const fromOffset = animated && this.framing
            ? this.camera.position.clone().sub(this.framing.center).setLength(cameraOffset.length()) : undefined;
        this.stopGuidedTour();
        this.stopRoutePlayback();
        this.controlTransition = undefined;
        this.manualView = undefined;
        this.gestures.cancelOrbit();
        if (resetOrientation) {
            resetView();
            this.orientationChanged = true;
        }
        this.locatingFacility = false;
        this.focusTransition = false;
        this.zoomValue = 1;
        this.pan.set(0, 0, 0);
        this.activeFacility = undefined;
        if (fromOffset) {
            this.animateControl(420, fromOffset);
        }
        this.invalidateModels();
    }
    /**
     * Request reframing after panel resizing so focused facilities remain clear of floating navigation.
     */
    refreshViewport(): void {
        this.requestRender();
    }
    /**
     * Return a floor’s display elevation including its expansion offset.
     */
    private levelY(id: LevelId): number {
        return displayElevation(this.levels, id, this.displayedExplode);
    }
    /**
     * Match the renderer to its container and request a redraw.
     */
    private resize(): void {
        this.width = this.host.clientWidth;
        this.height = this.host.clientHeight;
        this.nextTourLabelUpdate = 0;
        this.renderer.setSize(this.width, this.height);
        this.requestRender();
    }
    /**
     * Coalesce redraw requests into a single pending animation frame.
     */
    private requestRender(trainOnly = false): void {
        if (!trainOnly) {
            this.trainOnlyFrame = false;
        }
        if (this.renderingStarted && !this.disposed && !this.frame) {
            this.trainOnlyFrame = trainOnly;
            this.frame = requestAnimationFrame(() => {
                if (this.trainOnlyFrame) {
                    this.renderTrainFrame();
                } else {
                    this.render();
                }
            });
        }
    }

    /** Draw the moving stock against the last scene without recomputing camera framing or DOM labels. */
    private renderTrainFrame(): void {
        this.frame = 0;
        const now = performance.now();
        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const wait = this.models.loopTrain?.update(now - (this.trainEpoch ?? now), reducedMotion) ?? Infinity;
        const visible = this.models.loopTrain?.intersectsView(this.trainView) ?? false;
        if (visible || this.trainInLastDraw) {
            this.renderer.render(this.scene, this.camera);
        }
        this.trainInLastDraw = visible;
        this.scheduleTrainFrame(wait);
    }

    /** Poll offscreen motion without drawing; use animation frames when the train is in view. */
    private scheduleTrainFrame(wait: number): void {
        window.clearTimeout(this.trainWakeup);
        if (wait === 0 && this.trainInLastDraw) {
            this.requestRender(true);
        } else if (Number.isFinite(wait)) {
            this.trainWakeup = window.setTimeout(() => this.requestRender(true), wait === 0 ? 80 : Math.max(1, wait));
        }
    }

    /** Draw synchronously once so the page can report first-frame errors and end loading accurately. */
    renderFirstFrame(): void {
        cancelAnimationFrame(this.frame);
        this.renderingStarted = true;
        this.trainEpoch ??= performance.now();
        this.render();
    }

    /** Invalidate layered geometry and the fixed light's cached shadows. */
    private invalidateModels(): void {
        this.modelsDirty = true;
        this.requestRender();
    }

    /**
     * Synchronize material roles and visibility only when the exploration state changes.
     */
    private updateModels(state: MapViewState, tourGround?: boolean): void {
        this.modelsDirty = false;
        const activeFloors = new Set<T.Object3D>();
        const publicBlocks = !this.playback && state.focusStation
            ? publicUndergroundBlocksByStation.get(state.focusStation)
            : undefined;
        for (const [id, group] of this.models.groups) {
            const role = this.layerRole(state, id);
            group.visible = role !== 'hidden';
            if (role === 'normal' || role === 'current') {
                activeFloors.add(group);
            }
            this.appearance.apply(
                group, role === 'context', state.focusStation, null,
                id === 'district-underground' && role === 'current' ? publicBlocks : undefined
            );
        }
        this.facilityPickables = this.models.pickables.filter(object => object.parent && activeFloors.has(object.parent));
        this.walkingPlatforms.clear();
        if (this.onWalkingPick) {
            for (const facility of this.facilities) {
                if (facility.kind !== 'platform' || !facility.platformId || !this.walkingFacilityTargets.has(facility.id)) {
                    continue;
                }
                const slab = this.models.platformSurfaces.get(facility.platformId);
                if (slab?.parent && activeFloors.has(slab.parent)) {
                    const platforms = this.walkingPlatforms.get(slab) ?? [];
                    platforms.push(facility);
                    this.walkingPlatforms.set(slab, platforms);
                }
            }
        }
        this.fullShafts = visibleElevatorConnections(this.layout.connections, this.levels, state.level);
        for (const connector of this.models.connectors) {
            const fullShaft = this.fullShafts.has(connector.connection.id);
            const { from, to } = connector.connection;
            const roles = [from, to].map(p => this.layerRole(state, p.level));
            if (!fullShaft && roles.every(role => role === 'hidden')) {
                connector.group.visible = false;
                continue;
            }
            connector.group.visible = true;
            const owners = [from, to].map(p => this.levels.find(l => l.id === p.level)?.station);
            const [fromOwner = 'jr-osaka', toOwner = 'jr-osaka'] = owners;
            let owner = fromOwner === toOwner ? fromOwner : null;
            if (!this.tour && this.activeFacility?.connectionId === connector.connection.id) {
                owner = state.focusStation ?? null;
            } else if (connector.connection.blockId || connector.connection.evidence.source === 'district') {
                owner = null;
            }
            this.appearance.apply(
                connector.group,
                !roles.some(role => role === 'current' || role === 'normal'),
                state.focusStation,
                owner
            );
        }
        const canShowGround = allowsGroundLayer(this.levels, state);
        const groundVisible = canShowGround && (tourGround ?? this.roadsVisible);
        this.context.roads.visible = groundVisible;
        this.context.buildings.visible = groundVisible;
        const concourseReference = this.models.jrConcourseReference;
        concourseReference.visible = !this.playback && showsJrConcourseReference(this.levels, state.level);
        if (concourseReference.visible) {
            this.appearance.apply(concourseReference, false);
        }
        this.models.updateBuildingFloorVisibility(state.roof);
        this.geographicExteriors.visible = groundVisible && state.roof && state.level === 'all';
        this.appearance.apply(this.geographicExteriors, false, state.focusStation, null);
        this.models.roof.visible = canShowGround && state.roof && state.level === 'all';
        for (const { model, ground } of this.models.canopies) {
            model.visible = state.roof && (!ground || groundVisible);
        }
        this.appearance.apply(this.models.roof, false, state.focusStation, 'jr-osaka');
        this.selected.visible = !this.tour && !!this.activeFacility && ['normal', 'current'].includes(this.layerRole(state, this.activeFacility.level));
    }

    /** Cut away physically higher slabs, even when they share an exploration band with the walking floor. */
    private layerRole(state: MapViewState, id: LevelId) {
        if (this.playback && this.levels.find(level => level.id === id)!.y > this.playback.sample.ceiling) {
            return 'hidden';
        }
        return viewLayerRole(this.levels, state, id);
    }

    /** Move floor groups and keep equipment attached without reapplying materials or visibility. */
    private updateModelElevations(state: MapViewState, preview: boolean): void {
        const levelY = (id: LevelId) => this.levelY(id);
        for (const [id, group] of this.models.groups) {
            group.position.y = levelY(id);
        }
        this.models.jrConcourseReference.position.y = this.models.groups.get('concourse')?.position.y ?? 0;
        for (const connector of this.models.connectors) {
            if (connector.group.visible) {
                connector.update(levelY, state.level, this.fullShafts.has(connector.connection.id), preview);
            }
        }
        this.models.roof.position.y = 26 + this.displayedExplode * 56;
        if (state.route || this.routeModel.group.visible) {
            this.routeModel.update(state.route, levelY, id => {
                const role = this.layerRole(state, id);
                return this.playback ? role !== 'hidden' : role === 'normal' || role === 'current';
            }, !this.playback);
        }
        this.routeModel.group.visible = !!state.route;
        if (this.activeFacility) {
            this.selected.position.set(
                this.activeFacility.x,
                this.levelY(this.activeFacility.level) + (this.activeFacility.elevationOffset ?? 0) + 0.9,
                this.activeFacility.z
            );
        }
        // Camera movement does not change world transforms of the station or its context.
        this.scene.updateMatrixWorld();
        this.renderer.shadowMap.needsUpdate = !this.draggingExplode;
    }

    /** Retain the full framing envelope until regional focus or physical display elevations change. */
    private framingPoints(): T.Vector3[] {
        if (this.fitEnvelope) {
            return this.fitEnvelope;
        }
        this.fitEnvelope = this.regionFramingPoints(this.state.focusStation, id => this.levelY(id));
        return this.fitEnvelope;
    }

    /** Share the full district bounds between manual fitting and the tour's overview. */
    private regionFramingPoints(station: MapViewState['focusStation'], elevation: (id: LevelId) => number): T.Vector3[] {
        const envelope = cameraEnvelope(this.layout, this.levels, { level: 'all', focusStation: station }, elevation);
        if (!station) {
            for (const b of geographicBuildings) {
                if (b.wheel) {
                    envelope.push(new T.Vector3(b.wheel.center.x, b.wheel.centerHeight + b.wheel.radius + 2, b.wheel.center.z));
                }
                for (const v of b.volumes) {
                    for (const p of v.outline) {
                        envelope.push(new T.Vector3(p.x, v.top, p.z));
                    }
                }
            }
        }
        return envelope;
    }

    /** Fit the current view or reuse the frozen orbit span and centre verbatim. */
    private cameraTarget(): { center: T.Vector3; span: number } {
        if (this.manualView && !this.refreshShareZoomBounds) {
            return { center: this.manualView.center.clone(), span: this.manualView.span };
        }
        if (this.draggingExplode && this.framing) {
            return { center: this.framing.center.clone(), span: this.framing.span };
        }
        const { center, usable, baseSpan, minimumZoom } = this.cameraFit();
        this.baseSpan = baseSpan;
        this.minimumZoom = minimumZoom;
        if (this.refreshShareZoomBounds && this.manualView) {
            // The same world span can correspond to a different zoom ratio on the receiving viewport.
            this.zoomValue = baseSpan / this.manualView.span;
        }
        this.refreshShareZoomBounds = false;
        if (this.manualView) {
            return { center: this.manualView.center.clone(), span: this.manualView.span };
        }
        this.zoomValue = clampCameraZoom(this.zoomValue, this.minimumZoom);
        const span = baseSpan / this.zoomValue;
        center.copy(facilityCameraCenter(center, span, this.width, this.height, usable));
        if (this.locatingFacility && this.activeFacility) {
            const target = facilityCameraCenter(this.selected.position, span, this.width, this.height, usable);
            this.pan.add(target.clone().sub(center));
            center.copy(target);
        }
        return { center, span };
    }

    /** Project the current envelope onto the actual camera and visible viewport before limiting zoom. */
    private cameraFit() {
        const mobile = this.width < 761;
        const viewportHeight = Math.max(1, this.height);
        const envelope = this.framingPoints();
        const center = new T.Box3().setFromPoints(envelope).getCenter(new T.Vector3());
        const { right, up } = viewBasis();
        const centerX = center.dot(right);
        const centerY = center.dot(up);
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const point of envelope) {
            const x = point.dot(right) - centerX;
            const y = point.dot(up) - centerY;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
        center.addScaledVector(right, (minX + maxX) / 2).addScaledVector(up, (minY + maxY) / 2).add(this.pan);
        const usable = this.usableViewport();
        const usableWidth = mobile ? this.width * 0.91 : usable.width;
        const baseSpan = Math.max(55, (maxY - minY) * 1.18, (maxX - minX) * viewportHeight / Math.max(1, usableWidth) * 1.12);
        const minimumZoom = minimumMapZoom(baseSpan, maxY - minY, viewportHeight, usable.height);
        return { center, usable, baseSpan, minimumZoom };
    }

    /** Share the unobscured screen rectangle between facility localization and route playback. */
    private usableViewport() {
        const viewport = this.host.getBoundingClientRect();
        const sidebar = this.host.parentElement?.querySelector('.sidebar')?.getBoundingClientRect();
        return facilityFocusRect(viewport, sidebar, this.width < 761);
    }

    /** Record visibility of the geometry affected by a guided floor cut. */
    private captureTourLayers(): Map<T.Object3D, boolean> {
        const roots = [
            ...this.models.groups.values(), ...this.models.connectors.map(connector => connector.group),
            this.models.jrConcourseReference,
            this.context.roads, this.context.buildings, this.geographicExteriors, this.models.roof,
            ...this.models.canopies.map(({ model }) => model), ...this.models.basementBuildingFloors
        ];
        return new Map(roots.map(object => [object, object.visible]));
    }

    /** Track the displayed landings of the current segment, including local offsets and expansion. */
    private playbackPosition({ from, to, fraction, x, z }: RoutePlaybackSample): T.Vector3 {
        const levelY = (id: LevelId) => this.levelY(id);
        const a = routePointElevation(from, levelY);
        const b = routePointElevation(to, levelY);
        return new T.Vector3(x, T.MathUtils.lerp(a, b, fraction), z);
    }

    /** Render camera motion independently of static geometry, shading and layer visibility. */
    private render(): void {
        this.frame = 0;
        this.gestures.applyTouchGesture();
        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const now = performance.now();
        window.clearTimeout(this.trainWakeup);
        const tour = this.tour;
        const previousTour = tour?.last;
        window.clearTimeout(this.tourWakeup);
        let tourFrame: ReturnType<GuidedTour['advance']> | undefined;
        if (tour) {
            // A stalled or backgrounded frame may finish a hold without skipping the next camera move.
            const remainingHold = previousTour && !previousTour.moving && !previousTour.turning ? previousTour.wait : 0;
            tour.time += Math.min(now - tour.sampledAt, remainingHold + 50);
            tour.sampledAt = now;
            tourFrame = tour.player.advance(tour.time, reducedMotion, this.width, this.height, this.usableViewport());
            tour.last = tourFrame;
            if (previousTour?.chapter !== tourFrame.chapter) {
                this.onTourChapter?.(tourFrame.chapter);
            }
            this.modelsDirty ||= previousTour?.level !== tourFrame.level || previousTour?.station !== tourFrame.station ||
                previousTour?.overview !== tourFrame.overview || previousTour?.ground !== tourFrame.ground;
            this.orientationChanged ||= tourFrame.yaw !== previousTour?.yaw || tourFrame.pitch !== previousTour?.pitch;
            if (previousTour && previousTour.opacity < 1 && tourFrame.opacity === 1) {
                this.renderer.shadowMap.needsUpdate = true;
            }
        }
        const { value, animate } = tourFrame ? { value: tourFrame.explode, animate: false } :
            advanceExplode(this.displayedExplode, this.playback ? 0 : this.state.explode, this.immediateExplode, reducedMotion);
        this.immediateExplode = false;
        const changedElevation = value !== this.displayedExplode;
        if (changedElevation) {
            this.displayedExplode = value;
            this.fitEnvelope = undefined;
        }
        const playback = this.playback;
        let playbackFrame: ReturnType<RoutePlaybackView['advance']> | undefined;
        if (playback?.status === 'playing') {
            const { level, ceiling } = playback.sample;
            const before = cameraOffset.clone();
            playbackFrame = playback.advance(
                now, reducedMotion, this.width, this.height, this.usableViewport(),
                sample => this.playbackPosition(sample), this.framing
            );
            this.modelsDirty ||= level !== playback.sample.level || ceiling !== playback.sample.ceiling;
            this.orientationChanged ||= before.distanceToSquared(cameraOffset) > 1e-8;
        }
        const state = tourFrame
            ? { ...this.state, focusStation: tourFrame.station, level: tourFrame.level, roof: tourFrame.overview, route: null }
            : playback ? { ...this.state, level: playback.sample.level.id, roof: false } : this.state;
        const changedModels = this.modelsDirty;
        const beforeCut = changedModels && tourFrame && tourFrame.opacity < 1 &&
            (previousTour?.level !== tourFrame.level || previousTour?.overview !== tourFrame.overview || previousTour?.ground !== tourFrame.ground)
            ? this.captureTourLayers() : undefined;
        if (changedModels) {
            this.updateModels(state, tourFrame?.ground);
        }
        if (changedModels || changedElevation || previousTour?.moving && !tourFrame?.moving) {
            this.updateModelElevations(state, this.draggingExplode && !tourFrame && !changedModels);
        }
        if (beforeCut) {
            this.tourLayerFade.begin(beforeCut);
        }
        const control = this.controlTransition;
        const previousOffset = control && cameraOffset.clone();
        if (control) {
            cameraOffset.copy(control.offset);
        }
        const target = tourFrame ?? playbackFrame ?? this.cameraTarget();
        let { center } = target;
        let span = target.span;
        this.targetCenter = center.clone();
        if (control) {
            const unchanged = control.from.span === span && control.from.center.equals(center) && control.from.offset.equals(cameraOffset);
            const progress = reducedMotion || unchanged ? 1 : (now - control.startedAt) / control.duration;
            const pose = interpolateCameraPose(control.from, { center, span, offset: cameraOffset }, progress);
            center = pose.center;
            span = pose.span;
            cameraOffset.copy(pose.offset);
            this.orientationChanged ||= previousOffset !== undefined && !previousOffset.equals(cameraOffset);
            if (progress >= 1) {
                this.controlTransition = undefined;
            }
        } else if (this.framing && this.focusTransition && !reducedMotion) {
            this.framing.center.lerp(center, 0.24);
            this.framing.span += (span - this.framing.span) * 0.24;
            this.focusTransition = this.framing.center.distanceTo(center) > 0.02 || Math.abs(this.framing.span - span) > 0.02;
            if (this.focusTransition) {
                center.copy(this.framing.center);
                span = this.framing.span;
            }
        }
        else {
            this.focusTransition = false;
        }
        if (this.orientationChanged) {
            this.orientationChanged = false;
            window.dispatchEvent(new Event('map-orientation'));
        }
        this.framing = { center: center.clone(), span };
        const worldUnitsPerPixel = span / Math.max(1, this.height);
        this.selectionMarker.update(now, reducedMotion, worldUnitsPerPixel);
        if (this.selected.visible) {
            this.selected.updateMatrixWorld();
        }
        if (playback) {
            const { sample } = playback;
            this.routePositionMarker.position.copy(this.playbackPosition(sample));
            this.routePositionMarker.position.y += routeBeamRadius(sample.from, sample.to);
            this.routePositionMarker.updateMatrixWorld(true);
            if (playbackFrame && playback.status === 'finished') {
                this.freezeFraming(this.framing);
                this.onRoutePlayback?.('finished');
            }
        }
        const aspect = this.width / Math.max(1, this.height);
        this.camera.left = -span * aspect / 2;
        this.camera.right = span * aspect / 2;
        this.camera.top = span / 2;
        this.camera.bottom = -span / 2;
        this.camera.position.copy(center).addScaledVector(cameraOffset, 6);
        this.camera.lookAt(center);
        this.camera.updateProjectionMatrix();
        const trainWait = this.models.loopTrain?.update(now - (this.trainEpoch ?? now), reducedMotion) ?? Infinity;
        this.tourLayerFade.draw(tourFrame?.opacity ?? 1, () => this.renderer.render(this.scene, this.camera));
        if (this.models.loopTrain) {
            this.trainView.setFromProjectionMatrix(this.trainViewProjection.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
            this.trainInLastDraw = this.models.loopTrain.intersectsView(this.trainView);
        }
        if (changedModels && this.hoverPoint) {
            this.setPointerHover(this.hoverPoint);
        }
        // While the tour owns the camera, it controls when station labels are useful.
        const settled = playback?.status !== 'playing' && !animate && !this.focusTransition && !this.controlTransition &&
            !this.draggingExplode && !this.gestures.isMoving;
        const showLabels = settled && (tourFrame?.showLabels ?? true);
        this.labels.setVisible(showLabels);
        if (!showLabels) {
            this.nextTourLabelUpdate = 0;
        }
        if (showLabels && (!tourFrame?.turning || changedModels || now >= this.nextTourLabelUpdate)) {
            this.nextTourLabelUpdate = now + 80;
            const facility = this.activeFacility;
            const selection = this.selected.visible && facility
                ? { text: facility.mapLabel ?? facility.name, position: this.selectionMarker.labelAnchor(), kind: facility.kind }
                : undefined;
            this.labels.update({
                state,
                levels: this.levels,
                levelY: id => this.levelY(id),
                camera: this.camera,
                roof: this.models.roof,
                rect: this.host.getBoundingClientRect(),
                width: this.width,
                height: this.height,
                zoom: this.zoomValue,
                occluders: this.labelOccluders,
                selection,
                guided: !!tour
            });
        } else if (showLabels && tourFrame?.turning) {
            this.labels.moveGuided(this.camera);
        }
        this.reportShareCamera(center, span, settled && !playback && !tour);
        if (tourFrame?.moving || tourFrame?.turning || playback?.status === 'playing' || animate ||
            this.focusTransition || this.controlTransition || (this.selected.visible && !reducedMotion)) {
            this.requestRender();
        } else {
            if (tourFrame) {
                this.tourWakeup = window.setTimeout(() => this.requestRender(), Math.max(1, tourFrame.wait));
            }
            this.scheduleTrainFrame(trainWait);
        }
    }
}
