import { planGateBoundaries } from '../../../application/connections/gate-boundaries.ts';
import type { Point2, StationMap } from '../../../domain/map/model.ts';
import { jrStation } from './index.ts';
import { jrAxisPoint, jrGroundFrame } from './ground-frame.ts';

// The two commercial frontages bound the railway apron at about v=-39 / +74.
// Keep the station inside that gap; do not reshape the source building footprints.
/**
 * Fit a local JR ground point to the district frame with a separate west-side length adjustment.
 */
export function jrGroundPoint(p: Point2): Point2 {
    const { along, across, acrossOffset } = jrGroundFrame;
    const x = p.x < -70 ? -70 + (p.x + 70) * .4 : p.x;
    return jrAxisPoint(x * along, p.z * across + acrossOffset);
}

/** Compress the schematic atrium without scaling the surrounding station or floor heights. */
export function jrAtriumPoint(p: Point2): Point2 {
    return jrGroundPoint({ x: p.x * .6 - 2.5, z: -49 + (p.z + 49) * .48 });
}

/** Ground-station review slice only. Umekita (うめきた) needs its own frame. */
export function createGeographicJrGround(): StationMap {
    const { angle, along, across, eastSetback, platformWidth } = jrGroundFrame;
    const point = jrGroundPoint;
    const direction = (a: number) => angle + Math.atan2(Math.sin(a) * across, Math.cos(a) * along);
    const levels = jrStation.levels.filter(l => !l.id.startsWith('underground'));
    const levelIds = new Set(levels.map(l => l.id));
    const atriumNodes = new Set(jrStation.layout.connections.filter(c => c.id.startsWith('north-')).flatMap(c => [c.from.id, c.to.id]));
    const nodes = jrStation.nodes.filter(n => levelIds.has(n.level)).map(n => ({ ...n, ...(atriumNodes.has(n.id) ? jrAtriumPoint(n) : point(n)) }));
    for (const connection of jrStation.layout.connections.filter(c => c.id.startsWith('north-'))) {
        for (const endpoint of [connection.from, connection.to]) {
            if (!nodes.some(n => n.id === endpoint.id)) {
                nodes.push({ ...endpoint, ...jrAtriumPoint(endpoint) });
            }
        }
    }
    const nodeIds = new Set(nodes.map(n => n.id));
    const gates = new Map(planGateBoundaries(jrStation.facilities, jrStation.layout.areas).map(g => [g.gateId, g]));
    return {
        ...jrStation,
        levels,
        nodes,
        edges: jrStation.edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to)),
        facilities: jrStation.facilities.filter(f => levelIds.has(f.level)).map(f => ({
            ...f,
            ...(f.id === 'north-47' || f.id === 'north-48' ? jrAtriumPoint(f) : point(gates.get(f.id)?.center ?? f)),
            rotationRad: direction(f.rotationRad ?? (f.axis === 'z' ? Math.PI / 2 : 0))
        })),
        layout: {
            areas: jrStation.layout.areas.filter(a => levelIds.has(a.level)).map(a => ({
                ...a,
                outline: a.outline.map(a.id.startsWith('north-atrium-') ? jrAtriumPoint : point),
                holes: a.holes?.map(h => h.map(point))
            })),
            platforms: jrStation.layout.platforms.filter(p => p.level === 'platform').map(p => {
                const west = point({ x: p.x - p.length / 2, z: p.z });
                const sourceEast = point({ x: p.x + p.length / 2, z: p.z });
                const east = { x: sourceEast.x - Math.cos(angle) * eastSetback, z: sourceEast.z - Math.sin(angle) * eastSetback };
                return {
                    ...p,
                    x: (west.x + east.x) / 2,
                    z: (west.z + east.z) / 2,
                    length: Math.hypot(east.x - west.x, east.z - west.z),
                    width: p.width * platformWidth,
                    rotationRad: angle
                };
            }),
            connections: jrStation.layout.connections.filter(c => levelIds.has(c.from.level) && levelIds.has(c.to.level)).map(c => ({
                ...c,
                from: { ...c.from, ...(c.id.startsWith('north-') ? jrAtriumPoint(c.from) : point(c.from)) },
                to: { ...c.to, ...(c.id.startsWith('north-') ? jrAtriumPoint(c.to) : point(c.to)) },
                doorFacingRad: c.doorFacingRad === undefined ? undefined : direction(c.doorFacingRad)
            })),
            atria: jrStation.layout.atria?.map(a => ({
                ...a,
                openings: a.openings.filter(o => levelIds.has(o.level)).map(o => ({ ...o, outline: o.outline.map(a.id === 'north-atrium-void' ? jrAtriumPoint : point) }))
            })),
        }
    };
}
