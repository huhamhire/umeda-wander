import type { LevelId, StationId } from '../../domain/map/model.ts';

const defaultHalls: Partial<Record<StationId, LevelId>> = {
    'metro-umeda': 'metro-hall',
    'hanshin-umeda': 'hanshin-hall',
    'higashi-umeda': 't20-hall',
    'nishi-umeda': 'y11-hall',
    kitashinchi: 'kitashinchi-hall'
};

/** Open an underground station at its hall and above-ground stations in overview. */
export function stationFocusLevel(station?: StationId | null): LevelId | 'all' {
    return station ? defaultHalls[station] ?? 'all' : 'all';
}

/** District/commercial space has no station owner; keep it as muted context. */
export function isRegionMuted(focus: StationId | null | undefined, owner: StationId | null | undefined): boolean {
    return !!focus && owner !== focus;
}
