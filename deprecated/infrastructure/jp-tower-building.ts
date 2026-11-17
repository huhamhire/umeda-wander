import polygonClipping from 'polygon-clipping';
import type {CommercialBuilding} from '../../src/domain/map/model.ts';
import {commercialFootprints} from './commercial-footprints.ts';

const raw=commercialFootprints['jp-tower'];
const outline=raw.outline.map(p=>({x:p.x+20,z:p.z+34}));
export const jpTowerEvidence={source:'district' as const,pages:[],urls:[
  'https://www.openstreetmap.org/way/1146510724',
  'https://www.jp-re.japanpost.jp/sp/osaka/',
  'https://www.post.japanpost.jp/notification/productinformation/2023/1027_01_01.pdf',
],detail:'JP Tower Osaka / KITTE, former Osaka Central Post Office site. OSM way 1146510724 v13, 2026-11-16. Explicit display translation (+20,+34). Japan Post 2023 release p2 confirms South Gate 2F deck, southeast sunken garden, B1 Garden Avenue and 1F JR west passage; widths, setbacks and compressed height schematic.'};
const tower=polygonClipping.intersection([outline.map(p=>[p.x,p.z] as [number,number])],[[[-103,57],[-65,57],[-65,78],[-103,78]]]);
export const jpTowerBuilding:CommercialBuilding={
  id:'jp-tower',name:'JP Tower Osaka / KITTE',outline,evidence:jpTowerEvidence,
  floors:[{level:'underground-hall',name:'B1'},{level:'concourse',name:'1F'},{level:'south-deck',name:'2F'}],
  podiumHeight:7.5,volumes:tower.map(p=>({name:'JP Tower · 办公／大阪站酒店',height:28,
    outline:p[0]!.slice(0,-1).map(([x,z])=>({x,z})),evidence:jpTowerEvidence})),
};
