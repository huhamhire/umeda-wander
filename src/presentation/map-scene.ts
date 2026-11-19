import { MapModels } from './models/map-models.ts';
import { SceneLabels } from './labels/scene-labels.ts';
import { MapGestures } from './camera/map-gestures.ts';
import { RouteModel } from './models/stations/route-model.ts';
import { orbitAboutPoint } from './camera/orbit-view.ts';
import { geographicBuildings } from '../infrastructure/buildings/index.ts';
import { buildGeographicBuilding } from './models/buildings/geographic-building-model.ts';
import { buildGeographicContext, setGeographicContextTheme } from './models/public-areas/geographic-context.ts';
import * as T from 'three';
import type { Facility, Level, LevelId, RouteNode, StationLayout } from '../domain/map/model.ts';
import type { MapViewState } from '../application/map-session.ts';
import { displayElevation } from '../application/exploration/display-elevation.ts';
import { allowsGroundLayer, viewLayerRole } from '../application/exploration/view-layer.ts';
import { LayerAppearance } from './appearance/layer-appearance.ts';
import { cameraOffset, viewBasis, resetView } from './camera/view-orientation.ts';
import { visibleElevatorConnections } from '../application/connections/elevator-visibility.ts';
import { advanceExplode } from './appearance/explode-transition.ts';
import { cameraEnvelope } from './camera/camera-framing.ts';
import { facilityFocusRect, facilityCameraCenter, minimumMapZoom } from './camera/facility-focus.ts';
import { SelectionMarker } from './components/selection-marker.ts';

export interface MapCameraSnapshot {
    offset: [number, number, number];
    pan: [number, number, number];
    zoom: number;
    manual?: { center: [number, number, number]; span: number };
    facility?: string;
    followFacility: boolean;
}

