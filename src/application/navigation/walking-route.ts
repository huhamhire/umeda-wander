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

export const maxWalkingStops = 3;

/** Assemble an itinerary in user order and identify the first leg the graph cannot support. */
export function planWalkingRoute(edges: RouteEdge[], places: readonly string[], allowPaid: boolean) {
    if (places.length < 2 || places.length > maxWalkingStops + 2) {
        return { issue: 'incomplete' } as const;
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
