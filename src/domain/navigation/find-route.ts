import type { RouteEdge } from '../map/model.ts';

type Step = { id: string; gates: number; streetDistance: number; travelCost: number };

/** Extra walking-equivalent cost per modeled edge, used only after the gate and street priorities. */
const verticalPenalty: Partial<Record<RouteEdge['kind'], number>> = { elevator: 15, stairs: 30 };

/** Prefer fewer gate crossings, less street walking and then lower travel cost. */
function compareSteps(a: Step, b: Step): number {
    return a.gates - b.gates || a.streetDistance - b.streetDistance || a.travelCost - b.travelCost;
}

/** Add a tentative step to the min heap. */
function pushStep(queue: Step[], step: Step): void {
    let i = queue.length;
    queue.push(step);
    while (i > 0) {
        const parent = (i - 1) >> 1;
        if (compareSteps(queue[parent]!, step) <= 0) {
            break;
        }
        queue[i] = queue[parent]!;
        i = parent;
    }
    queue[i] = step;
}

/** Remove the lowest-cost pending step. */
function popStep(queue: Step[]): Step {
    const first = queue[0]!;
    const last = queue.pop()!;
    if (!queue.length) {
        return first;
    }
    let i = 0;
    while (i * 2 + 1 < queue.length) {
        let child = i * 2 + 1;
        if (child + 1 < queue.length && compareSteps(queue[child + 1]!, queue[child]!) < 0) {
            child++;
        }
        if (compareSteps(queue[child]!, last) >= 0) {
            break;
        }
        queue[i] = queue[child]!;
        i = child;
    }
    queue[i] = last;
    return first;
}

const adjacencyCache = new WeakMap<RouteEdge[], Map<string, { to: string; edge: RouteEdge }[]>>();

/** Index authored edge directions once for the lifetime of the route graph. */
function adjacency(edges: RouteEdge[]) {
    const existing = adjacencyCache.get(edges);
    if (existing) {
        return existing;
    }
    const index = new Map<string, { to: string; edge: RouteEdge }[]>();
    for (const edge of edges) {
        const outgoing = index.get(edge.from) ?? [];
        outgoing.push({ to: edge.to, edge });
        index.set(edge.from, outgoing);
        if (!edge.directed) {
            const incoming = index.get(edge.to) ?? [];
            incoming.push({ to: edge.from, edge });
            index.set(edge.to, incoming);
        }
    }
    adjacencyCache.set(edges, index);
    return index;
}

/**
 * Compare gate crossings, street distance and weighted travel cost in order.
 * Disabled paid access removes gate edges entirely.
 */
export function findRoute(edges: RouteEdge[], start: string, end: string, allowPaid: boolean): string[] | null {
    const origin = { id: start, gates: 0, streetDistance: 0, travelCost: 0 };
    const best = new Map<string, Step>([[start, origin]]);
    const previous = new Map<string, string>();
    const graph = adjacency(edges);
    const queue: Step[] = [origin];
    while (queue.length) {
        const step = popStep(queue);
        const { id, travelCost, gates, streetDistance } = step;
        if (step !== best.get(id)) {
            continue;
        }
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
        for (const { to, edge } of graph.get(id) ?? []) {
            if (!allowPaid && edge.kind === 'gate') {
                continue;
            }
            const next = {
                id: to,
                gates: gates + Number(edge.kind === 'gate'),
                streetDistance: streetDistance + (edge.street ? edge.cost : 0),
                travelCost: travelCost + edge.cost + (verticalPenalty[edge.kind] ?? 0),
            };
            const prior = best.get(to);
            if (!prior || compareSteps(next, prior) < 0) {
                best.set(to, next);
                previous.set(to, id);
                pushStep(queue, next);
            }
        }
    }
    return null;
}
