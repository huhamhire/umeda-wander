import * as T from 'three';
import type {StationId} from '../domain/map/model.ts';
import {isRegionMuted} from '../application/region-focus.ts';

export function setRegionOwner<O extends T.Object3D>(object:O,owner:StationId|null):O {
  object.userData.regionStation=owner;return object;
}
export function regionOwner(object:T.Object3D,fallback:StationId|null=null):StationId|null {
  for(let current:T.Object3D|null=object;current;current=current.parent)
    if(Object.hasOwn(current.userData,'regionStation'))return current.userData.regionStation as StationId|null;
  return fallback;
}

/** Assign cloned muted materials, so shared materials never tint the current floor. */
export class LayerAppearance {
  private originals=new WeakMap<T.Mesh,T.Material|T.Material[]>();
  private variants=new Map<T.Material,T.Material>();
  private roles=new WeakMap<T.Mesh,boolean>();
  apply(group:T.Object3D,context:boolean,focus?:StationId|null,owner:StationId|null=null):void {
    group.traverse(object=>{
      if(!(object instanceof T.Mesh))return;
      const muted=context||isRegionMuted(focus,regionOwner(object,owner));
      if(this.roles.get(object)===muted)return;
      const original=this.originals.get(object)??(object.material as T.Material|T.Material[]);
      this.originals.set(object,original);
      object.material=muted?(Array.isArray(original)?original.map(m=>this.muted(m)):this.muted(original)):original;
      this.roles.set(object,muted);
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
