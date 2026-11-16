import type {PublicBlockDefinition} from '../../../domain/map/public-area.ts';
import {box,districtUndergroundEvidence} from '../underground-source.ts';
export const whityBlocks:PublicBlockDefinition[]=[
 {id:'hankyu-basements',name:'阪急三番街与北侧地下公共区',mask:box(560,-2000,2000,430),evidence:districtUndergroundEvidence},
 {id:'whity-b1',name:'Whity—东梅田 地下公共区',mask:box(705,430,2000,1050),evidence:districtUndergroundEvidence},
];
