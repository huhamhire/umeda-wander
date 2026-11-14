import type { LevelId, RouteEdge } from '../domain/map/model.ts';
import { findRoute } from '../domain/navigation/find-route.ts';

export interface MapViewState {
  explode: number; roof: boolean; level: LevelId | 'all'; route: string[] | null;
}
export class MapSession {
  state: MapViewState = { explode: 0.48, roof: true, level: 'all', route: null };
  constructor(private readonly edges: RouteEdge[]) {}
  showRoute(start = 'entry', end = 'destination'): void {
    this.state.route = findRoute(this.edges, start, end, true);
    this.state.explode = 0.78; this.state.level = 'all'; this.state.roof = false;
  }
  reset(): void { this.state = { explode: 0.48, roof: true, level: 'all', route: null }; }
}
