import { createGeographicJrGround } from './geographic.ts';
import { createGeographicUmekita } from './umekita/geographic.ts';
import { westWalkway } from './umekita/west-walkway.ts';
import { applyCrostAccess } from './crost-access.ts';
import { applySouthEntrance } from './south-entrance.ts';
import { applySouthBridge } from './south-bridge.ts';
import { applyLucuaEastAccess } from './lucua-east-access.ts';
import { building as southBuilding } from '../../buildings/daimaru/index.ts';

/** Ground and Umekita (うめきた) keep independent frames, with explicit internal links. */
export function createGeographicJr() {
    const ground = createGeographicJrGround();
    const underground = createGeographicUmekita();
    applySouthBridge(ground);
    applySouthEntrance(ground, southBuilding.entrance!);
    applyLucuaEastAccess(ground);
    const west = westWalkway(ground, underground);
    const jr = {
        ...ground,
        levels: [...ground.levels, ...underground.levels],
        facilities: [
            ...ground.facilities.filter(f => !west.facilities.some(p => p.id === f.id)),
            ...underground.facilities,
            ...west.facilities,
        ],
        nodes: [...new Map([...ground.nodes, ...underground.nodes, ...west.nodes].map(n => [n.id, n])).values()],
        edges: [...ground.edges, ...underground.edges],
        layout: {
            ...ground.layout,
            platforms: [...ground.layout.platforms, ...underground.layout.platforms],
            areas: [...ground.layout.areas, ...underground.layout.areas, ...west.areas],
            connections: [...ground.layout.connections, ...underground.layout.connections, ...west.connections]
        }
    };
    applyCrostAccess(jr);
    return jr;
}
