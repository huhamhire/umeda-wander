import type {Evidence,Facility,FloorArea,LevelId,RouteNode,VerticalConnection} from '../domain/map/model.ts';
import {passageOutline} from '../domain/map/geometry.ts';

const evidence=(pages:number[],detail:string):Evidence=>({pages,detail});
const rect=(x:number,z:number,w:number,d:number)=>[
  {x:x-w/2,z:z-d/2},{x:x+w/2,z:z-d/2},{x:x+w/2,z:z+d/2},{x:x-w/2,z:z+d/2}];

/** Matched diagram IDs on PDF pages 2–5; dimensions remain schematic. */
export function refineUpperLevelLinks(areas:FloorArea[],connections:VerticalConnection[],facilities:Facility[]):void {
  const area=(id:string,level:LevelId,name:string,x:number,z:number,w:number,d:number,label=false)=>{
    areas.push({id,level,name,kind:'paid',outline:rect(x,z,w,d),label,evidence:evidence([3,4],'Mezzanine passage and its separate platform access branches')});
  };
  const link=(id:string,kind:VerticalConnection['kind'],from:Omit<RouteNode,'id'>,to:Omit<RouteNode,'id'>,pages:number[],detail:string)=>{
    const connection:VerticalConnection={id,kind,from:{id:`${id}-lower`,...from},to:{id:`${id}-upper`,...to},evidence:evidence(pages,detail)};
    connections.push(connection);return connection;
  };

  // 51 reaches the half-height passage; 17–31 are separate short flights to 2F.
  areas.find(a=>a.id==='sakurabashi-mezz')!.outline=rect(-48,-4,5,57);
  areas.find(a=>a.id==='mezz-link')!.outline=rect(-36.5,21,28,6);
  area('mezz-north-arm','mezzanine','夹层北端分支',-30,-30,16,5);
  area('mezz-south-finger','mezzanine','樱桥夹层南端分支',-38,26,5,14);
  area('mezz-central-south-arm','mezzanine','中央夹层南端分支',-21,30,14,6);
  link('sakura-stairs-51','stairs',{level:'concourse',x:-48,z:30},{level:'mezzanine',x:-48,z:23},[4,5],'51: Sakurabashi 1F to mezzanine only, not directly to a platform');
  const stairs=[
    [17,-48,-42,-30],[20,-48,-42,-18],[22,-48,-42,-6],[24,-48,-42,6],
    [26,-50,-56,18],[27,-46,-40,18],[29,-38,-44,30],
    [21,-25,-31,-18],[23,-25,-31,-6],[25,-25,-31,6],[28,-25,-31,18],
  ];
  for(const [id,fromX,toX,z]of stairs)link(`mezz-stairs-${id}`,'stairs',
    {level:'mezzanine',x:fromX!,z:z!},{level:'platform',x:toX!,z:z!},[3,4],`${id}: short mezzanine-to-platform flight, separate from the opposite passage bank`);
  for(const [id,fromX,toX,z]of [[18,-35,-29,-30],[19,-25,-19,-30],[30,-25,-31,30],[31,-19,-13,30]])
    link(`mezz-escalator-${id}`,'escalator',{level:'mezzanine',x:fromX!,z:z!},{level:'platform',x:toX!,z:z!},[3,4],`${id}: mezzanine-to-platform escalator`);
  const sakura=facilities.find(f=>f.id==='mezz-sakura')!;
  Object.assign(sakura,{x:-48,z:0,note:'51 号楼梯先到 M2F 夹层，再沿通道选择各站台的独立短楼梯。与中央口夹层通过南端横向联络段连接，坐标为示意。'});

  // A free-standing atrium bank arrives at the outside edge of the upper slab.
  const northPad:FloorArea={id:'north-atrium-lower-landing',level:'platform',name:'北中庭 · 外侧候梯平台',kind:'public',outline:rect(-3,-55,20,12),evidence:evidence([2,3],'2/3: outside-edge atrium access between North Gate building 2F and 3F')};
  areas.push(northPad);
  for(const [id,kind,x]of [['north-2','escalator',-5],['north-2-stairs','stairs',-10],['north-3','escalator',3]] as const){
    const connection=link(id,kind,{level:'platform',x,z:-59},{level:'bridge',x,z:-49},[2,3],'North atrium outside-edge 2F/3F connection; no interior slab well');
    connection.placement='exterior';
  }

  // Station 2F corresponds to South Gate building 3F; the bridge reaches building 4F.
  // Keep building names explicit instead of renumbering station floors globally.
  areas.find(a=>a.id==='bridge-south')!.outline=rect(-7.5,41.5,35,13);
  const southArea=(id:string,level:LevelId,name:string,outline:FloorArea['outline'])=>{
    areas.push({id,level,name,kind:'public',outline,label:true,evidence:evidence([2,3,4],'South Gate building floor labels differ from station floor labels; simplified public approach only')});
  };
  southArea('south-building-2f','mezzanine','南门大楼 2F · 入口层',rect(4,59,58,22));
  southArea('south-building-3f','platform','南门大楼 3F · 大丸入口',rect(4,59,58,22));
  southArea('south-building-3f-lift-bay','platform','南门大楼 3F · I 直梯候梯区',rect(-21,47,7,14));
  southArea('south-building-4f','bridge','南门大楼 4F · 连接边界',rect(24,60,20,12));
  southArea('south-bridge-4f-link','bridge','联络桥—南门大楼 4F',passageOutline({x:3,z:44},{x:20,z:56},5));
  link('south-15','escalator',{level:'platform',x:-8,z:54},{level:'bridge',x:-8,z:43},[2,3],'15: public bridge to South Gate building 3F');
  link('south-stairs-16','stairs',{level:'platform',x:-14,z:54},{level:'bridge',x:-14,z:43},[2,3],'16: stairs parallel to 15, South Gate building 3F to bridge');
  const lift=link('south-lift-i','elevator',{level:'platform',x:-21,z:44},{level:'bridge',x:-21,z:44},[2,3],'I: South Gate building 3F to bridge public approach');
  lift.doorFacingRad=Math.PI/2;
  link('south-building-50','escalator',{level:'mezzanine',x:16,z:63},{level:'platform',x:16,z:56},[3,4],'50: South Gate building 2F to 3F');
  const t=link('south-lift-t','elevator',{level:'mezzanine',x:25,z:62},{level:'platform',x:25,z:62},[3,4],'T: South Gate building 2F to 3F');
  t.doorFacingRad=-Math.PI/2;
  // 61 and U join the existing small raised 1F entrance to the building's next floor.
  link('south-building-61','escalator',{level:'concourse',x:0,z:55,elevationOffset:1.3},{level:'mezzanine',x:0,z:61},[4,5],'61: South Gate Plaza 1F to building 2F; local 1F rise schematic');
  const u=link('south-lift-u','elevator',{level:'concourse',x:-5,z:55,elevationOffset:1.3},{level:'mezzanine',x:-5,z:55},[4,5],'U: South Gate Plaza 1F to building 2F');
  u.doorFacingRad=0;
  for(const [id,name,kind,level,x,z,detail]of [
    ['sakura-access-51','樱桥口 · 夹层楼梯 51','stairs','concourse',-48,30,'先上 M2F 夹层，再沿通道选择站台短楼梯。'],
    ['south-bridge-access','联络桥南端 · 15/16/I','entrance','bridge',-8,42,'15/16 及 I 直梯连接南门大楼 3F；旁侧连廊通往大楼 4F。大楼楼层与车站楼层分别标注。'],
    ['south-building-3f-entry','南门大楼 3F 入口','entrance','platform',0,59,'位于车站 2F 站台标高附近，与 3F 联络桥以 15/16/I 连接；不代表商场内部已完整建模。'],
  ] as const)facilities.push({id,name,kind,level,x,z,note:detail,evidence:evidence([2,3,4,5],'Matched public approach and mezzanine connections')});
}
