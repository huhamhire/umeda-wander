import polygonClipping from 'polygon-clipping';

/** Approximate an inward offset with eight translated polygon intersections. */
export function insetPolygon(points:{x:number;z:number}[],distance:number):{x:number;z:number}[]{
  const ring=points.map(p=>[p.x,p.z] as [number,number]);
  let result:polygonClipping.MultiPolygon=[[ring]];
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4,dx=Math.cos(angle)*distance,dz=Math.sin(angle)*distance;
    result=polygonClipping.intersection(result,[ring.map(([x,z]):[number,number]=>[x+dx,z+dz])]);
  }
  const area=(ring:polygonClipping.Ring)=>Math.abs(ring.reduce((s,p,i)=>{
    const q=ring[(i+1)%ring.length]!;return s+p[0]*q[1]-q[0]*p[1];
  },0));
  const shell=result.map(p=>p[0]!).sort((a,b)=>area(b)-area(a))[0];
  if(!shell)throw new Error('Polygon inset removed the entire outline');
  return shell.slice(0,-1).map(([x,z])=>({x,z}));
}
