import type {DeckBlock} from '../domain/map/public-deck.ts';
import type {FloorArea,PublicPassage} from '../domain/map/model.ts';
import {pointInPolygon} from '../domain/map/geometry.ts';
/** A label can annotate an owned floor without creating a duplicate bridge model. */
export function deckExtensionLabels(blocks:DeckBlock[],areas:FloorArea[]):PublicPassage[]{
 const extensions=[{path:'southeast-extension:610936152',name:'南侧步道桥 · 地区延伸'},
  {path:'umekita-public:1313936486',name:'梅北上方公共步道 · 北侧延伸'}];
 return extensions.map(e=>{
  const b=blocks.find(b=>b.paths.some(p=>p.id===e.path))!,p=b.paths.find(p=>p.id===e.path)!,end=p.points.at(-1)!;
  const face=areas.find(a=>a.blockId===b.id&&pointInPolygon(end,a.outline)&&!a.holes?.some(h=>pointInPolygon(end,h)));
  if(!face)throw new Error('Unbound elevated extension '+e.path);
  return {id:'label-'+e.path,name:e.name,kind:'deck',width:p.width,label:true,surfaceId:face.id,evidence:p.evidence,
   points:[{...p.points.at(-2)!,level:b.level},{...end,level:b.level,boundaryName:e.name}]};
 });
}
