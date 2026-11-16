import {volume,type GeographicBuilding} from '../building-data.ts';
import clipping from 'polygon-clipping';
const links=volume('788888925','LINKS 裙楼',0,38),podium=volume('175942074','Yodobashi 弧形裙楼',0,62,'osm-height');
const xs=links.outline.map(p=>p.x),zs=links.outline.map(p=>p.z);
const center={x:(Math.min(...xs)+Math.max(...xs))/2,z:(Math.min(...zs)+Math.max(...zs))/2};
// The source footprint constrains the outer edge; photo reference separates an
// estimated 4–7 m gallery from the inward retail facade. Not a measured buffer.
const inset=(p:{x:number;z:number})=>({x:center.x+(p.x-center.x)*.93,z:center.z+(p.z-center.z)*.91});
const inner=clipping.intersection([links.outline.map(p=>[p.x,p.z] as [number,number])],[links.outline.map(inset).map(p=>[p.x,p.z] as [number,number])])[0]![0]!.map(([x,z])=>({x,z}));
export const building:GeographicBuilding={id:'yodobashi',name:'Yodobashi / LINKS UMEDA',
 volumes:[{...links,outline:inner,note:links.note+' Gallery setback estimated from user reference.'},
  {...podium,outline:podium.outline.map(inset),note:podium.note+' Gallery setback estimated from user reference.'},
  volume('776542349','Hotel Hankyu RESPIRE',38,150,'osm-height')],
 galleries:[{name:'Yodobashi 2F 外环回廊',outline:links.outline,innerOutline:inner,y:4,source:links.source,
  note:'User aerial reference: exterior gallery surrounding the retail podium. Width/height schematic; regional bridge binding belongs to phase four.'}]};
