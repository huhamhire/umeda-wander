import type { StationMap, VerticalConnection } from '../../../domain/map/model.ts';
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
    // The numbered side stairs flank the court; a separate stair is split by escalator 67 in the middle.
    for (const [side, x] of [['west', -1.55], ['east', 1.55]] as const) {
        const id = 'crost-67-stairs-' + side;
        const connection: VerticalConnection = {
            id,
            kind: 'stairs',
            width: 3.8,
            from: { id: id + '-1f', level: 'concourse', ...jrGroundPoint({ x, z: 31 }) },
            to: { id: id + '-b1', level: 'underground-hall', ...jrGroundPoint({ x, z: 43 }) },
            evidence: {
                source: 'jr',
                pages: [5, 6],
                detail: 'Central Court (セントラルコート) and Crost: stair treads are shown on both sides of the central 67 escalator, separate from side stairs 68 and 69. The user photo confirms the southward descent; widths and spacing are fitted.'
            }
        };
        connections.push(connection);
    }
    station.layout.connections.push(...connections);
    station.nodes.push(...connections.flatMap(c => [c.from, c.to]));
    const floor = jrStation.layout.areas.find(a => a.id === 'crost-public')!;
    station.layout.areas.push({
        ...floor,
        outline: floor.outline.map(jrGroundPoint),
        holes: floor.holes?.map(r => r.map(jrGroundPoint))
    });
}
