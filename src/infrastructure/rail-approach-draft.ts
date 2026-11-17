import type { Point2, RailApproach, RailNode, RailSegment } from '../domain/map/model.ts';

/** Shared graph construction only; each station owns its alignment. */
export function railApproachDraft() {
    const approaches: RailApproach[] = [];
    const make = (
        id: string,
        station: RailApproach['station'],
        name: string,
        color: number,
        labelPoint: Point2,
        level: RailApproach['level'] = station === 'jr-osaka' ? 'platform' : 'hankyu-platform'
    ): RailApproach => {
        const a: RailApproach = {
            id,
            station,
            level,
            name,
            color,
            nodes: [],
            segments: [],
            labelPoint,
            evidence: {
                source: station === 'jr-osaka' ? 'jr' : 'hankyu',
                pages: [station === 'jr-osaka' ? 3 : 1],
                detail: 'Station-exit bundle and merge schematic; tail direction cross-checked with OSM, not a complete turnout/interlocking diagram'
            }
        };
        approaches.push(a);
        return a;
    };
    const node = (a: RailApproach, key: string, point: Point2, kind: RailNode['kind']) => {
        const n = { id: `${a.id}-${key}`, point, kind };
        a.nodes.push(n);
        return n;
    };
    const segment = (
        a: RailApproach,
        key: string,
        from: RailNode,
        to: RailNode,
        c1: Point2,
        c2: Point2,
        platformId?: string,
        track?: number
    ) => {
        const s: RailSegment = {
            id: `${a.id}-${key}`,
            from: from.id,
            to: to.id,
            control1: c1,
            control2: c2,
            platformId,
            track
        };
        a.segments.push(s);
    };
    return {
        approaches,
        make,
        node,
        segment
    };
}
