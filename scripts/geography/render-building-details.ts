import {mkdirSync,writeFileSync} from 'node:fs';
import {geographicBuildings} from '../../src/infrastructure/buildings/index.ts';
import type {Point2} from '../../src/domain/map/model.ts';
const ids=['daimaru','hankyu-dept','yodobashi','grand-front-south','jp-tower','lucua-1100'];
const parts:string[]=[];
const project=(p:Point2,y:number)=>({x:p.x*.86+p.z*.5,y:p.z*.43-p.x*.25-y*.86});
for(const [index,id] of ids.entries()){
 const b=geographicBuildings.find(b=>b.id===id)!;
 const points=b.volumes.flatMap(v=>v.outline.flatMap(p=>[project(p,v.base),project(p,v.top)]));
 const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
 const scale=Math.min(430/(maxX-minX),310/(maxY-minY));
 const screen=(p:Point2,y:number)=>{const q=project(p,y);return `${((q.x-minX)*scale+30).toFixed(2)},${((q.y-minY)*scale+65).toFixed(2)}`;};
 const faces:{d:string;depth:number;fill:string}[]=[];
 for(const v of b.volumes){
  for(const ring of [v.outline,...v.holes])for(let i=0;i<ring.length-1;i++){
   const a=ring[i]!,c=ring[i+1]!;
   faces.push({d:`M${screen(a,v.base)}L${screen(c,v.base)}L${screen(c,v.top)}L${screen(a,v.top)}Z`,depth:(a.z+c.z)*.5+(a.x+c.x)*.25+(v.top+v.base)*.25,fill:v.base?'#a6bdbb':'#d4d4c8'});
  }
  faces.push({d:[v.outline,...v.holes].map(r=>'M'+r.map(p=>screen(p,v.top)).join('L')+'Z').join(''),depth:Math.max(...v.outline.map(p=>p.z+p.x*.5))+v.top*.5,fill:'#eef0e4'});
 }
 const x=index%2*510,y=Math.floor(index/2)*440;
 parts.push(`<g transform="translate(${x},${y})"><text x="24" y="28">${b.name}</text>${faces.sort((a,b)=>a.depth-b.depth).map(f=>`<path d="${f.d}" fill="${f.fill}" fill-rule="evenodd" stroke="#708981" stroke-width=".6"/>`).join('')}<text x="24" y="420" font-size="13">高度／退台含估计 · 建筑各自缩放 · 仅核对形体</text></g>`);
}
mkdirSync('build/geography',{recursive:true});
writeFileSync('build/geography/building-details.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="1020" height="1320"><rect width="1020" height="1320" fill="#f6f4e9"/><g font-family="Microsoft YaHei,sans-serif" font-size="18" fill="#31524d">${parts.join('')}</g></svg>`);
