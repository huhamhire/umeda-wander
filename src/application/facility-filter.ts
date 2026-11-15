import type {Facility,FacilityKind,Level,LevelId,StationId} from '../domain/map/model.ts';
import {explorationElevation} from './exploration-level.ts';

export function facilityCategory(kind:FacilityKind):FacilityKind {return kind==='ticket-machine'?'ticket':kind;}

export function filterFacilities(facilities:Facility[],levels:Level[],filter:{station:StationId|null;level:LevelId|'all';kind:FacilityKind|'all'}):Facility[]{
  const selected=levels.find(l=>l.id===filter.level);
  return facilities.filter(f=>{
    const owner=levels.find(l=>l.id===f.level)!;
    return (!filter.station||owner.station===filter.station)&&
      (!selected||explorationElevation(owner)===explorationElevation(selected))&&
      (filter.kind==='all'||(filter.kind==='ticket'?facilityCategory(f.kind)==='ticket':f.kind===filter.kind));
  });
}
