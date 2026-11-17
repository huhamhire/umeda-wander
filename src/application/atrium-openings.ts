import type { AtriumVoid, FloorOpening } from '../domain/map/model.ts';

/** A shared open court cuts each upper floor once, independently of its escalators. */
export function planAtriumOpenings(atria: AtriumVoid[]): FloorOpening[] {
    return atria.flatMap(a => a.openings.map(o => ({
        connectionId: a.id,
        level: o.level,
        kind: 'atrium' as const,
        outline: o.outline
    })));
}
