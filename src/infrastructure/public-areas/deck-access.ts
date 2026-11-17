import type {FloorArea,VerticalConnection,Point2} from '../../domain/map/model.ts';
import {deckEvidence} from './elevated-source.ts';
/** Only public equipment explicitly marked by the supplied elevated/2F plans. */
export function createDeckAccess(){
  const connections:VerticalConnection[]=[],areas:FloorArea[]=[];
  const pad=(p:Point2,w=6)=>[{x:p.x-w/2,z:p.z-w/2},{x:p.x+w/2,z:p.z-w/2},{x:p.x+w/2,z:p.z+w/2},{x:p.x-w/2,z:p.z+w/2}];
  const add=(id:string,blockId:string,level:'district-north-deck'|'district-south-deck',high:Point2,low=high,kind:VerticalConnection['kind']='elevator')=>{
    const evidence={...deckEvidence,detail:deckEvidence.detail+' Public plan reference '+id+'; schematic equipment location and size, not a field sign or certified accessible route.'};
    const c:VerticalConnection={id,blockId,kind,evidence,from:{id:id+'-ground',level:'district-ground',...low},to:{id:id+'-deck',level,...high},
      ...(kind==='elevator'?{doorFacingRad:-Math.PI/6}:{width:3.2})};
    connections.push(c);
    areas.push(...[c.from,c.to].map(n=>({id:n.id+':landing',blockId,level:n.level,name:'公共连廊设备落台',kind:'public' as const,outline:pad(n),height:.55,label:false,evidence})));
  };
  add('public-north-lift-26','north-decks','district-north-deck',{x:434,z:501});
  add('public-north-lift-28','north-decks','district-north-deck',{x:526.4,z:473.2});
  for(const [ref,x,z]of [[6,618.6,607.7],[7,625.9,580.8],[8,628.4,659.7],[9,669.3,632.4],[21,701.5,750.3]])
    add('public-south-lift-'+ref,'south-decks','district-south-deck',{x:x!,z:z!});
  add('public-jp-deck-stairs','south-decks','district-south-deck',{x:337.7,z:811},{x:331.7,z:815},'stairs');
  add('public-jp-deck-lift','south-decks','district-south-deck',{x:342,z:808.4});
  return {connections,areas,buildingEquipment:[
    {connectionId:'public-jp-deck-stairs',buildingId:'jp-tower'},
    {connectionId:'public-south-lift-9',buildingId:'hankyu-dept'},
    {connectionId:'public-south-lift-21',buildingId:'hanshin-dept'},
  ]};
}
