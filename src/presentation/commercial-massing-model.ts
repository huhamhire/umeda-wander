import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {CommercialBuilding,FloorArea,PublicPassage} from '../domain/map/model.ts';
import {passageOutline} from '../domain/map/geometry.ts';
import {buildFloorGeometry} from './floor-geometry.ts';
import {addYodobashiMassingDetails} from './yodobashi-massing-details.ts';

/** Compressed skyline silhouettes; hidden in floor exploration to expose walking connections. */
export function buildCommercialMassing(building:CommercialBuilding,context?:{areas:FloorArea[];passages:PublicPassage[]}):T.Group {
  const group=new T.Group();group.name=`massing-${building.id}`;
  const glass=new T.MeshStandardMaterial({color:0xc7d8d4,roughness:0.7,metalness:0.12});
  const trim=new T.MeshStandardMaterial({color:0xe4e9df,roughness:0.85});
  const podiumHeight=building.podiumHeight??0,base=podiumHeight?podiumHeight+0.35:2;
  const podiumOutline=building.perimeterGallery?.innerOutline??building.outline;
  if(podiumHeight){
    const podium=new T.Group();podium.name='podium';group.add(podium);
    const level=building.floors.find(f=>f.name==='2F')!.level;
    const openings=(context?.areas??[]).filter(a=>a.kind==='public'&&a.level===level).map(a=>a.outline);
    for(const p of context?.passages??[])for(let i=1;i<p.points.length;i++){
      const a=p.points[i-1]!,b=p.points[i]!;
      if([a,b].some(v=>v.buildingId===building.id&&v.level===level)){
        const length=Math.hypot(b.x-a.x,b.z-a.z),dx=(b.x-a.x)/length,dz=(b.z-a.z)/length;
        openings.push(passageOutline(
          a.buildingId===building.id?{x:a.x-dx*3,z:a.z-dz*3}:a,
          b.buildingId===building.id?{x:b.x+dx*3,z:b.z+dz*3}:b,p.width+1));
      }
    }
    const wall=new T.MeshStandardMaterial({color:0xb6c9c1,roughness:0.87});
    for(const part of building.podiumParts??[{name:'podium-envelope',outline:podiumOutline,height:podiumHeight}]){
      const section=new T.Group();section.name=part.name;podium.add(section);
      for(const [geometry,material,name]of [
        [buildFloorGeometry(part.outline,openings,2.35,0.45),wall,'podium-lower-envelope'],
        [buildFloorGeometry(part.outline,[],part.height-2.8,2.8),wall,'podium-upper-envelope'],
        [buildFloorGeometry(part.outline,[],0.35,part.height),trim,'podium-roof-terrace'],
      ] as const){
        const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.userData.labelOccluder=true;
        mesh.castShadow=true;mesh.receiveShadow=true;section.add(mesh);
      }
    }
  }
  for(const volume of building.volumes??[]){
    const tower=new T.Group();tower.name=volume.name;group.add(tower);
    const body=new T.Mesh(buildFloorGeometry(volume.outline,[],volume.height,base),glass);
    body.name='tower-envelope';body.userData.labelOccluder=true;body.castShadow=true;body.receiveShadow=true;tower.add(body);
    const bands:T.BufferGeometry[]=[];
    const center=volume.outline.reduce((s,p)=>({x:s.x+p.x/volume.outline.length,z:s.z+p.z/volume.outline.length}),{x:0,z:0});
    const rim=volume.outline.map(p=>({x:center.x+(p.x-center.x)*1.012,z:center.z+(p.z-center.z)*1.012}));
    if(building.id!=='yodobashi')for(let y=base+2;y<volume.height+base;y+=2)bands.push(buildFloorGeometry(rim,[],0.12,y));
    bands.push(buildFloorGeometry(rim,[],0.35,volume.height+base));
    const geometry=mergeGeometries(bands)!;bands.forEach(g=>g.dispose());
    const mesh=new T.Mesh(geometry,trim);mesh.name='tower-horizontal-bands';mesh.userData.labelOccluder=true;tower.add(mesh);
  }
  if(building.id==='yodobashi')addYodobashiMassingDetails(group,building);
  return group;
}
