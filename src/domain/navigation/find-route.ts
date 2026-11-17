import type { RouteEdge } from '../map/model.ts';

/**
 * Find the least-cost path with Dijkstra; skip gate edges when paid access is disabled and return null if unreachable.
 */
export function findRoute(edges: RouteEdge[], start: string, end: string, allowPaid: boolean): string[] | null {
    const distances = new Map<string, number>([[start, 0]]);
    const previous = new Map<string, string>();
    const visited = new Set<string>();
    while (true) {
        // Settle the cheapest unvisited node before relaxing its outgoing edges.
        const next = [...distances].filter(([id]) => !visited.has(id)).sort((a, b) => a[1] - b[1])[0];
        if (!next) {
            return null;
        }
        const [id, distance] = next;
        if (id === end) {
            // Follow predecessors only after the destination has its final distance.
            const route = [end];
            while (route[0] !== start) {
                const parent = previous.get(route[0]!);
                if (!parent) {
                    return null;
                }
                route.unshift(parent);
            }
            return route;
        }
        visited.add(id);
        for (const edge of edges) {
            if (!allowPaid && edge.kind === 'gate') {
                continue;
            }
            // Reverse traversal is valid only for explicitly undirected edges.
            const target = edge.from === id ? edge.to : (!edge.directed && edge.to === id ? edge.from : null);
            if (target && distance + edge.cost < (distances.get(target) ?? Infinity)) {
                distances.set(target, distance + edge.cost);
                previous.set(target, id);
            }
        }
    }
}
