import {volume,type GeographicBuilding} from '../building-data.ts';
import clipping from 'polygon-clipping';
import {passageOutline} from '../../../domain/map/geometry.ts';
const links=volume('788888925','LINKS 裙楼',0,38),podium=volume('175942074','Yodobashi 弧形裙楼',0,62,'osm-height');
const xs=links.outline.map(p=>p.x),zs=links.outline.map(p=>p.z);
const center={x:(Math.min(...xs)+Math.max(...xs))/2,z:(Math.min(...zs)+Math.max(...zs))/2};
// The source footprint constrains the outer edge; photo reference separates an
// estimated 4–7 m gallery from the inward retail facade. Not a measured buffer.
const inset=(p:{x:number;z:number})=>({x:center.x+(p.x-center.x)*.93,z:center.z+(p.z-center.z)*.91});
// A true boundary setback keeps the concave corners open; scaling about the
// centre can touch the outer edge and break the surrounding walking gallery.
const edgeCuts=links.outline.flatMap((a,i)=>{
 const b=links.outline[(i+1)%links.outline.length]!;
 const disc=Array.from({length:16},(_,j)=>({x:a.x+5*Math.cos(j*Math.PI/8),z:a.z+5*Math.sin(j*Math.PI/8)}));
 return [disc,...(Math.hypot(a.x-b.x,a.z-b.z)>.01?[passageOutline(a,b,10)]:[])];
});
const millimetres=(r:{x:number;z:number}[])=>r.map(p=>[Math.round(p.x*1000)/1000,Math.round(p.z*1000)/1000] as [number,number]);
const edgeBand=clipping.union([millimetres(edgeCuts[0]!)],...edgeCuts.slice(1).map(r=>[millimetres(r)]));
const inner=clipping.difference([millimetres(links.outline)],edgeBand)[0]![0]!.map(([x,z])=>({x,z}));
const podiumInner=clipping.intersection([podium.outline.map(inset).map(p=>[p.x,p.z] as [number,number])],[inner.map(p=>[p.x,p.z] as [number,number])])[0]![0]!.map(([x,z])=>({x,z}));
export const building:GeographicBuilding={id:'yodobashi',name:'Yodobashi / LINKS UMEDA',
 volumes:[{...links,outline:inner,note:links.note+' Gallery setback estimated from user reference.'},
  {...podium,outline:podiumInner,note:podium.note+' Gallery setback estimated from user reference.'},
  volume('776542349','Hotel Hankyu RESPIRE',38,150,'osm-height')],
 galleries:[{name:'Yodobashi 2F 外环回廊',outline:links.outline,innerOutline:inner,y:8,source:links.source,
  note:'User aerial reference: exterior gallery surrounding the retail podium. Width/height schematic; geometry is owned by the phase-four public deck; building renderer does not draw it.'}]};
