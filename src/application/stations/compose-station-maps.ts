import type { StationMap, StationLayout } from '../../domain/map/model.ts';

/** Pure composition; no rendering, placement mutation or inter-station routing. */
export function composeStationMaps(stations: StationMap[], district: StationLayout) {
    if (new Set(stations.map(s => s.id)).size !== stations.length) {
        throw new Error('Duplicate station in map composition');
    }
    const levels = stations.flatMap(s => s.levels);
    if (new Set(levels.map(l => l.id)).size !== levels.length) {
        throw new Error('Duplicate level in map composition');
    }
    const parts = [...stations.map(s => s.layout), district];
    const layout: Required<StationLayout> = {
        areas: parts.flatMap(p => p.areas),
        platforms: parts.flatMap(p => p.platforms),
        connections: parts.flatMap(p => p.connections),
        railApproaches: parts.flatMap(p => p.railApproaches ?? []),
        guides: parts.flatMap(p => p.guides ?? []),
        passages: parts.flatMap(p => p.passages ?? []),
        atria: parts.flatMap(p => p.atria ?? []),
        concourses: parts.flatMap(p => p.concourses ?? []),
        exteriorOpenings: parts.flatMap(p => p.exteriorOpenings ?? []),
        canopies: parts.flatMap(p => p.canopies ?? []),
        landmarks: parts.flatMap(p => p.landmarks ?? []),
    };
    return {
        stations: stations.map(({ id, name }) => ({ id, name })),
        levels,
        layout,
        sourceFacilities: stations.flatMap(s => s.facilities),
        nodes: stations.flatMap(s => s.nodes),
        edges: stations.flatMap(s => s.edges)
    };
}
