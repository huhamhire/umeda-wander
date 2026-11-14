import * as T from 'three';
import type { Level, LevelId, Platform, VerticalConnection } from '../domain/map/model.ts';
import { elevatorShaftWidth } from '../application/connection-openings.ts';
import { connectionHeading } from '../application/connection-orientation.ts';
import {connectionLanes,escalatorTreadWidth} from '../application/connection-lanes.ts';

const unitBox = new T.BoxGeometry(1,1,1);
const materials = new Map<number,T.MeshStandardMaterial>();
const instanceTransform = new T.Matrix4();
function material(color:number):T.MeshStandardMaterial {
  let result=materials.get(color);
  if(!result){result=new T.MeshStandardMaterial({color,roughness:0.65,metalness:0.15});materials.set(color,result);}
  return result;
}
function box(group:T.Group,name:string,x:number,y:number,z:number,w:number,h:number,d:number,color:number):T.Mesh {
  const mesh=new T.Mesh(unitBox,material(color));mesh.name=name;mesh.position.set(x,y,z);mesh.scale.set(w,h,d);
  mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
}
function instances(group:T.Group,name:string,count:number,color:number):T.InstancedMesh {
  const mesh=new T.InstancedMesh(unitBox,material(color),count);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;group.add(mesh);return mesh;
}
function place(mesh:T.InstancedMesh,index:number,x:number,y:number,z:number,w:number,h:number,d:number):void {
  instanceTransform.makeScale(w,h,d);instanceTransform.setPosition(x,y,z);mesh.setMatrixAt(index,instanceTransform);
}

/** Procedural facility model. Coordinates are local to the lower landing. */
export class VerticalConnectionModel {
  readonly connection:VerticalConnection;
  readonly group=new T.Group();
  private body=new T.Group();
  private lowLanding=new T.Group();
  private highLanding=new T.Group();
  private low:VerticalConnection['from'];
  private high:VerticalConnection['to'];
  private run:number;
  private heading:number;
  private steps?:T.InstancedMesh;
  private risers?:T.InstancedMesh;
  private stripes?:T.InstancedMesh;
  private grooves?:T.InstancedMesh;
  private belts:T.Mesh[]=[];
  private endCaps:T.Mesh[]=[];
  private sidePanels?:T.Mesh;
  private underframe:T.Mesh[]=[];
  private shaft?:T.Mesh;
  private shaftPosts:T.Mesh[]=[];
  private shaftCaps:T.Group[]=[];
  private cabin=new T.Group();
  private readonly count:number;
  private readonly treadWidth:number;
  private lanes:VerticalConnectionModel[]=[];
  private previousLowY?:number;
  private previousHighY?:number;
  private previousFocus?:LevelId|'all';

  constructor(connection:VerticalConnection,levels:Level[],platforms:Platform[]) {
    this.connection=connection;
    const fromY=levels.find(l=>l.id===connection.from.level)!.y+(connection.from.elevationOffset??0),toY=levels.find(l=>l.id===connection.to.level)!.y+(connection.to.elevationOffset??0);
    this.count=connection.kind==='stairs'?Math.max(4,Math.ceil(Math.abs(toY-fromY)/0.24)):28;
    this.treadWidth=connection.width?connection.width-0.6:connection.kind==='escalator'?escalatorTreadWidth:2.15;
    [this.low,this.high]=fromY<toY?[connection.from,connection.to]:[connection.to,connection.from];
    this.run=Math.hypot(this.high.x-this.low.x,this.high.z-this.low.z);
    this.heading=connectionHeading(connection,platforms,fromY,toY);
    this.group.name=`${connection.kind}-${connection.id}`;
    this.body.name='connection-body';this.lowLanding.name='lower-landing';this.highLanding.name='upper-landing';
    this.group.add(this.body,this.lowLanding,this.highLanding);
    if(connection.lanes===2){
      this.lanes=connectionLanes(connection).map(lane=>new VerticalConnectionModel(lane,levels,platforms));
      this.group.clear();for(const lane of this.lanes)this.group.add(lane.group);return;
    }
    if(connection.kind==='elevator')this.buildElevator();else this.buildStairway();
  }

