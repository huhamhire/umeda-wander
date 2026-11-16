import polygonClipping from 'polygon-clipping';
import type {MultiPolygon, Polygon} from 'polygon-clipping';
import type {NetworkPart, Point} from '../../data/geography/underground/network.ts';

/** Planning envelopes only: variable widths with rounded widened junctions. */
export function envelope(part:NetworkPart):MultiPolygon {
 if(part.polygons)return polygonClipping.union(part.polygons);
 if(part.outline){const ring=[...part.outline,part.outline[0]!];return polygonClipping.union([ring]);}
 const pieces:Polygon[]=[];
 for(const [i,a] of part.sections.entries()){
  const ring:Point[]=Array.from({length:16},(_,j)=>[a[0]+a[2]/2*Math.cos(j*Math.PI/8),a[1]+a[2]/2*Math.sin(j*Math.PI/8)]);
  ring.push(ring[0]!);pieces.push([ring]);
  const b=part.sections[i+1];if(!b)continue;
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  if(length===0)throw new Error(`Repeated section: ${part.id}`);
  const nx=-dy/length,ny=dx/length;
  const q:Point[]=[[a[0]+nx*a[2]/2,a[1]+ny*a[2]/2],[b[0]+nx*b[2]/2,b[1]+ny*b[2]/2],[b[0]-nx*b[2]/2,b[1]-ny*b[2]/2],[a[0]-nx*a[2]/2,a[1]-ny*a[2]/2]];
  q.push(q[0]!);pieces.push([q]);
 }
 if(!pieces.length)throw new Error(`Empty envelope: ${part.id}`);
 return polygonClipping.union(pieces[0]!,...pieces.slice(1));
}
export function reserveStationSpace(area:MultiPolygon,stations:MultiPolygon[]):MultiPolygon {
 return stations.length?polygonClipping.difference(area,...stations):area;
}
export function areaOf(polygons:MultiPolygon):number {
 return polygons.reduce((total,rings)=>total+rings.reduce((sum,ring,i)=>{
  const area=Math.abs(ring.reduce((a,p,j)=>{const q=ring[(j+1)%ring.length]!;return a+p[0]*q[1]-q[0]*p[1];},0))/2;
  return sum+(i===0?area:-area);
 },0),0);
}
