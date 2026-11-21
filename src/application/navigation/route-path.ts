import type { Point2, RouteNode, VerticalConnection } from '../../domain/map/model.ts';
import { connectionLanes } from '../connections/connection-lanes.ts';

export interface RoutePathPoint extends RouteNode {
    escalator?: VerticalConnection;
}

/** Identify the modeled flight in either traversal direction. */
export const routeConnectionKey = (a: string, b: string) => a < b ? a + '\0' + b : b + '\0' + a;

/** Index equipment without adding paths or changing its registered travel direction. */
export function routeEscalators(connections: readonly VerticalConnection[]) {
    return new Map(connections.filter(connection => connection.kind === 'escalator').map(connection =>
        [routeConnectionKey(connection.from.id, connection.to.id), connectionLanes(connection)] as const
    ));
}

/** Match the model's comb plate: enter or leave beyond the rounded handrail return. */
function combEnd(landing: RouteNode, opposite: RouteNode, lane: VerticalConnection): RoutePathPoint {
    const dx = landing.x - opposite.x;
    const dz = landing.z - opposite.z;
    const factor = .8 / (Math.hypot(dx, dz) || 1);
    return { ...landing, x: landing.x + dx * factor, z: landing.z + dz * factor, escalator: lane };
}

/** Fit the displayed path to the equipment, keeping the selected graph path and costs intact. */
export function routePath(nodes: readonly RouteNode[], escalators: ReturnType<typeof routeEscalators>): RoutePathPoint[] {
    const path: RoutePathPoint[] = [];
    let exitedFlight = false;
    for (let i = 0; i < nodes.length; i++) {
        const start = nodes[i]!;
        const end = nodes[i + 1];
        const lanes = end && escalators.get(routeConnectionKey(start.id, end.id));
        if (!end || !lanes) {
            if (!exitedFlight) {
                path.push(start);
            }
            exitedFlight = false;
            continue;
        }
        const preceding = nodes[i - 1] ?? start;
        const following = nodes[i + 2] ?? end;
        const forward = start.id === lanes[0]!.from.id;
        /** Prefer the lane whose comb plates require the least lateral detour from the existing route. */
        const distance = (a: Point2, b: Point2) => Math.hypot(a.x - b.x, a.z - b.z);
        const flights = lanes.map(lane => {
            const from = forward ? lane.from : lane.to;
            const to = forward ? lane.to : lane.from;
            const entry = combEnd(from, to, lane);
            const exit = combEnd(to, from, lane);
            return { from, to, entry, exit, lane, cost: distance(preceding, entry) + distance(following, exit) };
        });
        const { from, to, entry, exit, lane } = flights.sort((a, b) => a.cost - b.cost)[0]!;
        path.push(entry, { ...from, escalator: lane }, { ...to, escalator: lane }, exit);
        exitedFlight = true;
    }
    return path;
}
