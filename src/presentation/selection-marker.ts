import * as T from 'three';
import {cameraOffset} from './view-orientation.ts';

/** A raised, beveled pin and ground halo; presentation only, never a map facility. */
export class SelectionMarker {
  readonly group=new T.Group();
  private floating=new T.Group();
  private halo:T.Mesh;
  private startedAt=0;
  constructor(){
    this.group.name='selected-facility-marker';
    const orange=new T.MeshStandardMaterial({color:0xee9254,emissive:0x9e471d,emissiveIntensity:0.25,roughness:0.45,depthTest:false,depthWrite:false});
    const haloMaterial=new T.MeshBasicMaterial({color:0xe89458,transparent:true,opacity:0.8,side:T.DoubleSide,depthTest:false,depthWrite:false});
    this.halo=new T.Mesh(new T.RingGeometry(2.5,3.05,48),haloMaterial);this.halo.rotation.x=-Math.PI/2;
    this.halo.name='selection-ground-halo';this.group.add(this.halo,this.floating);
    const shape=new T.Shape();shape.moveTo(0,0);
    shape.bezierCurveTo(-0.6,1,-2,2,-2,3);shape.bezierCurveTo(-2,5.6,2,5.6,2,3);
    shape.bezierCurveTo(2,2,0.6,1,0,0);
    const hole=new T.Path();hole.absarc(0,3.35,0.72,0,Math.PI*2,true);shape.holes.push(hole);
    const pin=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:0.65,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:0.13,bevelThickness:0.13,curveSegments:24}),orange);
    pin.name='floating-location-pin';this.floating.add(pin);
    this.floating.rotation.y=Math.atan2(cameraOffset.x,cameraOffset.z);
    this.group.traverse(o=>o.renderOrder=100);
    this.group.visible=false;
  }
  restart(now:number):void {this.startedAt=now;}
  update(now:number,reducedMotion:boolean,worldPerPixel:number):void {
    this.floating.rotation.y=Math.atan2(cameraOffset.x,cameraOffset.z);
    const elapsed=Math.max(0,now-this.startedAt),entry=reducedMotion?1:Math.min(1,elapsed/320);
    const eased=1-Math.pow(1-entry,3);
    this.group.scale.setScalar(T.MathUtils.clamp(worldPerPixel*4.8,0.65,4));
    this.floating.scale.setScalar(0.72+0.28*eased);
    this.floating.position.y=4+(reducedMotion?0:Math.sin(elapsed/1800*Math.PI*2)*0.32)+(1-eased)*2;
    this.halo.scale.setScalar(reducedMotion?1:1+Math.sin(elapsed/1800*Math.PI*2)*0.06);
  }
}
