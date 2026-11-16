import type {Evidence,PlanRegion} from '../../domain/map/model.ts';
export const districtUndergroundEvidence:Evidence={source:'district',pages:[1],
 urls:['https://umeda-sc.jp/wp2/wp-content/uploads/2020/03/map_tw.pdf'],
 detail:'references/梅田周边地区通道.pdf (2024-02): original yellow vector faces, region-fitted with road controls. The linked Traditional Chinese edition is related, not a substitute for the local file. Underground confirmed; individual heights estimated, not all verified B1. Derivative permission pending.'};
export const box=(x0:number,z0:number,x1:number,z1:number):PlanRegion=>({outline:[{x:x0,z:z0},{x:x1,z:z0},{x:x1,z:z1},{x:x0,z:z1}]});
