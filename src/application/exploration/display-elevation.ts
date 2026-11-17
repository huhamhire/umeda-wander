import type { Level, LevelId } from '../../domain/map/model.ts';

/** Exploded presentation coordinates; never used for route costs. */
export function displayElevation(levels: Level[], id: LevelId, explode: number): number {
    const index = levels.findIndex(level => level.id === id);
    if (index < 0) {
        throw new Error(`Unknown level: ${id}`);
    }
    const groundIndex = levels.findIndex(level => level.id === 'concourse');
    return levels[index]!.y + (levels[index]!.stackIndex ?? (index - groundIndex)) * explode * 14;
}
