import { messageText } from '../infrastructure/i18n/index.ts';
import type { Level, LevelId } from '../domain/map/model.ts';
import { explorationElevation } from '../application/exploration-level.ts';

export interface FloorOption {
    id: LevelId;
    y: number;
    label: string;
    name: string;
    members: Level[];
}
// Shared scene heights are presentation groups, not shared station identities.
const captions: Record<number, {
    label: string;
    name: string;
}> = {
    16: { label: '3F', name: messageText('ui.floors.third.description') },
    8: { label: '2F', name: messageText('ui.floors.second.description') },
    0: { label: '1F', name: messageText('ui.floors.first.description') },
    [-8]: { label: 'B1', name: messageText('ui.floors.basementOne.description') },
    [-16]: { label: 'B2', name: messageText('ui.floors.basementTwo.description') },
};
/**
 * Group physical floors into cross-station exploration options while retaining full accessible descriptions.
 */
export function floorOptions(levels: Level[]): FloorOption[] {
    const groups = new Map<number, Level[]>();
    for (const level of levels) {
        const y = explorationElevation(level);
        const members = groups.get(y) ?? [];
        members.push(level);
        groups.set(y, members);
    }
    return [...groups].sort(([a], [b]) => b - a).map(([y, members]) => ({
        id: members[0]!.id,
        y,
        members,
        ...(captions[y] ?? { label: members[0]!.label, name: members.map(l => l.name).join(' / ') }),
    }));
}
