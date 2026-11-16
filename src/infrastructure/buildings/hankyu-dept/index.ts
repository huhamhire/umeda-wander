import {volume,type GeographicBuilding} from '../building-data.ts';
import clipping from 'polygon-clipping';
const podium=volume('588689735','阪急百货裙楼',0,60);
// Southern chamfered lobe follows the host's exterior instead of a rectangular inset.
const minZ=Math.min(...podium.outline.map(p=>p.z)),maxZ=Math.max(...podium.outline.map(p=>p.z));
const minX=Math.min(...podium.outline.map(p=>p.x)),maxX=Math.max(...podium.outline.map(p=>p.x));
const polygon=clipping.intersection([podium.outline.map(p=>[p.x,p.z] as [number,number])],[[[minX-1,minZ+(maxZ-minZ)*.48],[maxX+1,minZ+(maxZ-minZ)*.48],[maxX+1,maxZ+1],[minX-1,maxZ+1]]]);
const points=polygon[0]![0]!.map(([x,z])=>({x,z})).sort((a,b)=>a.x-b.x||a.z-b.z);
const cross=(a:typeof points[number],b:typeof points[number],c:typeof points[number])=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
const half=(input:typeof points)=>{const result:typeof points=[];for(const p of input){while(result.length>1&&cross(result.at(-2)!,result.at(-1)!,p)<=0)result.pop();result.push(p);}return result.slice(0,-1);};
const outline=[...half(points),...half(points.slice().reverse())];
const center=outline.reduce((s,p)=>({x:s.x+p.x/outline.length,z:s.z+p.z/outline.length}),{x:0,z:0});
export const building:GeographicBuilding={id:'hankyu-dept',name:'阪急百货 / Twin Towers North',volumes:[podium,
 {...podium,name:'南侧完整主塔楼',base:60,top:187,outline:outline.map(p=>({x:center.x+(p.x-center.x)*.98,z:center.z+(p.z-center.z)*.98})),holes:[],note:'Southern host lobe follows source chamfered perimeter; shallow setback and height estimated from supplied aerial reference. Grand Building is separate.'}]};
