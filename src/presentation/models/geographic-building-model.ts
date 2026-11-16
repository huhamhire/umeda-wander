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
  const body=new T.Mesh(buildFloorGeometry(volume.outline,volume.holes,volume.top-volume.base,volume.base),volume.base?glass:wall);
  body.userData.labelOccluder=true;body.castShadow=true;body.receiveShadow=true;section.add(body);
  const bands:T.BufferGeometry[]=[];
  for(let y=volume.base+4;y<volume.top;y+=4)bands.push(buildFloorGeometry(volume.outline,volume.holes,.22,y));
  bands.push(buildFloorGeometry(volume.outline,volume.holes,.5,volume.top));
  const geometry=mergeGeometries(bands)!;bands.forEach(g=>g.dispose());
  const rim=new T.Mesh(geometry,trim);rim.userData.labelOccluder=true;section.add(rim);
 }
 return group;
}
