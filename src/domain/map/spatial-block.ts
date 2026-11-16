import type {GeoPoint} from './geography.ts';
import type {Evidence, LevelId, Point2, StationId} from './model.ts';

/** A gate seam, not an inter-station route. Normal points toward public space. */
export interface StationPublicInterface {
  id:string;station:StationId;gateId:string;level:LevelId;elevation:number;
  boundary:[Point2,Point2];inside:Point2;outside:Point2;width:number;
  access:'public';evidence:Evidence;
}

/** Geographic plan only: metres, east +x, south +z. No display clearance. */
export interface GeographicFrame {origin:GeoPoint}
export interface SpatialEnvelope {
  id:string;
  role:'building'|'platform-reservation';
  outline:Point2[];
  holes:Point2[][];
  source:string;
  certainty:'source-geometry'|'approximate';
}
export interface StationCalibration {
  station:StationId;
  status:'envelope-review'|'interior-review'|'accepted';
  envelopes:SpatialEnvelope[];
  notes:string[];
}

export function toGeographicPlan(point:GeoPoint,frame:GeographicFrame):Point2 {
  return {x:(point.lon-frame.origin.lon)*111320*Math.cos(frame.origin.lat*Math.PI/180),
    z:(frame.origin.lat-point.lat)*111320};
}
export function fromGeographicPlan(point:Point2,frame:GeographicFrame):GeoPoint {
  return {lon:frame.origin.lon+point.x/(111320*Math.cos(frame.origin.lat*Math.PI/180)),
    lat:frame.origin.lat-point.z/111320};
}
