import {volume,alignedPoint,type GeographicBuilding} from '../building-data.ts';
import {pointInPolygon} from '../../../domain/map/geometry.ts';
const podium=volume('1146510724','KITTE 裙楼',0,32),angle=-31.65*Math.PI/180;
// An estimated inscribed slab, rather than a tower clipped by the acute site corner.
const center=alignedPoint(podium.outline,angle,.65,.48);
let outline=[[.34,.13],[.93,.13],[.93,.83],[.34,.83]].map(([u,v])=>alignedPoint(podium.outline,angle,u!,v!));
for(let i=0;i<25&&!outline.every(p=>pointInPolygon(p,podium.outline));i++)outline=outline.map(p=>({x:center.x+(p.x-center.x)*.95,z:center.z+(p.z-center.z)*.95}));
export const building:GeographicBuilding={id:'jp-tower',name:'JP Tower Osaka / KITTE',volumes:[podium,
 {...podium,name:'办公及酒店塔楼',base:32,top:188,outline,holes:[],note:'Rectangular tower slab aligned with station axis, inscribed in host; footprint/setback estimated. 188 m total height from host OSM tag.'}]};
