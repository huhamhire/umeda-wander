import type {FloorArea,VerticalConnection,PassageGuide} from '../domain/map/model.ts';
import {passageOutline,rotatePoint} from '../domain/map/geometry.ts';
import {districtPlacements} from './district-placement.ts';
import {metroStation} from './metro-umeda-map.ts';

const p=districtPlacements.hankyu;
const target=rotatePoint({x:-26,z:-52},{x:0,z:0},p.angle);
target.x+=p.origin.x;target.z+=p.origin.z;
const metroInterface=metroStation.layout.areas.find(a=>a.id==='metro-umeda-jr-interface')!;
// Derive the landing from the actual station footprint, including display offsets.
const metroLanding=metroInterface.outline.reduce((sum,p)=>({x:sum.x+p.x/metroInterface.outline.length,z:sum.z+p.z/metroInterface.outline.length}),{x:0,z:0});
// These are public connection sketches, not surveyed transfer paths or routing edges.
export const districtAreas:FloorArea[]=[{
  id:'district-jr-hankyu-deck',level:'platform',kind:'public',name:'2F 站外连廊 · 阪急方向',label:true,
  outline:passageOutline({x:59,z:-44},target,5),
  evidence:{source:'jr',pages:[3,5],detail:'JR North Gate 2F / Carillon Plaza toward Hankyu; city district map confirms upper-deck connection, bend and dimensions simplified'},
}];
export const districtConnections:VerticalConnection[]=[{
  id:'district-jr-metro-stairs',kind:'stairs',
  from:{id:'district-jr-metro-surface',level:'concourse',x:56,z:-18},
  to:{id:'district-jr-metro-underground',level:'metro-hall',...metroLanding},
  evidence:{source:'jr',pages:[5],detail:'Midosuji public concourse to Metro-side public underground approach; endpoints fitted to both station diagrams, schematic stair position'},
}];

const descent=districtConnections[0]!;
const westHall=metroStation.layout.areas.find(a=>a.id==='metro-umeda-west-public')!;
const westApproach=westHall.outline.reduce((sum,p)=>({x:sum.x+p.x/4,z:sum.z+p.z/4}),{x:0,z:0});
export const districtGuides:PassageGuide[]=[{
  id:'jr-metro-public-guide',name:'JR 御堂筋口 → M16 中北西改札（示意）',access:'public',
  points:[
    {id:'guide-jr-exit',level:'concourse',x:53,z:4,caption:'JR 御堂筋口 · 出闸后'},
    {id:'guide-jr-approach',level:'concourse',x:53,z:-12},
    {...descent.from,caption:'下行至 M16 站厅'},
    {...descent.to,caption:'JR ↔ M16 · 地下公共通路'},
    {id:'guide-metro-approach',level:'metro-hall',...westApproach,caption:'M16 中北西改札 · 闸外'},
  ],
  evidence:{source:'jr',pages:[5],detail:'Public transfer visualization following the modeled JR Midosuji exit, district descent and Metro west hall; schematic, not a verified navigation route'},
}];
