import * as T from 'three';

export function visibleLabelOccluders(candidates:T.Object3D[]):T.Object3D[]{
  return candidates.filter(object=>{
    for(let p:T.Object3D|null=object;p;p=p.parent)if(!p.visible)return false;
    if(!(object instanceof T.Mesh))return false;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    return materials.some(material=>material.visible&&material.opacity>=0.95);
  });
}

/** Orthographic rays are parallel; shooting from the camera eye gives false occlusions. */
export class LabelOcclusion {
  private raycaster=new T.Raycaster();
  private projected=new T.Vector3();
  private screen=new T.Vector2();
  isOccluded(anchor:T.Vector3,camera:T.Camera,occluders:T.Object3D[]):boolean {
    this.projected.copy(anchor).project(camera);this.screen.set(this.projected.x,this.projected.y);
    this.raycaster.setFromCamera(this.screen,camera);
    const distance=anchor.clone().sub(this.raycaster.ray.origin).dot(this.raycaster.ray.direction);
    if(distance<=0)return true;
    this.raycaster.near=0;this.raycaster.far=Math.max(0,distance-0.2);
    return this.raycaster.intersectObjects(occluders,false).length>0;
  }
}
