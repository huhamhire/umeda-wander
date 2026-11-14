import type { Platform, VerticalConnection } from '../domain/map/model.ts';

/** Model local X: escalator run, or elevator cross-door axis. */
export function connectionHeading(connection:VerticalConnection,platforms:Platform[],fromY:number,toY:number):number {
  const low=fromY<toY?connection.from:connection.to,high=fromY<toY?connection.to:connection.from;
  if(connection.kind!=='elevator')return Math.atan2(high.z-low.z,high.x-low.x);
  const platform=platforms.find(item=>item.id===connection.platformId);
  if(!platform)throw new Error(`Elevator ${connection.id} needs a platform reference`);
  const toward=(platform.x-low.x)*Math.cos(platform.rotationRad)+(platform.z-low.z)*Math.sin(platform.rotationRad);
  // Doors face along the platform toward its usable central length.
  return platform.rotationRad-(toward>=0?1:-1)*Math.PI/2;
}
