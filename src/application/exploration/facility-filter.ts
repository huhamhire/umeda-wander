import type { Facility, FacilityKind, Level, LevelId, StationId } from '../../domain/map/model.ts';
import { explorationElevation } from './exploration-level.ts';

export interface FacilityFilter {
    station: StationId | null;
    level: LevelId | 'all';
    kind: FacilityKind | 'all';
}

/**
 * Group ticket machines and ticket offices under one filter without changing their entity types.
 */
export function facilityCategory(kind: FacilityKind): FacilityKind {
    return kind === 'ticket-machine' ? 'ticket' : kind;
}

/**
 * Filter by the manually selected station, exploration floor and category without changing map selection.
 */
export function filterFacilities<F extends Pick<Facility, 'level' | 'kind'>>(
    facilities: readonly F[],
    levels: Level[],
    filter: FacilityFilter
): F[] {
    const selected = levels.find(l => l.id === filter.level);
    return facilities.filter(f => {
        const owner = levels.find(l => l.id === f.level)!;
        return (!filter.station || owner.station === filter.station) &&
            (!selected || explorationElevation(owner) === explorationElevation(selected)) &&
            (filter.kind === 'all' || (filter.kind === 'ticket' ? facilityCategory(f.kind) === 'ticket' : f.kind === filter.kind));
    });
}
