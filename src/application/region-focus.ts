import type {StationId} from '../domain/map/model.ts';

/** District/commercial space has no station owner; keep it as muted context. */
export function isRegionMuted(focus:StationId|null|undefined,owner:StationId|null|undefined):boolean {
  return !!focus&&owner!==focus;
}
