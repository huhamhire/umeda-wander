export type LevelId = 'underground-platform' | 'underground-hall' | 'concourse' | 'mezzanine' | 'platform' | 'bridge';
export type FacilityKind = 'entrance' | 'gate' | 'ticket' | 'ticket-machine' | 'escalator' | 'elevator' | 'stairs' | 'information';
export interface Point2 { x: number; z: number }
export interface Evidence { pages: number[]; detail: string }
export interface Facility {
  id: string; name: string; kind: FacilityKind; level: LevelId;
  x: number; z: number; note: string; evidence: Evidence;
  axis?: 'x' | 'z'; rotationRad?: number;
  elevationOffset?:number;
}
export interface Level { id: LevelId; label: string; name: string; y: number; description: string }
export interface RouteNode { id: string; level: LevelId; x: number; z: number; elevationOffset?:number }
export interface RouteEdge { from: string; to: string; cost: number; kind: 'walk' | 'gate' | 'escalator'; directed?: boolean }
export interface FloorArea {
  id: string; level: LevelId; name: string; kind: 'public' | 'paid' | 'commercial' | 'service';
  outline: Point2[]; height?: number; label?: boolean; evidence: Evidence;
  elevationOffset?:number;
}
export interface Platform {
  id: string; level: LevelId; tracks: number[]; x: number; z: number; length: number; width: number; rotationRad: number; evidence: Evidence;
}
export interface VerticalConnection {
  id: string; kind: 'stairs' | 'escalator' | 'elevator'; from: RouteNode; to: RouteNode; evidence: Evidence;
  platformId?: string;
  width?:number;
  lanes?:1|2;
  doorFacingRad?:number;
  placement?:'exterior';
}
export interface StationLayout {
  areas: FloorArea[]; platforms: Platform[]; connections: VerticalConnection[];
}
export interface FloorOpening {
  connectionId: string; level: LevelId; kind: VerticalConnection['kind']; outline: Point2[];
}
