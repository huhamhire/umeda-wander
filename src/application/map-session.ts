import type { LevelId, RouteEdge,StationId } from '../domain/map/model.ts';
import { findRoute } from '../domain/navigation/find-route.ts';

export interface MapViewState {
  explode: number; roof: boolean; level: LevelId | 'all'; route: string[] | null; focusStation?:StationId|null;
}
export class MapSession {
  state: MapViewState = { explode: 0.48, roof: true, level: 'all', route: null,focusStation:null };
  private readonly edges:RouteEdge[];
  constructor(edges: RouteEdge[]) {this.edges=edges;}
  showRoute(start = 'entry', end = 'destination'): void {
    this.state.route = findRoute(this.edges, start, end, true);
    this.state.explode = 0.78; this.state.level = 'all'; this.state.roof = false;
  }
  focusStation(station:StationId|null):void {this.state.focusStation=station;this.state.level=station==='metro-umeda'?'metro-hall':'all';this.state.route=null;}
  reset(): void { this.state = { explode: 0.48, roof: true, level: 'all', route: null,focusStation:null }; }
}
