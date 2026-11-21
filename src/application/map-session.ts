import type { Level, LevelId, RouteEdge, RouteNode, StationId } from '../domain/map/model.ts';
import { findRoute } from '../domain/navigation/find-route.ts';
import { stationFocusLevel } from './exploration/region-focus.ts';
import { planWalkingRoute } from './navigation/walking-route.ts';
import type { WalkingApproaches, WalkingLegShape } from './navigation/walking-route.ts';

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
    private readonly map?: { nodes: RouteNode[]; levels: Level[]; shapeLeg?: WalkingLegShape };
    /**
     * Store the local navigation graph without calculating a route during initialization.
     */
    constructor(edges: RouteEdge[], map?: { nodes: RouteNode[]; levels: Level[]; shapeLeg?: WalkingLegShape }) {
        this.edges = edges;
        this.map = map;
    }
    /**
     * Calculate an illustrative route and open an expanded overview; this is not verified cross-station navigation.
     */
    showRoute(start = 'entry', end = 'destination'): void {
        const route = findRoute(this.edges, start, end, true);
        this.state.route = route && (this.map?.shapeLeg?.(route) ?? route);
        this.state.explode = 0.78;
        this.state.level = 'all';
        this.state.roof = false;
    }
    /** Draw a complete itinerary only when each ordered leg is present in the graph. */
    previewWalkingRoute(places: readonly string[], allowPaid: boolean, approaches?: WalkingApproaches) {
        const result = planWalkingRoute(this.edges, places, allowPaid, approaches, this.map?.shapeLeg);
        this.state.route = result.route ?? null;
        if (result.route) {
            const map = this.map;
            const districtB1 = map?.levels.find(level => level.id === 'district-underground');
            const singlePublicFloor = map && districtB1 && result.route.some(id =>
                map.nodes.find(node => node.id === id)?.level === districtB1.id) && result.route.every(id => {
                const node = map.nodes.find(item => item.id === id);
                const level = map.levels.find(item => item.id === node?.level);
                return level && level.y + (node?.elevationOffset ?? 0) === districtB1.y;
            });
            this.state.explode = singlePublicFloor ? 0 : 0.78;
            this.state.level = singlePublicFloor ? districtB1.id : 'all';
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
