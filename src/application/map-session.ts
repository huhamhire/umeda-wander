import type { LevelId, RouteEdge, StationId } from '../domain/map/model.ts';
import { findRoute } from '../domain/navigation/find-route.ts';
import { stationFocusLevel } from './exploration/region-focus.ts';
import { planWalkingRoute } from './navigation/walking-route.ts';

export interface MapViewState {
    explode: number;
    roof: boolean;
    level: LevelId | 'all';
    route: string[] | null;
    focusStation?: StationId | null;
}

export class MapSession {
    state: MapViewState = {
        explode: 0,
        roof: true,
        level: 'all',
        route: null,
        focusStation: null
    };
    private readonly edges: RouteEdge[];
    /**
     * Store the local navigation graph without calculating a route during initialization.
     */
    constructor(edges: RouteEdge[]) {
        this.edges = edges;
    }
    /**
     * Calculate an illustrative route and open an expanded overview; this is not verified cross-station navigation.
     */
    showRoute(start = 'entry', end = 'destination'): void {
        this.state.route = findRoute(this.edges, start, end, true);
        this.state.explode = 0.78;
        this.state.level = 'all';
        this.state.roof = false;
    }
    /** Draw a complete itinerary only when each ordered leg is present in the graph. */
    previewWalkingRoute(places: readonly string[], allowPaid: boolean) {
        const result = planWalkingRoute(this.edges, places, allowPaid);
        this.state.route = result.route ?? null;
        if (result.route) {
            this.state.explode = 0.78;
            this.state.level = 'all';
            this.state.roof = false;
            this.state.focusStation = null;
        }
        return result;
    }
    /**
     * Focus a station, choose its default hall and clear any previous route.
     */
    focusStation(station: StationId | null): void {
        this.state.focusStation = station;
        this.state.level = stationFocusLevel(station);
        this.state.route = null;
    }
    /**
     * Restore overview, building visibility and zero floor expansion.
     */
    reset(): void {
        this.state = {
            explode: 0,
            roof: true,
            level: 'all',
            route: null,
            focusStation: null
        };
    }
}
