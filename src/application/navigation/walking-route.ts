import type { FacilityKind, LevelId, RouteEdge, StationId } from '../../domain/map/model.ts';
import { findRoute } from '../../domain/navigation/find-route.ts';

export interface WalkingPlace {
    id: string;
    name: string;
    level: LevelId;
    station: StationId;
    access: 'outside' | 'inside';
    kind?: FacilityKind;
    facilityId?: string;
}

export interface WalkingApproach {
    id: string;
    distance: number;
}

export type WalkingApproaches = ReadonlyMap<string, readonly WalkingApproach[]>;

export interface WalkingApproximation {
    requested: string;
    via: string;
}

type WalkingRouteResult = { route: string[]; approximations?: WalkingApproximation[]; issue?: undefined }
    | { issue: 'incomplete'; route?: undefined }
    | { issue: 'duplicate' | 'gateRequired' | 'unavailable'; from: string; to: string; route?: undefined };

export const maxWalkingStops = 3;

/** Assemble an itinerary in user order and identify the first leg the graph cannot support. */
export function planWalkingRoute(
    edges: RouteEdge[], places: readonly string[], allowPaid: boolean, approaches?: WalkingApproaches
): WalkingRouteResult {
    if (places.length < 2 || places.length > maxWalkingStops + 2) {
        return { issue: 'incomplete' } as const;
    }
    if (approaches && places.some(place => approaches.has(place))) {
        return planApproachedRoute(edges, places, allowPaid, approaches);
    }
    const route: string[] = [];
    for (let i = 0; i < places.length - 1; i++) {
        const from = places[i]!;
        const to = places[i + 1]!;
        if (from === to) {
            return { issue: 'duplicate', from, to } as const;
        }
        const leg = findRoute(edges, from, to, allowPaid);
        if (!leg) {
            const issue = !allowPaid && findRoute(edges, from, to, true) ? 'gateRequired' : 'unavailable';
            return { issue, from, to } as const;
        }
        route.push(...(i ? leg.slice(1) : leg));
    }
    return { route };
}

interface ApproachPath {
    distance: number;
    endpoints: string[];
    route: string[];
}

/** Keep one best partial itinerary per approach so a waypoint uses the same node on both legs. */
function reachableApproaches(edges: RouteEdge[], choices: readonly (readonly WalkingApproach[])[], allowPaid: boolean) {
    let paths = choices[0]!.map(({ id, distance }) => ({ distance, endpoints: [id], route: [id] }));
    for (let i = 1; i < choices.length; i++) {
        const reachable: ApproachPath[] = [];
        for (const choice of choices[i]!) {
            let best: ApproachPath | undefined;
            for (const path of paths) {
                const from = path.endpoints.at(-1)!;
                const distance = path.distance + choice.distance;
                if (from === choice.id || (best && best.distance <= distance)) {
                    continue;
                }
                const leg = findRoute(edges, from, choice.id, allowPaid);
                if (leg) {
                    best = { distance, endpoints: [...path.endpoints, choice.id], route: [...path.route, ...leg.slice(1)] };
                }
            }
            if (best) {
                reachable.push(best);
            }
        }
        if (!reachable.length) {
            return { failedAt: i } as const;
        }
        paths = reachable;
    }
    return { path: paths.sort((a, b) => a.distance - b.distance)[0]! };
}

/** Select the closest approaches that support the whole itinerary under the current gate policy. */
function planApproachedRoute(edges: RouteEdge[], places: readonly string[], allowPaid: boolean, approaches: WalkingApproaches) {
    const duplicate = places.findIndex((place, i) => place === places[i - 1]);
    if (duplicate >= 0) {
        const from = places[duplicate]!;
        return { issue: 'duplicate', from, to: from } as const;
    }
    const choices = places.map(id => approaches.get(id) ?? [{ id, distance: 0 }]);
    const result = reachableApproaches(edges, choices, allowPaid);
    if (result.path) {
        const approximations: WalkingApproximation[] = places.flatMap((requested, i) => {
            const via = result.path.endpoints[i]!;
            return requested === via ? [] : [{ requested, via }];
        });
        return { route: result.path.route, approximations };
    }
    const to = places[result.failedAt]!;
    const from = places[result.failedAt - 1]!;
    const issue = !allowPaid && reachableApproaches(edges, choices, true).path ? 'gateRequired' : 'unavailable';
    return { issue, from, to } as const;
}
