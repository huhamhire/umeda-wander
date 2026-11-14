import type { VerticalConnection } from '../domain/map/model.ts';
export const escalatorOverallWidth=2.3;
export const escalatorTreadWidth=1.35;
export const escalatorLaneSpacing=2.45;

/** Independent, genuinely side-by-side lanes sharing a diagram reference. */
export function connectionLanes(connection:VerticalConnection):VerticalConnection[] {
  if(connection.lanes!==2)return [connection];
  const dx=connection.to.x-connection.from.x,dz=connection.to.z-connection.from.z,length=Math.hypot(dx,dz);
  if(length<1e-6)throw new Error('Parallel escalators need a horizontal run');
  return [-0.5,0.5].map((side,index)=>{
    const offset=side*escalatorLaneSpacing,ox=-dz/length*offset,oz=dx/length*offset;
    return {...connection,id:`${connection.id}:lane-${index+1}`,lanes:1,
      from:{...connection.from,x:connection.from.x+ox,z:connection.from.z+oz},
      to:{...connection.to,x:connection.to.x+ox,z:connection.to.z+oz}};
  });
}
