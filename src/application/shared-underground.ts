import clipping from 'polygon-clipping';
import type { MultiPolygon } from 'polygon-clipping';
import type { StationMap, FloorArea, Level } from '../domain/map/model.ts';

export const sharedUndergroundLevel: Level = {
    id: 'district-underground',
    label: 'B1',
    name: "publicAreas.underground.name",
    y: -8,
    stackIndex: -1,
    description: 'publicAreas.underground.description'
};
/** The reference network owns B1 public space; station models own paid interiors. */
export function assembleSharedUnderground(stations: StationMap[], network: MultiPolygon, frontages: FloorArea[] = []) {
    const removed: string[] = [];
    const maps = stations.map(s => ({
        ...s,
        layout: {
            ...s.layout,
            areas: s.layout.areas.filter(a => {
                const obsolete = a.kind === 'public' && s.levels.find(l => l.id === a.level)?.y === -8;
                if (obsolete) {
                    removed.push(a.id);
                }
                return !obsolete;
            })
        }
    }));
    const occupied = maps.flatMap(s => s.layout.areas.filter(a => a.kind !== 'public' && s.levels.find(l => l.id === a.level)?.y === -8));
    const cuts = occupied.map(a => [a.outline, ...a.holes ?? []].map(r => r.map(p => [p.x, p.z] as [
        number,
        number
    ])));
    const donated = frontages.filter(a => !a.elevationOffset).map(a => [a.outline, ...a.holes ?? []].map(r => r.map(p => [p.x, p.z] as [
        number,
        number
    ])));
    const geometry = clipping.difference(clipping.union(network, ...donated), ...cuts);
    const areas: FloorArea[] = geometry.map((polygon, i) => ({
        id: 'district-underground-' + i,
        level: 'district-underground',
        name: "publicAreas.underground.name",
        kind: 'public',
        height: .55,
        label: false,
        outline: polygon[0]!.map(([x, z]) => ({ x, z })),
        holes: polygon.slice(1).map(r => r.map(([x, z]) => ({ x, z }))),
        evidence: {
            source: 'district',
            pages: [1],
            detail: 'Region-fitted network and operator concourse frontages share one public surface. Paid interiors subtracted; no inferred route edges.',
            urls: [...new Set(frontages.flatMap(a => a.evidence.urls ?? []))]
        }
    }));
    areas.push(...frontages.filter(a => a.elevationOffset).map(a => ({ ...a, level: sharedUndergroundLevel.id, label: false })));
    return { stations: maps, areas, removed };
}
