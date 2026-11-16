import type {Evidence,FloorArea,LevelId,PlanRegion} from './model.ts';

/** Administrative cut only; it must never replace the reference excavation outline. */
export interface PublicBlockDefinition {
  id:string;name:string;mask?:PlanRegion;evidence:Evidence;
}
export interface PublicAreaBlock {
  id:string;name:string;level:LevelId;areas:FloorArea[];evidence:Evidence;
}
/** A known connection has authored geometry; no nearest-point route inference. */
export interface PublicRegionPatch {
  id:string;blockId:string;name:string;region:PlanRegion;evidence:Evidence;
}
export interface BasementOccupancy {
  id:string;name:string;region:PlanRegion;evidence:Evidence;
}
