import type { RouteEdge, RouteNode } from '../../../domain/map/model.ts';

/** Follow the Atrium Plaza (アトリウム広場) and the reviewed Hankyu (阪急) bridge and frontage. */
const deck: RouteNode[] = [
    { id: 'walking-north-atrium-landing', level: 'platform', x: 417.23, z: 547.88 },
    { id: 'walking-north-atrium-east-turn', level: 'district-north-deck', x: 418, z: 538 },
    { id: 'walking-north-deck-jr-approach', level: 'district-north-deck', x: 448, z: 526 },
    { id: 'walking-north-deck-carillon', level: 'district-north-deck', x: 538, z: 472 },
    { id: 'walking-north-deck-hankyu-turn', level: 'district-north-deck', x: 658, z: 445 },
    { id: 'walking-north-deck-hankyu-frontage', level: 'district-north-deck', x: 643, z: 379 },
    { id: 'walking-north-deck-hankyu-entry', level: 'hankyu-hall', x: 643, z: 358 }
];

/** Join named public landings before entering Hankyu through its existing gate edge. */
export function northernWalkingRoutes(stationNodes: readonly RouteNode[]) {
    const byId = new Map([...stationNodes, ...deck].map(node => [node.id, node]));
    const path = ['north-48-2', ...deck.map(node => node.id), 'hankyu-umeda-gate-out'];
    const walks = [
        ['hall', 'north-48-1'],
        ...path.slice(1).map((id, i) => [path[i]!, id])
    ];
    const edges: RouteEdge[] = walks.map(([from, to]) => {
        const start = byId.get(from!)!;
        const end = byId.get(to!)!;
        return { from: start.id, to: end.id, kind: 'walk', cost: Math.hypot(end.x - start.x, end.z - start.z) };
    });
    const low = byId.get('north-48-1')!;
    const high = byId.get('north-48-2')!;
    edges.push({
        from: low.id,
        to: high.id,
        kind: 'escalator',
        directed: true,
        cost: Math.hypot(high.x - low.x, high.z - low.z, 8)
    });
    return { nodes: deck, edges };
}
