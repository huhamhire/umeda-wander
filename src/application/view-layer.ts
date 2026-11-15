import type {Level,LevelId,StationId} from '../domain/map/model.ts';
import type {LayerRole} from './layer-focus.ts';
import {explorationElevation} from './exploration-level.ts';

export function viewLayerRole(levels:Level[],state:{level:LevelId|'all';focusStation?:StationId|null},target:LevelId):LayerRole{
  const level=levels.find(l=>l.id===target);
  if(!level)throw new Error(`Unknown layer ${target}`);
  if(state.level==='all')return 'normal';
  const active=levels.find(l=>l.id===state.level);
  if(!active)throw new Error(`Unknown focus layer ${state.level}`);
  const targetY=explorationElevation(level),activeY=explorationElevation(active);
  if(targetY===activeY)return 'current';
  return targetY<activeY?'context':'hidden';
}
