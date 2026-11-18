import * as T from 'three';
import type { Level, LevelId, StationId } from '../../domain/map/model.ts';
import type { MapViewState } from '../../application/map-session.ts';
import { viewLayerRole } from '../../application/exploration/view-layer.ts';
import { isRegionMuted } from '../../application/exploration/region-focus.ts';
import { LabelOcclusion, visibleLabelOccluders } from './label-occlusion.ts';

export interface SceneLabelDefinition {
    text: string;
    position: T.Vector3;
    level?: LevelId;
    roof?: boolean;
    emphasis?: boolean;
    owner?: StationId | null;
    surface?: T.Object3D;
}

interface MapLabel extends SceneLabelDefinition {
    element: HTMLDivElement;
}

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
}

/** Own screen labels, their occlusion and collision ordering independently of scene geometry. */
export class SceneLabels {
    private readonly labels: MapLabel[] = [];
    private readonly labelOcclusion = new LabelOcclusion();

    /** Create DOM labels from model-owned anchors without copying station layout logic. */
    constructor(host: HTMLElement, definitions: readonly SceneLabelDefinition[]) {
        for (const definition of definitions) {
            const element = document.createElement('div');
            element.className = 'map-label' + (definition.emphasis ? ' emphasis' : '');
            element.textContent = definition.text;
            host.append(element);
            this.labels.push({ ...definition, element });
        }
    }

    /** Project, mute, occlude and deconflict labels using one DOM measurement pass. */
    update(view: SceneLabelView): void {
        const { state, levels, levelY, camera, roof, rect, width, height, zoom } = view;
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
        const orderedLabels = [...this.labels].sort((a, b) => priority(b) - priority(a));
        const placements = orderedLabels.map(label => {
            const role = label.level ? viewLayerRole(levels, state, label.level) : 'normal';
            let visible = label.roof ? roof.visible : role !== 'hidden';
            if (label.surface && !label.surface.visible) {
                visible = false;
            }
            label.element.classList.toggle('context', role === 'context' || labelMuted(label));
            if (role === 'context' && !label.element.classList.contains('emphasis')) {
                visible = false;
            }
            if ((mobile || state.level === 'all') && zoom < 1.2 && !label.element.classList.contains('emphasis')) {
                visible = false;
            }
            const anchor = label.position.clone();
            anchor.y += label.roof ? roof.position.y : label.level ? levelY(label.level) : 0;
            const point = anchor.clone().project(camera);
            visible = visible && Math.abs(point.x) < 0.96 && Math.abs(point.y) < 0.94;
            if (visible && this.labelOcclusion.isOccluded(anchor, camera, occluders)) {
                visible = false;
            }
            label.element.hidden = !visible;
            const x = rect.left + (point.x + 1) * width / 2;
            const y = rect.top + (1 - point.y) * height / 2;
            label.element.style.left = `${x}px`;
            label.element.style.top = `${y}px`;
            return {
                label,
                visible,
                x,
                y
            };
        });
        // Batch DOM writes and measurements, avoiding a forced layout for every label.
        const measured = placements.map(p => ({
            ...p,
            w: p.visible ? p.label.element.offsetWidth : 0,
            h: p.visible ? p.label.element.offsetHeight : 0
        }));
        for (const { label, visible, x, y, w, h } of measured) {
            if (visible) {
                const collides = occupied.some(other => Math.abs(x - other.x) < (w + other.w) / 2 + 5 && Math.abs(y - other.y) < (h + other.h) / 2 + 4);
                label.element.hidden = collides;
                if (!collides) {
                    occupied.push({
                        x,
                        y,
                        w,
                        h
                    });
                }
            }
        }
    }

    /** Remove only labels owned by this instance when the scene is released. */
    dispose(): void {
        for (const label of this.labels) {
            label.element.remove();
        }
        this.labels.length = 0;
    }
}
