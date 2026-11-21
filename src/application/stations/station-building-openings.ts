import type { BuildingOpening, StationMap } from '../../domain/map/model.ts';
import { passageOutline } from '../../domain/map/geometry.ts';
import { planFloorOpenings } from '../connections/connection-openings.ts';
import { escalatorOverallWidth } from '../connections/connection-lanes.ts';

/** Clear public halls and the main vertical circulation inside the station-attached shell. */
export function stationBuildingOpenings(stations: StationMap[]): BuildingOpening[] {
    const southGate = stations.find(s => s.id === 'jr-osaka');
    const southGateExclusions = new Set(['south-entrance-ground-passage', 'south-entrance-deck', 'south-building-upper-landing', 'south-building-3f']);
    const southGateOpenings = southGate?.layout.areas.filter(area => southGateExclusions.has(area.id)).map(area => {
        const y = southGate.levels.find(level => level.id === area.level)!.y + (area.elevationOffset ?? 0);
        const clearance = area.id === 'south-entrance-ground-passage' ? 2.7 : 4.5;
        return { buildingId: 'daimaru', outline: area.outline, base: y - .1, top: y + clearance, evidence: area.evidence };
    }) ?? [];
    const station = stations.find(s => s.id === 'hankyu-umeda');
    if (!station) {
        return southGateOpenings;
    }
    const buildingId = 'hankyu-sanbangai';
    const landings = station.layout.areas.filter(area => area.kind === 'public').flatMap(area => {
        const level = station.levels.find(l => l.id === area.level)!;
        const y = level.y + (area.elevationOffset ?? 0);
        if (y < 0) {
            return [];
        }
        return [{
            buildingId,
            outline: area.outline,
            base: y - .1,
            top: y + 4.5,
            evidence: area.evidence
        }];
    });
    const connections = station.layout.connections.filter(c => c.id.startsWith('hankyu-umeda-direct-') ||
        c.id.startsWith('hankyu-umeda-public-lift'));
    const shafts = planFloorOpenings(connections.filter(c => c.kind === 'elevator'), station.levels, station.layout.platforms);
    const circulation = connections.map(c => {
        const fromY = station.levels.find(l => l.id === c.from.level)!.y;
        const toY = station.levels.find(l => l.id === c.to.level)!.y;
        const outline = c.kind === 'elevator'
            ? shafts.find(shaft => shaft.connectionId === c.id)!.outline
            : passageOutline(c.from, c.to, (c.width ?? escalatorOverallWidth) + 1.2);
        return {
            buildingId,
            outline,
            base: Math.min(fromY, toY) - .1,
            top: Math.max(fromY, toY) + 3.2,
            evidence: c.evidence
        };
    });
    return [...southGateOpenings, ...landings, ...circulation];
}
