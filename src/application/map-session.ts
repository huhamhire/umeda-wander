import type { LevelId, RouteEdge, StationId } from '../domain/map/model.ts';
import { findRoute } from '../domain/navigation/find-route.ts';

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
    /**
     * Focus a station, choose its default hall and clear any previous route.
     */
    focusStation(station: StationId | null): void {
        const halls: Partial<Record<StationId, LevelId>> = {
            'metro-umeda': 'metro-hall',
            'hanshin-umeda': 'hanshin-hall',
            'higashi-umeda': 't20-hall',
            'nishi-umeda': 'y11-hall',
            kitashinchi: 'kitashinchi-hall'
        };
        this.state.focusStation = station;
        this.state.level = station ? halls[station] ?? 'all' : 'all';
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
