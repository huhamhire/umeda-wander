import polygonClipping from 'polygon-clipping';
import type {CommercialBuilding,Point2} from '../../src/domain/map/model.ts';
import {commercialFootprints} from './commercial-footprints.ts';

const reference=commercialFootprints['hanshin-dept'];
// Preserve the raw OSM L-shaped envelope. Fit its north face to the already
// enlarged Hanshin south public concourse, rather than enlarging the station.
const fit=(p:Point2)=>({x:p.x-20,z:p.z+36});
const outline=reference.outline.map(fit);
const evidence={source:'district' as const,pages:[],urls:[
  'https://www.openstreetmap.org/way/502411898',
  'https://www.nihonsekkei.co.jp/projects/18825/',
  'https://office.hankyu-hanshin.co.jp/twin-south/outline/',
  'https://office.hankyu-hanshin.co.jp/twin-south/access/',
],detail:'OSM way 502411898 v19, 2026-11-16: simplified L-shaped combined retail/office footprint. Display translation (-20,+36) aligns the shared UMEDA CONNECT street-grid frame. Architect photos show curved retail podium and rectilinear office tower on the eastern wing; heights and tower setback are schematic, no retail interior plan.'};
const tower=polygonClipping.intersection([outline.map(p=>[p.x,p.z] as [number,number])],
  [[{x:44,z:94},{x:61,z:94},{x:61,z:130},{x:44,z:130}].map(p=>{const q=fit(p);return [q.x,q.z] as [number,number];})]);

/** Hanshin department store and office tower are parts of one host complex. */
export const hanshinCommercialBuilding:CommercialBuilding={
  id:'hanshin-dept',name:'阪神百货 / Twin Towers South',outline,evidence,
  floors:[{level:'hanshin-hall',name:'B1'},{level:'hanshin-ground',name:'1F'},{level:'hanshin-deck',name:'2F'}],
  podiumHeight:11.5,
  volumes:tower.map(p=>({name:'大阪梅田 Twin Towers South · 办公塔楼',height:26,
    outline:p[0]!.slice(0,-1).map(([x,z])=>({x,z})),evidence})),
};
