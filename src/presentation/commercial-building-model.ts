import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {CommercialBuilding,CommercialBuildingId,PublicPassage} from '../domain/map/model.ts';
import {buildFloorGeometry} from './floor-geometry.ts';
import {touchesPublicConnection,type PublicContactContext} from '../application/passage-clearance.ts';

const palettes:Record<CommercialBuildingId,{floor:number;wall:number;trim:number}>={
  'hankyu-dept':{floor:0xe7d6d4,wall:0xd6b9b7,trim:0xa27b78},
  daimaru:{floor:0xe4dcc5,wall:0xd1c7a9,trim:0x9c9974},
  lucua:{floor:0xe7dece,wall:0xd7c7af,trim:0x9c8d78},
  'lucua-1100':{floor:0xe4dcd0,wall:0xcbbdae,trim:0x9b8b80},
  yodobashi:{floor:0xdce7e4,wall:0xbacfcf,trim:0x7f9b9c},
};
const unit=new T.BoxGeometry(1,1,1);
/** Footprint shell only: no shop partitions, internal circulation or full-height tower. */
export function buildCommercialFloor(building:CommercialBuilding,floor:CommercialBuilding['floors'][number],passages:PublicPassage[],context?:PublicContactContext):T.Group {
  const group=new T.Group();group.name=`commercial-${building.id}-${floor.name}`;
  const palette=palettes[building.id],parts:T.BufferGeometry[]=[],trim:T.BufferGeometry[]=[];
  const doors=passages.flatMap(p=>p.points.filter(v=>v.buildingId===building.id&&v.level===floor.level).map(v=>({...v,clearance:p.width/2+1.2})));
  const block=(target:T.BufferGeometry[],x:number,y:number,z:number,w:number,h:number,d:number,angle:number)=>{
    const transform=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-angle),new T.Vector3(w,h,d));
    target.push(unit.clone().applyMatrix4(transform));
  };
  for(let i=0;i<building.outline.length;i++){
    const a=building.outline[i]!,b=building.outline[(i+1)%building.outline.length]!,dx=b.x-a.x,dz=b.z-a.z;
    const length=Math.hypot(dx,dz),count=Math.ceil(length/2),angle=Math.atan2(dz,dx);
    for(let j=0;j<count;j++){
      const t=(j+0.5)/count,x=a.x+dx*t,z=a.z+dz*t;
      if(doors.some(p=>Math.hypot(p.x-x,p.z-z)<p.clearance))continue;
      if(context&&[-0.5,-0.25,0,0.25,0.5].some(offset=>touchesPublicConnection({x:x+dx/count*offset,z:z+dz/count*offset},floor,context,0.25)))continue;
      block(parts,x,1.05,z,length/count+0.01,1.4,0.32,angle);
      block(trim,x,1.86,z,length/count+0.01,0.16,0.46,angle);
    }
  }
  const add=(geometry:T.BufferGeometry,color:number,name:string)=>{
    const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:0.87}));
    mesh.userData.labelOccluder=true;
    mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  };
  add(buildFloorGeometry(building.outline,[],0.4,0.05),palette.floor,'building-footprint');
  for(const [geometries,color,name]of [[parts,palette.wall,'facade-outline'],[trim,palette.trim,'facade-trim']] as const){
    if(!geometries.length)continue;
    const geometry=mergeGeometries([...geometries]);if(geometry)add(geometry,color,name);
    geometries.forEach(g=>g.dispose());
  }
  group.position.y=floor.elevationOffset??0;
  return group;
}
