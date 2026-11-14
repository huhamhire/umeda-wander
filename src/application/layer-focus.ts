import type { Level, LevelId } from '../domain/map/model.ts';
export type LayerRole='normal'|'current'|'context'|'hidden';
export function layerRole(levels:Level[],focus:LevelId|'all',target:LevelId):LayerRole {
  if(focus==='all')return 'normal';
  const active=levels.find(level=>level.id===focus),level=levels.find(level=>level.id===target);
  if(!active||!level)throw new Error('Unknown focus layer');
  if(target===focus)return 'current';
  return level.y<active.y?'context':'hidden';
}
