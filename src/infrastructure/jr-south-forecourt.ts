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

/** Edge-open public access bays keep the lower building 2F flight and shaft
 * exposed beneath the building 3F floor. Widths fit the fixed illustration view. */
export const southBuildingAccessVoids:AtriumVoid[]=[
  {id:'south-building-50-open-bay',name:'南门大楼 · 50 扶梯开放井口',openings:[{level:'platform',
    outline:[{x:10,z:72},{x:18,z:72},{x:18,z:55},{x:14,z:55}]}],
    evidence:{source:'jr',pages:[3,4],detail:'JR South Gate building 2F/3F public access bank 50: edge-open bay in the simplified upper floor; aperture fitted for the fixed oblique view, not a surveyed opening size'}},
  {id:'south-building-t-open-bay',name:'南门大楼 · T 直梯开放井口',openings:[{level:'platform',
    outline:[{x:20,z:72},{x:27,z:72},{x:27,z:60},{x:23,z:60}]}],
    evidence:{source:'jr',pages:[3,4],detail:'JR South Gate building 2F/3F elevator T: upper public-floor opening extended to the forecourt edge to retain the full shaft in the illustration; aperture schematic'}},
];
