import type { Evidence, LevelId, PlanRegion, Point2 } from './model.ts';

/** Source paths are walking deck axes, never ground-road junctions or navigation edges. */
export interface DeckPath {
    id: string;
    name: string;
    points: Point2[];
    width: number;
    evidence: Evidence;
}

export interface DeckBlock {
    id: string;
    name: string;
    level: LevelId;
    paths: DeckPath[];
    regions: PlanRegion[];
    voids?: PlanRegion[];
    evidence: Evidence;
}

/** Explicit target chosen from reference plans; geometric contact alone is not a door. */
export interface DeckPortal {
    id: string;
    blockId: string;
    target: string;
    level: LevelId;
    point: Point2;
    width: number;
    angle: number;
    /** Half-length of the facade cut along the portal axis, in display metres. */
    openingHalfDepth?: number;
    evidence: Evidence;
}
