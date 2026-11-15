import * as T from 'three';
/** Fixed orthographic illustration view, matching the official diagram's gentle rail angle. */
export const cameraOffset=new T.Vector3(-130,170,240);
export function viewBasis():{right:T.Vector3;up:T.Vector3} {
  const back=cameraOffset.clone().normalize();
  const right=new T.Vector3(0,1,0).cross(back).normalize();
  return {right,up:back.clone().cross(right).normalize()};
}
export function screenDirection(angleRad:number):T.Vector2 {
  const direction=new T.Vector3(Math.cos(angleRad),0,Math.sin(angleRad));
  const {right,up}=viewBasis();
  return new T.Vector2(direction.dot(right),-direction.dot(up)).normalize();
}
