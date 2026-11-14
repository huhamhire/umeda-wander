import type {Level,LevelId,StationId} from '../domain/map/model.ts';
import {layerRole,type LayerRole} from './layer-focus.ts';

export function viewLayerRole(levels:Level[],state:{level:LevelId|'all';station?:StationId|'all'},target:LevelId):LayerRole{
  const level=levels.find(l=>l.id===target);
  if(!level)throw new Error(`Unknown layer ${target}`);
  const station=state.station??'jr-osaka';
  if(station!=='all'&&station!==(level.station??'jr-osaka'))return 'hidden';
  return layerRole(levels,state.level,target);
}
