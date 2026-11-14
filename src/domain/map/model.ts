export type LevelId = 'concourse' | 'platform' | 'bridge';
export type FacilityKind = 'gate' | 'ticket' | 'escalator' | 'elevator';
export interface Facility {
  id: string; name: string; kind: FacilityKind; level: LevelId;
  x: number; z: number; note: string;
}
export interface Level { id: LevelId; label: string; name: string; y: number }
export interface RouteNode { id: string; level: LevelId; x: number; z: number }
export interface RouteEdge { from: string; to: string; cost: number; kind: 'walk' | 'gate' | 'escalator'; directed?: boolean }
