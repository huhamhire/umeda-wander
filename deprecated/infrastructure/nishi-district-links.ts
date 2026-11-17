import type {PublicPassage} from '../../src/domain/map/model.ts';
import {nishiStation} from '../../src/infrastructure/stations/nishi-umeda/index.ts';
import {hanshinStation} from '../../src/infrastructure/stations/hanshin-umeda/index.ts';
import {districtPlacements} from '../../src/infrastructure/district-placement.ts';

const outline=nishiStation.layout.areas.find(a=>a.id==='nishi-umeda-north-public')!.outline;
const start=outline.reduce((s,p)=>({x:s.x+p.x/outline.length,z:s.z+p.z/outline.length}),{x:0,z:0});
const hs=hanshinStation.layout.areas.find(a=>a.id==='hanshin-umeda-department-public')!.outline;
const end={x:(hs[1]!.x+hs[2]!.x)/2,z:(hs[1]!.z+hs[2]!.z)/2};
const distance=Math.hypot(end.x-start.x,end.z-start.z),angle=districtPlacements.nishi.angle;
const c1={x:start.x+Math.cos(angle)*distance*0.65,z:start.z+Math.sin(angle)*distance*0.65};
const c2={x:end.x-distance*0.6,z:end.z};
const bend=Array.from({length:17},(_,i)=>{
  const t=i/16,u=1-t;
  return {x:u*u*u*start.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*end.x,
    z:u*u*u*start.z+3*u*u*t*c1.z+3*u*t*t*c2.z+t*t*t*end.z,level:'y11-hall' as const};
});
export const nishiDistrictPassages:PublicPassage[]=[{
  id:'nishi-hanshin-b1-public',name:'西梅田东侧—阪神南侧 · 地下公共通路',kind:'underground',width:5,
  points:[{...bend[0]!,station:nishiStation.id},...bend.slice(1,-1),{...end,level:'hanshin-hall',station:hanshinStation.id}],
  evidence:{source:'yotsubashi',pages:[1],detail:'Y11 original concourse plan and district walking map show the curved Hilton Plaza East-side public approach to Hanshin south public passage. Curve leaves Y11 along its north axis and turns into the Hanshin southern public concourse; radius fitted, no inter-operator route edge.'},
}];
