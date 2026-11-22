import * as T from 'three';
import type { Facility, FacilityKind, Level, LevelId, StationId } from '../../domain/map/model.ts';
import type { MapViewState } from '../../application/map-session.ts';
import { viewLayerRole } from '../../application/exploration/view-layer.ts';
import { isRegionMuted } from '../../application/exploration/region-focus.ts';
import { createFacilityIcon } from '../components/facility-icon.ts';
import { LabelOcclusion, visibleLabelOccluders } from './label-occlusion.ts';

export interface SceneLabelDefinition {
    text: string;
    accessibleName?: string;
    position: T.Vector3;
    level?: LevelId;
    roof?: boolean;
    emphasis?: boolean;
    kind?: FacilityKind;
    owner?: StationId | null;
    surface?: T.Object3D;
}

interface MapLabel extends SceneLabelDefinition {
    element: HTMLElement;
}

type LabelViewport = Pick<SceneLabelView, 'rect' | 'width' | 'height'>;
type LabelSize = { w: number; h: number };

export interface SceneLabelView {
    state: MapViewState;
    levels: Level[];
    levelY: (id: LevelId) => number;
    camera: T.OrthographicCamera;
    roof: T.Group;
    rect: DOMRect;
    width: number;
    height: number;
    zoom: number;
    occluders: T.Object3D[];
    guided?: boolean;
    selection?: Pick<SceneLabelDefinition, 'text' | 'position'> & { kind: FacilityKind };
}

