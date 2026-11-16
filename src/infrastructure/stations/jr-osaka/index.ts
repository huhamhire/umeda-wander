import type {StationMap} from '../../../domain/map/model.ts';
import * as jr from './layout.ts';
import {northAtrium} from './upper-links.ts';
import {southForecourtVoid,southForecourtGround,southBuildingAccessVoids} from './south-forecourt.ts';

// Keep source reference-floor names intact; adapt only the assembled JR station.
const replacedPlaceholders=new Set(['north-lucua','north-lucua1100','south-daimaru']);
const commercialLabels=new Set(['south-building-2f','south-building-3f','south-building-4f']);
const southFrontPublic=[{x:-9,z:53},{x:-1,z:53},{x:-1,z:61},{x:12,z:61},{x:12,z:58},{x:29,z:58},
  {x:29,z:68},{x:33,z:68},{x:33,z:80},{x:16,z:80},{x:16,z:76},{x:-25,z:76},{x:-25,z:68},{x:-9,z:68}];
const areas=jr.areas.filter(a=>!replacedPlaceholders.has(a.id)).map(a=>({...a,
  ...(commercialLabels.has(a.id)?{label:false}:{}),...(a.id==='south-building-2f'?{level:'south-deck' as const,outline:southFrontPublic}:{} )}));
const southDeckBanks=new Set(['south-building-50','south-lift-t','south-building-61','south-lift-u']);
const connections=jr.connections.map(c=>southDeckBanks.has(c.id)?{...c,
  ...(c.id==='south-building-61'?{lanes:2 as const}:{}),
  from:c.from.level==='mezzanine'?{...c.from,level:'south-deck' as const}:c.from,
  to:c.to.level==='mezzanine'?{...c.to,level:'south-deck' as const}:c.to}:c);
const westPlazaBank=connections.find(c=>c.id==='south-building-61')!;
westPlazaBank.from={...westPlazaBank.from,x:-15,z:79};
westPlazaBank.to={...westPlazaBank.to,x:-15,z:70};
westPlazaBank.evidence={...southForecourtVoid.evidence,detail:southForecourtVoid.evidence.detail+'; western paired escalator landing follows the open central forecourt, reference bank 61'};
areas.push(southForecourtGround);

export const jrStation:StationMap={
  id:'jr-osaka',name:'JR 大阪站',
  levels:[...jr.levels.map((l,i)=>({...l,station:'jr-osaka' as const,stackIndex:i-2})),
    {id:'south-deck',label:'2F',name:'大丸前侧公共通道与南侧步道桥',y:4,stackIndex:1,station:'jr-osaka',description:'南侧站外二层步行层，按较低的相邻标高对齐；不改变 JR 内部夹层。'}],
  facilities:jr.facilities,nodes:jr.nodes,edges:jr.edges,
  layout:{areas,connections,platforms:jr.platforms,atria:[northAtrium,southForecourtVoid,...southBuildingAccessVoids]},
};
