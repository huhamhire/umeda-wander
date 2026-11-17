import type {BuildingOpening, StationMap} from '../domain/map/model.ts';

/** The station-attached shell yields to existing public halls; it adds no walking route. */
export function stationBuildingOpenings(stations: StationMap[]): BuildingOpening[] {
  const station = stations.find(s => s.id === 'hankyu-umeda');
  if (!station) {
    return [];
  }
  return station.layout.areas.filter(area => area.kind === 'public').flatMap(area => {
    const level = station.levels.find(l => l.id === area.level)!;
    const y = level.y + (area.elevationOffset ?? 0);
    if (y < 0) {
      return [];
    }
    return [{buildingId: 'hankyu-sanbangai', outline: area.outline, base: y - .1, top: y + 4.5, evidence: area.evidence}];
  });
}
