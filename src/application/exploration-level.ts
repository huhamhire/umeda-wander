import type {Level} from '../domain/map/model.ts';

/** Exploration bands combine local half-floors without changing physical heights. */
export function explorationElevation(level:Level):number {
  if(level.id==='south-deck'||level.id==='hanshin-deck')return 8;
  if(level.id==='mezzanine')return 0;
  if(level.id==='metro-intermediate')return -8;
  if(level.id==='kitashinchi-platform')return -16;
  return level.y;
}
