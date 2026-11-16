import * as T from 'three';
import type {LevelId,PublicPassage,StationId} from '../domain/map/model.ts';
import type {LayerRole} from '../application/layer-focus.ts';
import {LayerAppearance} from './layer-appearance.ts';
import {publicAreaColor,undergroundPublicColor} from './station-palette.ts';
import {touchesPublicConnection,type PublicContactContext} from '../application/passage-clearance.ts';

const unit=new T.BoxGeometry(1,1,1);
/** Exterior slabs and parapets follow both endpoint floors through the exploded view. */
export class PublicPassageModel {
  readonly passage:PublicPassage;
  readonly group=new T.Group();
  private previousHeights='';
  private appearance=new LayerAppearance();
  private parts:{group:T.Group;slab:T.Mesh;rails:T.Mesh[];posts:T.InstancedMesh;postPositions:{progress:number;side:number}[];index:number}[]=[];
  constructor(passage:PublicPassage,context?:PublicContactContext){
    this.passage=passage;this.group.name=passage.id;
    const underground=passage.kind==='underground';
    const floor=new T.MeshStandardMaterial({color:underground?undergroundPublicColor:publicAreaColor,roughness:0.9});
    const edge=new T.MeshStandardMaterial({color:0xc9d3c9,roughness:0.85});
    for(let i=1;i<passage.points.length;i++){
      const a=passage.points[i-1]!,b=passage.points[i]!,group=new T.Group(),slab=new T.Mesh(unit,floor);
      slab.name='passage-floor';
      slab.userData.labelOccluder=true;
      const length=Math.hypot(b.x-a.x,b.z-a.z);
      if(length<0.05)throw new Error(`Degenerate public passage: ${passage.id}`);
      const nx=-(b.z-a.z)/length,nz=(b.x-a.x)/length,rails:T.Mesh[]=[],postPositions:{progress:number;side:number}[]=[];
      const joins=(t:number,side:number,margin:number)=>{
        if(!context)return false;
        const ay=context.levels.find(l=>l.id===a.level)!.y,by=context.levels.find(l=>l.id===b.level)!.y;
        const offset=(a.elevationOffset??0)*(1-t)+(b.elevationOffset??0)*t+(by-ay)*t;
        return touchesPublicConnection({x:a.x+(b.x-a.x)*t+nx*side*passage.width/2,z:a.z+(b.z-a.z)*t+nz*side*passage.width/2},
          {level:a.level,elevationOffset:offset},context,margin,passage.id);
      };
      if(!underground)for(const side of [-1,1]){
        const count=Math.ceil(length/2);
        for(let j=0;j<count;j++){
          const t=(j+0.5)/count;if([j/count,t,(j+1)/count].some(progress=>joins(progress,side,0.25)))continue;
          const mesh=new T.Mesh(unit,edge);mesh.name='passage-railing';mesh.userData={progress:t,side,fraction:1/count};rails.push(mesh);
        }
        const postCount=Math.ceil(length/0.9);
        for(let j=0;j<=postCount;j++){
          const t=j/postCount;if(joins(t,side,0.2))continue;
          postPositions.push({progress:t,side});
        }
      }
      const posts=new T.InstancedMesh(unit,edge,postPositions.length);posts.name='passage-post';posts.frustumCulled=false;
      posts.instanceMatrix.setUsage(T.DynamicDrawUsage);
      slab.castShadow=true;slab.receiveShadow=true;group.add(slab,...rails);
      if(!underground)group.add(posts);
      group.name=`${passage.id}-${i}`;this.group.add(group);this.parts.push({group,slab,rails,posts,postPositions,index:i-1});
    }
  }
  update(elevation:(id:LevelId)=>number,role:(id:LevelId)=>LayerRole,focus?:StationId|null):void {
    const heights=this.passage.points.map(p=>elevation(p.level)+(p.elevationOffset??0)),key=heights.join(',');
    const changed=key!==this.previousHeights;this.previousHeights=key;
    for(const part of this.parts){
      const a=this.passage.points[part.index]!,b=this.passage.points[part.index+1]!;
      const roles=[role(a.level),role(b.level)];part.group.visible=!roles.every(r=>r==='hidden');
      const owner=a.station&&a.station===b.station?a.station:null;
      this.appearance.apply(part.group,roles.every(r=>r==='context'),focus,owner);
      if(!changed)continue;
      const from=new T.Vector3(a.x,heights[part.index]!+0.42,a.z),to=new T.Vector3(b.x,heights[part.index+1]!+0.42,b.z);
      const delta=to.clone().sub(from),length=delta.length(),flat=Math.hypot(delta.x,delta.z);
      const normal=new T.Vector3(-delta.z/flat,0,delta.x/flat);
      const rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(1,0,0),delta.clone().normalize());
      const width=this.passage.width;
      part.slab.position.copy(from).lerp(to,0.5);part.slab.quaternion.copy(rotation);part.slab.scale.set(length+0.15,0.45,width);
      part.rails.forEach(rail=>{
        rail.position.copy(from).lerp(to,rail.userData.progress).addScaledVector(normal,rail.userData.side*width/2);rail.position.y+=1.35;
        rail.quaternion.copy(rotation);rail.scale.set(length*rail.userData.fraction+0.1,0.065,0.065);
      });
      const matrix=new T.Matrix4(),position=new T.Vector3();
      part.postPositions.forEach((post,index)=>{
        position.copy(from).lerp(to,post.progress).addScaledVector(normal,post.side*width/2);position.y+=0.8;
        matrix.makeScale(0.045,1.6,0.045);matrix.setPosition(position);part.posts.setMatrixAt(index,matrix);
      });
      part.posts.instanceMatrix.needsUpdate=true;
      part.posts.computeBoundingSphere();
    }
    this.group.visible=this.parts.some(p=>p.group.visible);this.group.updateMatrixWorld(true);
  }
}