  private landing(group:T.Group,elevator=false):void {
    if(elevator){
      const w=elevatorShaftWidth;
      box(group,'landing-sill',0,0,w/2+0.4,w-0.2,0.14,1,0xbcc8bb);
      for(const x of [-1.55,1.55])box(group,'landing-door-frame',x,1.25,w/2+0.05,0.16,2.5,0.2,0x557f7a);
      box(group,'landing-door-lintel',0,2.5,w/2+0.05,3.25,0.18,0.2,0x557f7a);
      for(const x of [-0.7,0.7])box(group,'landing-split-door',x,1.2,w/2+0.05,1.36,2.3,0.08,0xb8c7bd);
      box(group,'landing-direction-light',0,2.78,w/2+0.05,0.8,0.23,0.15,0x6ca594);
    }else{
      box(group,'comb-plate',0,0,0,1.65,0.16,this.treadWidth+0.4,0xc0cbc1);
      if(this.connection.kind==='escalator')for(let i=0;i<7;i++)box(group,'comb-teeth',0,0.1,(i/6-0.5)*this.treadWidth,1.35,0.035,0.06,0xd5bd71);
    }
  }
  private buildStairway():void {
    const escalator=this.connection.kind==='escalator';
    this.steps=instances(this.body,'tread-surfaces',this.count,escalator?0x5a706b:0xaeb9a4);
    this.risers=instances(this.body,'step-risers',this.count,escalator?0x82958a:0x99a98d);
    this.stripes=instances(this.body,'tread-edge-stripes',this.count,escalator?0xddc579:0xd5dcc9);
    if(escalator)this.grooves=instances(this.body,'tread-grooves',this.count*6,0x98a99d);
    for(const side of [-1,1]){
      for(const offset of escalator?[0.48,1.28]:[1.1]){
        const belt=new T.Mesh(unitBox,material(escalator?0x344d48:0x63816b));belt.name='continuous-handrail';
        belt.userData.side=side;belt.userData.height=offset;this.body.add(belt);this.belts.push(belt);
      }
      const support=new T.Mesh(unitBox,material(0x889a90));support.userData.side=side;support.name='escalator-underframe';
      this.body.add(support);this.underframe.push(support);
      if(escalator)for(const end of [0,1]){
        const cap=new T.Mesh(new T.TorusGeometry(0.4,0.09,6,12,Math.PI),material(0x344d48));
        cap.rotation.z=end? -Math.PI/2:Math.PI/2;cap.userData.end=end;cap.userData.side=side;
        cap.name='rounded-handrail-return';this.body.add(cap);this.endCaps.push(cap);
      }
    }
    if(escalator){
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(36),3));
      const glass=new T.MeshStandardMaterial({color:0x96bdb8,transparent:true,opacity:0.36,depthWrite:false,side:T.DoubleSide,roughness:0.4});
      this.sidePanels=new T.Mesh(geometry,glass);this.sidePanels.name='escalator-glass-balustrades';this.sidePanels.renderOrder=1;this.body.add(this.sidePanels);
    }
    this.landing(this.lowLanding);this.landing(this.highLanding);
  }
  private buildElevator():void {
    const glass=new T.MeshStandardMaterial({color:0x93bdb8,transparent:true,opacity:0.16,depthWrite:false,roughness:0.3,side:T.DoubleSide});
    this.shaft=new T.Mesh(unitBox,glass);this.shaft.name='transparent-elevator-shaft';this.shaft.renderOrder=2;this.body.add(this.shaft);
    const half=elevatorShaftWidth/2;
    for(const x of [-half,half])for(const z of [-half,half])this.shaftPosts.push(box(this.body,'shaft-corner-post',x,0,z,0.12,1,0.12,0x668b81));
    for(let i=0;i<2;i++){
      const ring=new T.Group();
      for(const side of [-half,half]){
        box(ring,'shaft-ring',side,0,0,0.15,0.18,elevatorShaftWidth,0x718f82);
        box(ring,'shaft-ring',0,0,side,elevatorShaftWidth,0.18,0.15,0x718f82);
      }
      this.body.add(ring);this.shaftCaps.push(ring);
    }
    this.cabin.name='elevator-cabin';this.body.add(this.cabin);
    box(this.cabin,'cabin-floor',0,0,0,2.9,0.18,2.9,0x476b63);
    box(this.cabin,'cabin-ceiling',0,2.45,0,2.9,0.14,2.9,0xe2e4ce);
    for(const x of [-1.38,1.38])box(this.cabin,'cabin-side',x,1.2,0,0.09,2.35,2.7,0xa2b9a8);
    box(this.cabin,'cabin-rear-wall',0,1.2,-1.38,2.7,2.35,0.08,0xb8c6b3);
    for(const x of [-0.65,0.65])box(this.cabin,'cabin-door',x,1.18,1.4,1.25,2.25,0.06,0xd4dccb);
    box(this.cabin,'cabin-door-seam',0,1.2,1.45,0.04,2.3,0.04,0x5c8072);
    this.landing(this.lowLanding,true);this.landing(this.highLanding,true);
  }

  update(elevation:(id:LevelId)=>number,focus:LevelId|'all'):void {
    if(this.lanes.length){
      for(const lane of this.lanes)lane.update(elevation,focus);
      this.group.visible=this.lanes.some(lane=>lane.group.visible);return;
    }
    const lowY=elevation(this.low.level)+(this.low.elevationOffset??0)+0.65,highY=elevation(this.high.level)+(this.high.elevationOffset??0)+0.65,rise=highY-lowY;
    if(lowY===this.previousLowY&&highY===this.previousHighY&&focus===this.previousFocus)return;
    this.previousLowY=lowY;this.previousHighY=highY;this.previousFocus=focus;
    this.group.position.set(this.low.x,lowY,this.low.z);this.group.rotation.y=-this.heading;
    const showAll=focus==='all';
    const focusedY=focus==='all'?undefined:elevation(focus)+0.65;
    this.lowLanding.visible=showAll||lowY<=(focusedY??-Infinity);
    this.highLanding.visible=showAll||focus===this.high.level||highY<=(focusedY??-Infinity);
    this.lowLanding.position.set(this.connection.kind==='elevator'?0:-0.75,0,0);
    this.highLanding.position.set(this.connection.kind==='elevator'?0:this.run+0.75,rise,0);
    this.body.visible=showAll||lowY<=(focusedY??-Infinity);
    this.group.visible=showAll||this.lowLanding.visible||this.highLanding.visible;
    if(this.connection.kind==='elevator'){
      const bottom=-0.4;
      const top=showAll?rise+3.1:Math.max(bottom+0.1,Math.min(rise+3.1,(focusedY??lowY)-lowY+3.1));
      this.shaft!.position.set(0,(bottom+top)/2,0);this.shaft!.scale.set(elevatorShaftWidth,top-bottom,elevatorShaftWidth);
      this.shaftPosts.forEach(post=>{post.position.y=(bottom+top)/2;post.scale.y=top-bottom;});
      this.shaftCaps[0]!.position.y=bottom;this.shaftCaps[1]!.position.y=top;
      this.cabin.visible=true;
      this.cabin.position.y=Math.min(rise*0.45,Math.max(0,top-2.8));
    }else{
      const first=0;
      const last=1;
      this.highLanding.visible=this.body.visible;
      this.lowLanding.visible=this.body.visible;
      const pitch=this.run/this.count,stepRise=rise/this.count;
      this.steps!.count=this.count;this.risers!.count=this.count;this.stripes!.count=this.count;
      if(this.grooves)this.grooves.count=this.count*6;
      for(let i=0;i<this.count;i++){
        const x=(i+0.5)*pitch,y=(i+0.5)*stepRise;
        place(this.steps!,i,x,y,0,pitch*1.01,0.16,this.treadWidth);
        place(this.risers!,i,x-pitch/2,y-stepRise/2,0,0.08,stepRise+0.04,this.treadWidth);
        place(this.stripes!,i,x-pitch*0.42,y+0.095,0,0.065,0.025,this.treadWidth-0.02);
        if(this.grooves)for(let j=0;j<6;j++)place(this.grooves,i*6+j,x,y+0.095,-this.treadWidth*0.4+j*this.treadWidth*0.16,pitch*0.7,0.02,0.035);
      }
      for(const mesh of [this.steps,this.risers,this.stripes,this.grooves])if(mesh)mesh.instanceMatrix.needsUpdate=true;
      const beam=(mesh:T.Mesh,offset:number,side:number,width:number,height:number)=>{
        const across=this.treadWidth/2+0.35;
        const a=new T.Vector3(this.run*first,rise*first+offset,side*across),b=new T.Vector3(this.run*last,rise*last+offset,side*across);
        mesh.position.copy(a).lerp(b,0.5);mesh.scale.set(a.distanceTo(b),height,width);
        mesh.rotation.z=Math.atan2(rise,this.run);
      };
      this.belts.forEach(mesh=>beam(mesh,mesh.userData.height,mesh.userData.side,0.16,0.15));
      this.underframe.forEach(mesh=>beam(mesh,-0.28,mesh.userData.side,0.18,0.3));
      this.endCaps.forEach(mesh=>{
        mesh.visible=mesh.userData.end?last>=1:first<=0;
        mesh.position.set(mesh.userData.end?this.run:0,(mesh.userData.end?rise:0)+0.88,mesh.userData.side*(this.treadWidth/2+0.35));
      });
      if(this.sidePanels){
        const points:number[]=[];
        for(const side of [-1,1]){
          const z=side*(this.treadWidth/2+0.32);
          const x0=this.run*first,x1=this.run*last,y0=rise*first,y1=rise*last;
          points.push(x0,y0+0.35,z,x1,y1+0.35,z,x1,y1+1.2,z,x0,y0+0.35,z,x1,y1+1.2,z,x0,y0+1.2,z);
        }
        const attribute=this.sidePanels.geometry.getAttribute('position') as T.BufferAttribute;
        attribute.array.set(points);attribute.needsUpdate=true;this.sidePanels.geometry.computeVertexNormals();
        this.sidePanels.geometry.computeBoundingSphere();
      }
    }
    this.group.updateMatrixWorld(true);
  }
}
