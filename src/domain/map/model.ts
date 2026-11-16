export type StationId='jr-osaka'|'hankyu-umeda'|'metro-umeda'|'hanshin-umeda'|'higashi-umeda'|'nishi-umeda'|'kitashinchi';
export type LevelId = 'underground-platform' | 'underground-hall' | 'concourse' | 'mezzanine' | 'platform' | 'bridge'
  |'hankyu-ground'|'hankyu-hall'|'hankyu-platform'|'metro-hall'|'metro-intermediate'|'metro-platform'|'south-deck'
  |'hanshin-hall'|'hanshin-platform'|'hanshin-ground'|'hanshin-deck'|'t20-hall'|'t20-platform'|'t20-ground'
  |'y11-hall'|'y11-platform'|'y11-ground'|'kitashinchi-hall'|'kitashinchi-platform'|'kitashinchi-ground';
export type FacilityKind = 'entrance' | 'gate' | 'ticket' | 'ticket-machine' | 'escalator' | 'elevator' | 'stairs' | 'information'|'convenience-store'|'platform';
export interface Point2 { x: number; z: number }
/** A plan region can surround occupied blocks without filling their interiors. */
export interface PlanRegion {outline:Point2[];holes?:Point2[][]}
export interface StationSite {
  station:StationId;
  layers:{level:LevelId;regions:PlanRegion[];paidRegions:PlanRegion[]}[];
}
export interface Evidence { pages: number[]; detail: string; source?:'jr'|'hankyu'|'metro'|'hanshin'|'tanimachi'|'yotsubashi'|'kitashinchi'|'district';urls?:string[] }
export interface Facility {
  id: string; name: string; kind: FacilityKind; level: LevelId;
  x: number; z: number; note: string; evidence: Evidence;
  axis?: 'x' | 'z'; rotationRad?: number;
  elevationOffset?:number;
  connectionId?:string;platformId?:string;
  gateCount?:number;
}
export interface Level { id: LevelId; label: string; name: string; y: number; description: string; station?:StationId; stackIndex?:number }
export interface RouteNode { id: string; level: LevelId; x: number; z: number; elevationOffset?:number }
export interface RouteEdge { from: string; to: string; cost: number; kind: 'walk' | 'gate' | 'escalator'|'stairs'|'elevator'; directed?: boolean }
export interface FloorArea {
  id: string; level: LevelId; name: string; kind: 'public' | 'paid' | 'commercial' | 'service';
  outline: Point2[]; height?: number; label?: boolean; evidence: Evidence;
  elevationOffset?:number;
  labelStyle?:'floating'|'floor';
  holes?:Point2[][];
}
export interface Platform {
  id: string; level: LevelId; tracks: number[]; x: number; z: number; length: number; width: number; rotationRad: number; evidence: Evidence;
  name?:string; lineName?:string; lineColor?:number; trackSides?:Array<-1|1>; screenDoors?:'full-height'|'half-height'; terminal?:boolean;
  screenDoorSides?:Array<-1|1>;
  terminalEnd?:'start'|'end';
  /** Offline calibrated plan: quadratic lateral bow relative to the straight axis (metres). */
  planBow?:{sag:number;offset:number};
}
export interface VerticalConnection {
  id: string; kind: 'stairs' | 'escalator' | 'elevator'; from: RouteNode; to: RouteNode; evidence: Evidence;
  platformId?: string;
  width?:number;
  lanes?:1|2;
  laneSpacing?:number;
  stairLandingLength?:number;
  doorFacingRad?:number;
  placement?:'exterior';
}
export interface StationLayout {
  areas: FloorArea[]; platforms: Platform[]; connections: VerticalConnection[];
  railApproaches?:RailApproach[];
  guides?:PassageGuide[];
  buildings?:CommercialBuilding[];
  passages?:PublicPassage[];
  atria?:AtriumVoid[];
  concourses?:CommercialConcourse[];
}
export interface AtriumVoid {id:string;name:string;openings:{level:LevelId;outline:Point2[]}[];evidence:Evidence}
/** Self-contained station data; external public connections are assembled separately. */
export interface StationMap {
  id:StationId;name:string;levels:Level[];facilities:Facility[];
  nodes:RouteNode[];edges:RouteEdge[];layout:StationLayout;
  /** Optional reference-traced perimeter; absent modules derive it from their own floors. */
  site?:StationSite;
}
export type CommercialBuildingId='hankyu-dept'|'hankyu-grand'|'hanshin-dept'|'jp-tower'|'daimaru'|'lucua'|'lucua-1100'|'yodobashi'|'grand-front-south'|'grand-front-north';
export interface CommercialConcourse {
  id:string;name:string;level:LevelId;outline:Point2[];axis:[Point2,Point2];width:number;height:number;evidence:Evidence;
}
export interface CommercialBuilding {
  id:CommercialBuildingId;name:string;outline:Point2[];
  floors:{level:LevelId;name:string;elevationOffset?:number}[];evidence:Evidence;
  volumes?:{name:string;outline:Point2[];courtyards?:Point2[][];height:number;evidence:Evidence}[];
  podiumHeight?:number;
  podiumParts?:{name:string;outline:Point2[];height:number;evidence:Evidence}[];
  perimeterGallery?:{level:LevelId;innerOutline:Point2[]};
}
export interface PassageEndpoint extends Point2 {
  level:LevelId;buildingId?:CommercialBuildingId;station?:StationId;
  elevationOffset?:number;
  boundaryName?:string;
}
export interface PublicPassage {
  id:string;name:string;kind:'deck'|'underground'|'entrance';width:number;
  label?:boolean;
  /** Connectivity skeleton only; the corresponding excavated surface supplies its floor. */
  surfaceId?:string;
  points:PassageEndpoint[];evidence:Evidence;
}
export interface GuidePoint extends RouteNode {caption?:string}
export interface PassageGuide {
  id:string;name:string;access:'public'|'paid';points:GuidePoint[];evidence:Evidence;
}
export interface RailNode {id:string;point:Point2;kind:'platform-end'|'junction'|'outlet'|'end'}
export interface RailSegment {
  id:string;from:string;to:string;control1:Point2;control2:Point2;
  platformId?:string;track?:number;
}
export interface RailApproach {
  id:string;station:StationId;level:LevelId;name:string;color:number;
  nodes:RailNode[];segments:RailSegment[];labelPoint:Point2;evidence:Evidence;
}
export interface FloorOpening {
  connectionId: string; level: LevelId; kind: VerticalConnection['kind']|'atrium'; outline: Point2[];
}