/** Move an absolute label without changing its layout or measured size. */
function positionLabel(label: MapLabel, x: number, y: number): void {
    label.element.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) translate(-50%, -50%)`;
}

/** Apply the same icon and name treatment to every facility label. */
function setLabelContent(element: HTMLElement, { text, kind }: Pick<SceneLabelDefinition, 'text' | 'kind'>): void {
    element.classList.toggle('facility-label', kind !== undefined);
    if (kind) {
        element.replaceChildren(createFacilityIcon(kind), text);
    }
    else {
        element.textContent = text;
    }
}

/** Own screen labels, their occlusion and collision ordering independently of scene geometry. */
export class SceneLabels {
    private readonly host: HTMLElement;
    private readonly labels: MapLabel[] = [];
    private filteredLabels?: MapLabel[];
    private walkingLabels?: MapLabel[];
    private readonly labelOcclusion = new LabelOcclusion();
    private selectionElement?: HTMLElement;
    private selectionKind?: FacilityKind;
    private guidedCandidates?: { station: MapViewState['focusStation']; level: MapViewState['level']; labels: MapLabel[] };
    private guidedViewport?: LabelViewport;
    private readonly guidedPlacements: { label: MapLabel; anchor: T.Vector3; offsetY: number }[] = [];
    private readonly guidedPoint = new T.Vector3();
    private guidedSizes = new WeakMap<HTMLElement, LabelSize>();
    private readonly fonts = document.fonts;
    /** Discard dimensions after the browser replaces fallback fonts. */
    private readonly invalidateGuidedSizes = () => {
        this.guidedSizes = new WeakMap();
    };

    /** Create DOM labels from model-owned anchors without copying station layout logic. */
    constructor(host: HTMLElement, definitions: readonly SceneLabelDefinition[]) {
        this.host = host;
        this.fonts?.addEventListener('loadingdone', this.invalidateGuidedSizes);
        for (const definition of definitions) {
            this.labels.push(this.createLabel(definition));
        }
    }

    /** Attach a label and keep its DOM node together with its map anchor. */
    private createLabel(definition: SceneLabelDefinition, pick?: () => void): MapLabel {
        const element = pick ? document.createElement('button') : document.createElement('div');
        element.className = 'map-label' + (definition.emphasis ? ' emphasis' : '');
        if (pick) {
            element.setAttribute('type', 'button');
            element.setAttribute('aria-label', definition.accessibleName ?? definition.text);
            element.classList.add('map-label-pick');
            element.addEventListener('click', pick);
        }
        setLabelContent(element, definition);
        this.host.append(element);
        return { ...definition, element };
    }

    /** Hide or show the overlay as one layer without touching individual label styles. */
    setVisible(visible: boolean): void {
        const hidden = !visible;
        if (this.host.hidden !== hidden) {
            this.host.hidden = hidden;
        }
    }

    /** Rebuild the filtered labels only when the facility panel's filters change. */
    setFacilityFilter(facilities?: readonly Facility[]): void {
        this.filteredLabels?.forEach(label => label.element.remove());
        this.filteredLabels = facilities?.map(facility => {
            const label = this.createLabel({
                text: facility.mapLabel ?? facility.name,
                kind: facility.kind,
                level: facility.level,
                position: new T.Vector3(facility.x, 3.15 + (facility.elevationOffset ?? 0), facility.z)
            });
            label.element.hidden = true;
            return label;
        });
    }

    /** Temporarily expose labelled map targets as buttons in walking pick mode. */
    setWalkingTargets(targets?: readonly (SceneLabelDefinition & { id: string })[], onPick?: (id: string) => void): void {
        this.walkingLabels?.forEach(label => label.element.remove());
        this.walkingLabels = onPick && targets?.map(target => {
            const label = this.createLabel(target, () => onPick(target.id));
            label.element.hidden = true;
            return label;
        });
        this.host.setAttribute('aria-hidden', String(!this.walkingLabels));
    }

    /** Create one reusable detail label only when a facility is selected. */
    private selectionLabel(definition: SceneLabelView['selection']): MapLabel | undefined {
        if (!definition) {
            if (this.selectionElement) {
                this.selectionElement.hidden = true;
            }
            return undefined;
        }
        if (!this.selectionElement) {
            this.selectionElement = this.createLabel({ ...definition, emphasis: true }).element;
            this.selectionKind = definition.kind;
        }
        else if (this.selectionElement.textContent !== definition.text || this.selectionKind !== definition.kind) {
            this.selectionKind = definition.kind;
            setLabelContent(this.selectionElement, definition);
            this.guidedSizes.delete(this.selectionElement);
        }
        return { ...definition, element: this.selectionElement, emphasis: true };
    }

    /** Reuse station priorities while the camera orbits the same floor. */
    private guidedOrder(state: MapViewState, muted: (label: MapLabel) => boolean, compare: (a: MapLabel, b: MapLabel) => number): MapLabel[] {
        if (this.guidedCandidates && this.guidedCandidates.station === state.focusStation && this.guidedCandidates.level === state.level) {
            return this.guidedCandidates.labels;
        }
        const labels = this.labels.filter(label => {
            if (muted(label)) {
                label.element.hidden = true;
                return false;
            }
            return true;
        }).sort(compare);
        this.guidedCandidates = { station: state.focusStation, level: state.level, labels };
        return labels;
    }

    /** Follow the live camera between full occlusion and collision passes. */
    moveGuided(camera: T.OrthographicCamera): void {
        if (!this.guidedViewport) {
            return;
        }
        const { rect, width, height } = this.guidedViewport;
        for (const { label, anchor, offsetY } of this.guidedPlacements) {
            const point = this.guidedPoint.copy(anchor).project(camera);
            positionLabel(label, rect.left + (point.x + 1) * width / 2, rect.top + (1 - point.y) * height / 2 - offsetY);
        }
    }

    /** Project, mute, occlude and deconflict labels using one DOM measurement pass. */
    update(view: SceneLabelView): void {
        const { state, levels, levelY, camera, roof, rect, width, height, zoom } = view;
        this.guidedPlacements.length = 0;
        if (view.guided) {
            if (this.guidedViewport?.width !== width || this.guidedViewport.height !== height) {
                this.invalidateGuidedSizes();
            }
            this.guidedViewport = { rect, width, height };
        } else {
            this.guidedCandidates = undefined;
        }
        const mobile = width < 761;
        const occupied: {
            x: number;
            y: number;
            w: number;
            h: number;
        }[] = [];
        const occluders = visibleLabelOccluders(view.occluders);
        const labelMuted = (label: MapLabel) => isRegionMuted(
            state.focusStation,
            label.owner !== undefined ? label.owner : label.roof ? 'jr-osaka' : levels.find(l => l.id === label.level)?.station ?? 'jr-osaka'
        );
        const priority = (label: MapLabel) => Number(!labelMuted(label)) * 8 + Number(label.level && viewLayerRole(levels, state, label.level) === 'current') * 4 + Number(label.element.classList.contains('emphasis'));
        const selection = this.selectionLabel(view.selection);
        const walking = view.guided ? undefined : this.walkingLabels;
        const filtered = view.guided ? undefined : this.filteredLabels;
        if (selection || (!view.guided && (this.walkingLabels || this.filteredLabels))) {
            for (const label of this.labels) {
                label.element.hidden = true;
            }
        }
        if (selection || this.walkingLabels || view.guided) {
            for (const label of this.filteredLabels ?? []) {
                label.element.hidden = true;
            }
        }
        if (view.guided) {
            for (const label of this.walkingLabels ?? []) {
                label.element.hidden = true;
            }
        }
        const compare = (a: MapLabel, b: MapLabel) => priority(b) - priority(a);
        const orderedLabels = selection ? [selection] : view.guided
            ? this.guidedOrder(state, labelMuted, compare) : [...walking ?? filtered ?? this.labels].sort(compare);
        const placements = orderedLabels.flatMap(label => {
            const role = label.level ? viewLayerRole(levels, state, label.level) : 'normal';
            let visible = label.roof ? roof.visible : role !== 'hidden';
            if (label.surface && !label.surface.visible) {
                visible = false;
            }
            if (view.guided && labelMuted(label)) {
                visible = false;
            }
            label.element.classList.toggle('context', role === 'context' || (label !== selection && labelMuted(label)));
            if (role === 'context' && !label.element.classList.contains('emphasis')) {
                visible = false;
            }
            if (!walking && !filtered && (mobile || state.level === 'all') && zoom < 1.2 && !label.element.classList.contains('emphasis')) {
                visible = false;
            }
            if (!visible) {
                label.element.hidden = true;
                return [];
            }
            const anchor = label.position.clone();
            anchor.y += label.roof ? roof.position.y : label.level ? levelY(label.level) : 0;
            const point = anchor.clone().project(camera);
            visible = visible && Math.abs(point.x) < 0.96 && Math.abs(point.y) < 0.94;
            if (visible && this.labelOcclusion.isOccluded(anchor, camera, occluders)) {
                visible = false;
            }
            if (!visible) {
                label.element.hidden = true;
                return [];
            }
            const offsetY = label === selection ? 14 : 0;
            const x = rect.left + (point.x + 1) * width / 2;
            const y = rect.top + (1 - point.y) * height / 2 - offsetY;
            const size = view.guided ? this.guidedSizes.get(label.element) : undefined;
            if (!size) {
                label.element.hidden = false;
            }
            return [{
                label,
                anchor,
                offsetY,
                size,
                x,
                y
            }];
        });
        // Batch DOM writes and measurements, avoiding a forced layout for every label.
        const measured = placements.map(({ size, ...placement }) => {
            const { element } = placement.label;
            const dimensions = size ?? { w: element.offsetWidth, h: element.offsetHeight };
            if (view.guided && !size && this.fonts?.status !== 'loading') {
                this.guidedSizes.set(element, dimensions);
            }
            return { ...placement, ...dimensions };
        });
        for (const { label, anchor, offsetY, x, y, w, h } of measured) {
            const collides = occupied.some(other => Math.abs(x - other.x) < (w + other.w) / 2 + 5 && Math.abs(y - other.y) < (h + other.h) / 2 + 4);
            label.element.hidden = collides;
            if (!collides) {
                positionLabel(label, x, y);
                occupied.push({ x, y, w, h });
                if (view.guided) {
                    this.guidedPlacements.push({ label, anchor, offsetY });
                }
            }
        }
    }

    /** Remove only labels owned by this instance when the scene is released. */
    dispose(): void {
        this.fonts?.removeEventListener('loadingdone', this.invalidateGuidedSizes);
        this.guidedPlacements.length = 0;
        this.guidedCandidates = undefined;
        this.setWalkingTargets();
        this.setFacilityFilter();
        for (const label of this.labels) {
            label.element.remove();
        }
        this.labels.length = 0;
        this.selectionElement?.remove();
        this.selectionElement = undefined;
        this.selectionKind = undefined;
    }
}
