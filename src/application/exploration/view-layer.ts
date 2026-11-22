import type { Level, LevelId, StationId } from '../../domain/map/model.ts';
import type { LayerRole } from './layer-focus.ts';
import { explorationElevation } from './exploration-level.ts';
import { stationFocusLevel } from './region-focus.ts';

/** Keep the street surface clear of below-ground levels and underground station overviews. */
export function allowsGroundLayer(
    levels: readonly Level[],
    state: { level: LevelId | 'all'; focusStation?: StationId | null }
): boolean {
    const selected = state.level === 'all' ? stationFocusLevel(state.focusStation) : state.level;
    return (levels.find(level => level.id === selected)?.y ?? 0) >= 0;
}

/** B1 inspections can show the JR concourse as an independent, non-active reference surface. */
export function showsJrConcourseReference(levels: readonly Level[], selected: LevelId | 'all'): boolean {
    const level = levels.find(candidate => candidate.id === selected);
    return !!level && explorationElevation(level) === -8;
}

/**
 * Resolve visibility across exploration groups while retaining each entity’s physical floor identity.
 */
export function viewLayerRole(
    levels: Level[],
    state: {
        level: LevelId | 'all';
        focusStation?: StationId | null;
    },
    target: LevelId
): LayerRole {
    const level = levels.find(l => l.id === target);
    if (!level) {
        throw new Error(`Unknown layer ${target}`);
    }
    if (state.level === 'all') {
        return 'normal';
    }
    const active = levels.find(l => l.id === state.level);
    if (!active) {
        throw new Error(`Unknown focus layer ${state.level}`);
    }
    const targetY = explorationElevation(level);
    const activeY = explorationElevation(active);
    if (targetY === activeY) {
        return 'current';
    }
    return targetY < activeY ? 'context' : 'hidden';
}
