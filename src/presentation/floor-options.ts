import type {Level,LevelId} from '../domain/map/model.ts';
import {explorationElevation} from '../application/exploration-level.ts';

export interface FloorOption {id:LevelId;y:number;label:string;name:string;members:Level[]}
// Shared scene heights are presentation groups, not shared station identities.
const captions:Record<number,{label:string;name:string}>={
  16:{label:'3F',name:'JR 联络桥 / 阪急站台'},
  8:{label:'2F',name:'站台 / 站厅 / 站外连廊'},
  0:{label:'1F',name:'底面站厅 / 中央口'},
  [-8]:{label:'B1',name:'地下站厅 / 公共通路'},
  [-16]:{label:'B2',name:'梅北 / 地铁 / 阪神站台'},
};
export function floorOptions(levels:Level[]):FloorOption[]{
  const groups=new Map<number,Level[]>();
  for(const level of levels){const y=explorationElevation(level),members=groups.get(y)??[];members.push(level);groups.set(y,members);}
  return [...groups].sort(([a],[b])=>b-a).map(([y,members])=>({
    id:members[0]!.id,y,members,...(captions[y]??{label:members[0]!.label,name:members.map(l=>l.name).join(' / ')}),
  }));
}
