import * as T from 'three';

/** Assign cloned muted materials, so shared materials never tint the current floor. */
export class LayerAppearance {
  private originals=new WeakMap<T.Mesh,T.Material|T.Material[]>();
  private variants=new Map<T.Material,T.Material>();
  private roles=new WeakMap<T.Mesh,boolean>();
  apply(group:T.Object3D,context:boolean):void {
    group.traverse(object=>{
      if(!(object instanceof T.Mesh)||this.roles.get(object)===context)return;
      const original=this.originals.get(object)??(object.material as T.Material|T.Material[]);
      this.originals.set(object,original);
      object.material=context?(Array.isArray(original)?original.map(m=>this.muted(m)):this.muted(original)):original;
      this.roles.set(object,context);
    });
  }
  private muted(original:T.Material):T.Material {
    let result=this.variants.get(original);
    if(result)return result;
    result=original.clone();result.name=`${original.name}-lower-context`;
    if('color' in result && result.color instanceof T.Color)result.color.lerp(new T.Color(0xcbd0c7),0.82);
    if('emissive' in result && result.emissive instanceof T.Color)result.emissive.multiplyScalar(0.1);
    if(result.transparent)result.opacity*=0.65;
    this.variants.set(original,result);return result;
  }
}
