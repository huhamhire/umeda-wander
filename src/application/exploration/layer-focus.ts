import type { Level, LevelId } from '../../domain/map/model.ts';

export type LayerRole = 'normal' | 'current' | 'context' | 'hidden';
/**
 * Classify the active floor, retained lower floors and hidden upper floors by stack order.
 */
export function layerRole(levels: Level[], focus: LevelId | 'all', target: LevelId): LayerRole {
    if (focus === 'all') {
        return 'normal';
    }
    const active = levels.find(level => level.id === focus);
    const level = levels.find(level => level.id === target);
    if (!active || !level) {
        throw new Error('Unknown focus layer');
    }
    if ((active.station ?? 'jr-osaka') !== (level.station ?? 'jr-osaka')) {
        return 'hidden';
    }
    if (target === focus) {
        return 'current';
    }
    return level.y < active.y ? 'context' : 'hidden';
}
