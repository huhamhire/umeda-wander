import type {PublicBlockDefinition} from '../../../domain/map/public-area.ts';
import {box,districtUndergroundEvidence} from '../underground-source.ts';
/** Ordered ownership windows only. Public shape comes entirely from the reviewed reference network. */
export const southernBlocks:PublicBlockDefinition[]=[
 {id:'crost-b1',name:'Crost／南门大楼地下公共区',mask:box(-2000,650,705,780),evidence:districtUndergroundEvidence},
 {id:'hanshin-west-b1',name:'阪神—西梅田／第一生命互通',mask:box(-2000,780,705,900),evidence:districtUndergroundEvidence},
 {id:'diamor-b1',name:'DIAMOR 地下公共区',mask:box(-2000,900,2000,1050),evidence:districtUndergroundEvidence},
 {id:'kitashinchi-public-b1',name:'北新地—曾根地下道公共区',mask:box(350,1050,960,1150),evidence:districtUndergroundEvidence},
 {id:'outer-underground',name:'外围地下延伸',evidence:districtUndergroundEvidence},
];
