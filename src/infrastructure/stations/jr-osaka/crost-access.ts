import type { StationMap } from '../../../domain/map/model.ts';
import { jrStation } from './index.ts';
import { jrGroundPoint } from './geographic.ts';

/** Crost descends from Central Court, independently of the Umekita (うめきた) frame. */
export function applyCrostAccess(station: StationMap): void {
    const ids = new Set(['crost-67', 'crost-stairs-68', 'crost-stairs-69']);
    const connections = jrStation.layout.connections.filter(c => ids.has(c.id)).map(c => ({
        ...c,
        from: { ...c.from, ...jrGroundPoint(c.from) },
        to: { ...c.to, ...jrGroundPoint(c.to) }
    }));
    station.layout.connections.push(...connections);
    station.nodes.push(...connections.flatMap(c => [c.from, c.to]));
    const floor = jrStation.layout.areas.find(a => a.id === 'crost-public')!;
    station.layout.areas.push({
        ...floor,
        outline: floor.outline.map(jrGroundPoint),
        holes: floor.holes?.map(r => r.map(jrGroundPoint))
    });
}
