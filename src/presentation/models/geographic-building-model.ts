import {entranceVoid,buildStationEntrance} from './station-entrance-model.ts';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {GeographicBuilding} from '../../infrastructure/buildings/building-data.ts';
import {buildFloorGeometry} from '../floor-geometry.ts';
/** Shared metre-scale exterior; detached from walkable floors and their openings. */
export function buildGeographicBuilding(building:GeographicBuilding){
 const group=new T.Group();group.name='geographic-building-'+building.id;
 const warm=['hankyu-dept','hankyu-grand','daimaru','hanshin-dept'].includes(building.id);
 const wall=new T.MeshStandardMaterial({color:warm?0xd8d4c9:0xb8cdca,roughness:.75});
 const glass=new T.MeshStandardMaterial({color:0x91aaa9,roughness:.65,metalness:.12});
 const trim=new T.MeshStandardMaterial({color:0xe4e8df,roughness:.85});
 for(const volume of building.volumes){
  const section=new T.Group();section.name=volume.name;group.add(section);
  const entrance=volume.base===0?building.entrance:undefined;
  const pieces=entrance?[{base:0,top:entrance.height,holes:[...volume.holes,entranceVoid(entrance)]},{base:entrance.height,top:volume.top,holes:volume.holes}]:[{base:volume.base,top:volume.top,holes:volume.holes}];
  for(const piece of pieces){
    const body=new T.Mesh(buildFloorGeometry(volume.outline,piece.holes,piece.top-piece.base,piece.base),volume.base?glass:wall);
    body.userData.labelOccluder=true;body.castShadow=true;body.receiveShadow=true;section.add(body);
  }
  if(entrance)group.add(buildStationEntrance(entrance));
  if(volume.holes.length){
    for(const hole of volume.holes){const garden=new T.Mesh(buildFloorGeometry(hole,[],.3,volume.base+.1),new T.MeshStandardMaterial({color:0x98af91,roughness:1}));garden.name='roof-court-garden';section.add(garden);}
  }
  const bands:T.BufferGeometry[]=[];
  for(let y=volume.base+4;y<volume.top;y+=4)bands.push(buildFloorGeometry(volume.outline,entrance&&y<entrance.height?[...volume.holes,entranceVoid(entrance)]:volume.holes,.22,y));
  bands.push(buildFloorGeometry(volume.outline,volume.holes,.5,volume.top));
  const geometry=mergeGeometries(bands)!;bands.forEach(g=>g.dispose());
  if(volume.base&&['hankyu-dept','hankyu-grand','daimaru'].includes(building.id)){
    const fins:T.BufferGeometry[]=[];
    for(let i=1;i<volume.outline.length;i++){
      const a=volume.outline[i-1]!,b=volume.outline[i]!,dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),count=Math.floor(length/4);
      for(let j=1;j<count;j++){
        const g=new T.BoxGeometry(.45,volume.top-volume.base,.8);
        g.rotateY(-Math.atan2(dz,dx));g.translate(a.x+dx*j/count,(volume.base+volume.top)/2,a.z+dz*j/count);fins.push(g);
      }
    }
    if(fins.length){section.add(new T.Mesh(mergeGeometries(fins)!,trim));fins.forEach(g=>g.dispose());}
  }
  const rim=new T.Mesh(geometry,trim);rim.userData.labelOccluder=true;section.add(rim);
 }
 for(const sign of building.signs??[]){
  const backing=new T.Mesh(new T.PlaneGeometry(sign.width,sign.height),new T.MeshStandardMaterial({color:0x405754,roughness:.9,side:T.DoubleSide}));
  const c=Math.cos(sign.angle),s=Math.sin(sign.angle);
  backing.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(c,0,s),new T.Vector3(0,1,0),new T.Vector3(-s,0,c)));
  backing.position.set(sign.center.x-s*.6,sign.y,sign.center.z+c*.6);backing.name='station-facade-sign';group.add(backing);
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=256;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#f1f1e4';ctx.textAlign='center';ctx.textBaseline='middle';const lines=sign.text.split('\n');ctx.font=`600 ${lines.length>1?90:150}px "Yu Gothic","Microsoft YaHei",sans-serif`;lines.forEach((line,i)=>ctx.fillText(line,1024,128+(i-(lines.length-1)/2)*112,1950));
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const text=new T.Mesh(new T.PlaneGeometry(sign.width*.95,sign.height*.9),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
    text.quaternion.copy(backing.quaternion);text.position.copy(backing.position).add(new T.Vector3(-s*.05,0,c*.05));text.name='station-facade-sign-text';group.add(text);
  }
 }
 return group;
}