export class MapScene {
    private models: MapModels;
    private labels: SceneLabels;
    private routeModel: RouteModel;
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
    private state: MapViewState;
    private displayedExplode: number;
    private immediateExplode = false;
    private draggingExplode = false;
    private modelsDirty = true;
    private fitEnvelope?: T.Vector3[];
    private fullShafts = new Set<string>();
    private orientationChanged = false;
    private manualView?: {
        center: T.Vector3;
        span: number;
    };
    private framing?: {
        center: T.Vector3;
        span: number;
    };
    private focusTransition = false;
    private locatingFacility = false;
    private targetCenter?: T.Vector3;
    private zoomValue = 1;
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
        private onSelect: (facility?: Facility) => void
    ) {
        this.state = { ...initial };
        this.displayedExplode = initial.explode;
        this.routeModel = new RouteModel(nodes);
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
        this.labels = new SceneLabels(labelHost, this.models.labels);
        this.context = buildGeographicContext(this.models.openings.filter(o => this.levels.find(l => l.id === o.level)!.y === 0).map(o => o.outline));
        this.scene.add(this.context.roads, this.context.buildings);
        for (const building of geographicBuildings) {
            const model = buildGeographicBuilding(building, this.layout.exteriorOpenings);
            this.geographicExteriors.add(model);
        }
        this.scene.add(this.geographicExteriors);
        this.scene.add(this.models.roof, this.routeModel.group, this.selected);
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
            beginOrbit: (x, y) => this.beginOrbit(x, y),
            rotate: (pivot, yawRadians, pitchRadians) => {
                if (!this.manualView) {
                    return false;
                }
                orbitAboutPoint(cameraOffset, this.manualView.center, pivot, yawRadians, pitchRadians);
                this.orientationChanged = true;
                return true;
            },
            beginDrag: () => {
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
            select: (x, y) => this.selectAt(x, y),
            invalidate: () => this.requestRender()
        });
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(host);
        this.resize();
    }

    /** Freeze the orthographic span and pick the gesture pivot from visible geometry. */
    private beginOrbit(clientX: number, clientY: number): T.Vector3 | undefined {
        if (!this.framing) {
            return undefined;
        }
        this.locatingFacility = false;
        this.focusTransition = false;
        this.manualView = { center: this.framing.center.clone(), span: this.framing.span };
        this.setPointerRay(clientX, clientY);
        const hit = this.raycaster.intersectObjects(this.scene.children, true).find(item => {
            for (let object: T.Object3D | null = item.object; object; object = object.parent) {
                if (!object.visible || object === this.selected || object === this.routeModel.group) {
                    return false;
                }
            }
            const material = (item.object as T.Mesh).material;
            return material && !Array.isArray(material) && material.visible && !(material instanceof T.ShadowMaterial);
        });
        const fallback = new T.Vector3();
        const plane = new T.Plane(new T.Vector3(0, 1, 0), -this.framing.center.y);
        return hit?.point ?? this.raycaster.ray.intersectPlane(plane, fallback) ?? this.framing.center;
    }

    /** Convert canvas coordinates into the shared raycaster used by orbit pivots and facility picking. */
    private setPointerRay(clientX: number, clientY: number): void {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.raycaster.setFromCamera(
            new T.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1),
            this.camera
        );
    }

    /** Pick only facilities on current or normal floors; lower context floors cannot intercept clicks. */
    private selectAt(clientX: number, clientY: number): void {
        this.setPointerRay(clientX, clientY);
        const candidates = this.models.pickables.filter(object => object.parent?.visible &&
            ['normal', 'current'].includes(viewLayerRole(this.levels, this.state, (object.userData.facility as Facility).level)));
        const hit = this.raycaster.intersectObjects(candidates, false)[0];
        this.onSelect(hit?.object.userData.facility as Facility | undefined);
    }

    /** Release input, labels, pending redraw and WebGL resources when this map is unmounted. */
    dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.gestures.dispose();
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
     * Receive exploration state and request a redraw; immediate expansion cancels camera motion that would lag the slider.
     */
    update(state: MapViewState, options: {
        immediateExplode?: boolean;
    } = {}): void {
        const floorChanged = this.state.level !== state.level;
        const stationChanged = this.state.focusStation !== state.focusStation;
        this.modelsDirty ||= floorChanged || stationChanged ||
            this.state.roof !== state.roof || this.state.route !== state.route;
        if (floorChanged) {
            this.locatingFacility = false;
        }
        if (stationChanged) {
            this.manualView = undefined;
            this.focusTransition = true;
            this.fitEnvelope = undefined;
        } else if (floorChanged && this.framing) {
            // Keep the frame actually on screen, including an interrupted facility transition.
            this.manualView = { center: this.framing.center.clone(), span: this.framing.span };
            this.focusTransition = false;
        }
        if (options.immediateExplode) {
            this.focusTransition = false;
        }
        this.state = { ...state };
        this.immediateExplode ||= options.immediateExplode === true;
        this.requestRender();
    }

    /** Skip expensive detail rebuilds during slider input and restore the settled scene on release. */
    setExplodeDragging(dragging: boolean): void {
        if (this.draggingExplode === dragging) {
            return;
        }
        this.draggingExplode = dragging;
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
            this.manualView = { center: this.framing.center.clone(), span: this.framing.span };
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
    /** Capture navigation intent and manual camera framing for a locale reload. */
    snapshotCamera(): MapCameraSnapshot {
        return {
            offset: cameraOffset.toArray(),
            pan: this.pan.toArray(),
            zoom: this.zoomValue,
            manual: this.manualView && { center: this.manualView.center.toArray(), span: this.manualView.span },
            facility: this.activeFacility?.id,
            followFacility: this.locatingFacility
        };
    }
    /** Restore the camera and marker without jumping or restarting the focus transition. */
    restoreCamera(snapshot: MapCameraSnapshot): void {
        cameraOffset.fromArray(snapshot.offset);
        this.pan.fromArray(snapshot.pan);
        this.zoomValue = snapshot.zoom;
        if (snapshot.manual) {
            this.manualView = {
                center: new T.Vector3().fromArray(snapshot.manual.center),
                span: snapshot.manual.span
            };
        }
        this.activeFacility = this.facilities.find(facility => facility.id === snapshot.facility);
        this.locatingFacility = snapshot.followFacility && this.activeFacility !== undefined;
        window.dispatchEvent(new Event('map-orientation'));
        this.invalidateModels();
    }
    /**
     * Scale the orthographic view within the limits of the currently usable viewport.
     */
    zoom(factor: number, pivot?: T.Vector3): void {
        const previousZoom = this.zoomValue;
        this.focusTransition = false;
        this.zoomValue = T.MathUtils.clamp(this.zoomValue * factor, this.minimumZoom, Math.max(16, this.minimumZoom * 16));
        if (this.manualView) {
            const spanRatio = previousZoom / this.zoomValue;
            this.manualView.span *= spanRatio;
            if (pivot) {
                this.manualView.center.lerp(pivot, 1 - spanRatio);
            }
        }
        this.requestRender();
    }
    /**
     * Clear manual pan and zoom, optionally restoring the north-facing orientation.
     */
    reset(resetOrientation = false): void {
        this.manualView = undefined;
        this.gestures.cancelOrbit();
        if (resetOrientation) {
            resetView();
            window.dispatchEvent(new Event('map-orientation'));
        }
        this.locatingFacility = false;
        this.focusTransition = false;
        this.zoomValue = 1;
        this.pan.set(0, 0, 0);
        this.activeFacility = undefined;
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
        this.renderer.setSize(this.width, this.height);
        this.requestRender();
    }
    /**
     * Coalesce redraw requests into a single pending animation frame.
     */
    private requestRender(): void {
        if (!this.disposed && !this.frame) {
            this.frame = requestAnimationFrame(() => this.render());
        }
    }

    /** Draw synchronously once so the page can report first-frame errors and end loading accurately. */
    renderFirstFrame(): void {
        cancelAnimationFrame(this.frame);
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
    private updateModels(): void {
        this.modelsDirty = false;
        for (const [id, group] of this.models.groups) {
            const role = viewLayerRole(this.levels, this.state, id);
            group.visible = role !== 'hidden';
            this.appearance.apply(group, role === 'context', this.state.focusStation);
        }
        this.fullShafts = visibleElevatorConnections(this.layout.connections, this.levels, this.state.level);
        for (const connector of this.models.connectors) {
            const fullShaft = this.fullShafts.has(connector.connection.id);
            if (!fullShaft && viewLayerRole(this.levels, this.state, connector.connection.from.level) === 'hidden' && viewLayerRole(this.levels, this.state, connector.connection.to.level) === 'hidden') {
                connector.group.visible = false;
                continue;
            }
            connector.group.visible = true;
            const { from, to } = connector.connection;
            const roles = [from, to].map(p => viewLayerRole(this.levels, this.state, p.level));
            const owners = [from, to].map(p => this.levels.find(l => l.id === p.level)!.station ?? 'jr-osaka');
            const owner = this.activeFacility?.connectionId === connector.connection.id ? this.state.focusStation ?? null :
                connector.connection.blockId || connector.connection.evidence.source === 'district' ? null : owners[0] === owners[1] ? owners[0]! : null;
            this.appearance.apply(
                connector.group,
                !roles.some(role => role === 'current' || role === 'normal'),
                this.state.focusStation,
                owner
            );
        }
        const canShowGround = allowsGroundLayer(this.levels, this.state);
        const groundVisible = this.roadsVisible && canShowGround;
        this.context.roads.visible = groundVisible;
        this.context.buildings.visible = groundVisible;
        for (const floor of this.models.geographicBuildingFloors) {
            floor.visible = groundVisible;
        }
        this.geographicExteriors.visible = groundVisible && this.state.roof && this.state.level === 'all';
        this.appearance.apply(this.geographicExteriors, false, this.state.focusStation, null);
        this.models.roof.visible = canShowGround && this.state.roof && this.state.level === 'all';
        for (const canopy of this.models.canopies) {
            canopy.visible = this.state.roof;
        }
        this.appearance.apply(this.models.roof, false, this.state.focusStation, 'jr-osaka');
        this.selected.visible = !!this.activeFacility && ['normal', 'current'].includes(viewLayerRole(this.levels, this.state, this.activeFacility.level));
    }

    /** Move floor groups and keep equipment attached without reapplying materials or visibility. */
    private updateModelElevations(preview: boolean): void {
        const levelY = (id: LevelId) => this.levelY(id);
        for (const [id, group] of this.models.groups) {
            group.position.y = levelY(id);
        }
        for (const connector of this.models.connectors) {
            if (connector.group.visible) {
                connector.update(levelY, this.state.level, this.fullShafts.has(connector.connection.id), preview);
            }
        }
        this.models.roof.position.y = 26 + this.displayedExplode * 56;
        if (this.state.route || this.routeModel.group.visible) {
            this.routeModel.update(this.state.route, levelY);
        }
        this.routeModel.group.visible = !!this.state.route;
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
        const envelope = cameraEnvelope(this.layout, this.levels, this.state, id => this.levelY(id));
        if (!this.state.focusStation) {
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
        this.fitEnvelope = envelope;
        return envelope;
    }

    /** Fit the current view or reuse the frozen orbit span and centre verbatim. */
    private cameraTarget(): { center: T.Vector3; span: number } {
        if (this.manualView) {
            return { center: this.manualView.center.clone(), span: this.manualView.span };
        }
        if (this.draggingExplode && this.framing) {
            return { center: this.framing.center.clone(), span: this.framing.span };
        }
        const mobile = this.width < 761;
        const viewportHeight = Math.max(1, this.height);
        const usableWidth = mobile ? this.width * 0.91 : Math.max(this.width * 0.55, this.width - 380);
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
        const viewport = this.host.getBoundingClientRect();
        const sidebar = this.host.parentElement?.querySelector('.sidebar')?.getBoundingClientRect();
        const usable = facilityFocusRect(viewport, sidebar, mobile);
        const baseSpan = Math.max(55, (maxY - minY) * 1.18, (maxX - minX) * viewportHeight / Math.max(1, usableWidth) * 1.12);
        this.minimumZoom = minimumMapZoom(baseSpan, maxY - minY, viewportHeight, usable.height);
        this.zoomValue = T.MathUtils.clamp(this.zoomValue, this.minimumZoom, Math.max(16, this.minimumZoom * 16));
        const span = baseSpan / this.zoomValue;
        if (!mobile) {
            center.addScaledVector(right, -Math.min(150, this.width * 0.13) * span / viewportHeight);
        }
        else {
            center.copy(facilityCameraCenter(center, span, this.width, this.height, usable));
        }
        if (this.locatingFacility && this.activeFacility) {
            const target = facilityCameraCenter(this.selected.position, span, this.width, this.height, usable);
            this.pan.add(target.clone().sub(center));
            center.copy(target);
        }
        return { center, span };
    }

    /** Render camera motion independently of static geometry, shading and layer visibility. */
    private render(): void {
        this.frame = 0;
        this.gestures.applyTouchGesture();
        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const { value, animate } = advanceExplode(this.displayedExplode, this.state.explode, this.immediateExplode, reducedMotion);
        this.immediateExplode = false;
        const changedElevation = value !== this.displayedExplode;
        if (changedElevation) {
            this.displayedExplode = value;
            this.fitEnvelope = undefined;
        }
        const changedModels = this.modelsDirty;
        if (changedModels) {
            this.updateModels();
        }
        if (changedModels || changedElevation) {
            this.updateModelElevations(this.draggingExplode && !changedModels);
        }
        if (this.orientationChanged) {
            this.orientationChanged = false;
            window.dispatchEvent(new Event('map-orientation'));
        }
        const target = this.cameraTarget();
        const { center } = target;
        let span = target.span;
        this.targetCenter = center.clone();
        if (this.framing && this.focusTransition && !reducedMotion) {
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
        this.framing = { center: center.clone(), span };
        const worldUnitsPerPixel = span / Math.max(1, this.height);
        this.selectionMarker.update(performance.now(), reducedMotion, worldUnitsPerPixel);
        if (this.selected.visible) {
            this.selected.updateMatrixWorld();
        }
        const aspect = this.width / Math.max(1, this.height);
        this.camera.left = -span * aspect / 2;
        this.camera.right = span * aspect / 2;
        this.camera.top = span / 2;
        this.camera.bottom = -span / 2;
        this.camera.position.copy(center).addScaledVector(cameraOffset, 6);
        this.camera.lookAt(center);
        this.camera.updateProjectionMatrix();
        this.renderer.render(this.scene, this.camera);
        // Far views expose many more labels and occluders during a drag. Restore them when it ends.
        const showLabels = !this.draggingExplode && (!this.gestures.isMoving || worldUnitsPerPixel < 0.7);
        this.labels.setVisible(showLabels);
        if (showLabels) {
            const facility = this.activeFacility;
            const selection = this.selected.visible && facility
                ? { text: facility.name, position: this.selectionMarker.labelAnchor(), kind: facility.kind }
                : undefined;
            this.labels.update({
                state: this.state,
                levels: this.levels,
                levelY: id => this.levelY(id),
                camera: this.camera,
                roof: this.models.roof,
                rect: this.host.getBoundingClientRect(),
                width: this.width,
                height: this.height,
                zoom: this.zoomValue,
                occluders: this.labelOccluders,
                selection
            });
        }
        if (animate || this.focusTransition || (this.selected.visible && !reducedMotion)) {
            this.requestRender();
        }
    }
}
