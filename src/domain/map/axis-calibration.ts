import type {Point2} from './model.ts';

/** Two independently chosen platform endpoints, not the building bounding box. */
export interface AxisCalibration {
  negativeEnd:Point2;positiveEnd:Point2;
  localCenter:number;localLength:number;acrossScale:number;
}
export function axisPlacement(c:AxisCalibration){
  const dx=c.positiveEnd.x-c.negativeEnd.x,dz=c.positiveEnd.z-c.negativeEnd.z;
  const length=Math.hypot(dx,dz);
  if(!(length>0&&c.localLength>0&&c.acrossScale>0))throw new Error('Invalid station calibration axis');
  const along=length/c.localLength,angle=Math.atan2(dz,dx);
  return {origin:{x:(c.negativeEnd.x+c.positiveEnd.x)/2-Math.cos(angle)*c.localCenter*along,
    z:(c.negativeEnd.z+c.positiveEnd.z)/2-Math.sin(angle)*c.localCenter*along},
    angle,planScale:{along,across:c.acrossScale}};
}
