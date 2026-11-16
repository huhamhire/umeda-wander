import type {AtriumVoid,Evidence,FloorArea} from '../domain/map/model.ts';

const evidence:Evidence={source:'district',pages:[1],detail:'references/Umeda Walkway Maps/umeda-elevated-walkways-2026.pdf p1 shows South Gate upper public deck. Cross-checked with JR station PDF pp4–5 and user facade photo: curved setback over the central entrance, flanking 1F-to-2F escalators. Arc and dimensions schematic, no surveyed radius.'};
// Open to the south rather than an enclosed rectangular escalator shaft.
const arc=Array.from({length:25},(_,i)=>{
  const x=-10+i*20/24;return {x,z:64+8*(x/10)**2};
});
export const southForecourtVoid:AtriumVoid={id:'south-gate-curved-setback',name:'大阪站南侧 · 二层弧形退避',
  openings:[{level:'south-deck',outline:[...arc,{x:10,z:92},{x:-10,z:92}]}],evidence};
export const southForecourtGround:FloorArea={id:'south-gate-west-escalator-ground',name:'南侧入口 · 西侧扶梯落台',
  kind:'public',level:'concourse',elevationOffset:1.3,outline:[{x:-22,z:72},{x:-9,z:72},{x:-9,z:85},{x:-22,z:85}],evidence};
