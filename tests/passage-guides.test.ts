import {test} from 'node:test';
import assert from 'node:assert/strict';
import {layout} from '../deprecated/infrastructure/umeda-map.ts';
import {pointInPolygon,platformLocalPoint} from '../src/domain/map/geometry.ts';

test('JR guide stays outside both paid areas and follows the modeled descent',()=>{
  const guide=layout.guides.find(g=>g.id==='jr-metro-public-guide')!;
  const descent=layout.connections.find(c=>c.id==='district-jr-metro-stairs')!;
  assert.equal(guide.access,'public');
  assert(guide.points.some(p=>p.id===descent.from.id));assert(guide.points.some(p=>p.id===descent.to.id));
  assert(guide.points[0]!.caption?.includes('出闸后'));assert(guide.points.at(-1)!.caption?.includes('闸外'));
  for(let i=1;i<guide.points.length;i++){
    const a=guide.points[i-1]!,b=guide.points[i]!;
    if(a.level!==b.level)continue;
    for(let j=0;j<=50;j++){
      const t=j/50,p={x:a.x*(1-t)+b.x*t,z:a.z*(1-t)+b.z*t};
      assert(layout.areas.some(area=>area.level===a.level&&area.kind==='public'&&pointInPolygon(p,area.outline)));
      assert(!layout.areas.some(area=>area.level===a.level&&area.kind==='paid'&&pointInPolygon(p,area.outline)));
    }
  }
});

test('Metro middle passages lead to named paid halls through existing vertical facilities',()=>{
  const guides=layout.guides.filter(g=>g.access==='paid');
  assert.equal(guides.length,3);
  for(const guide of guides){
    assert(guide.points.some(p=>p.level==='metro-intermediate'));
    assert.equal(guide.points.at(-1)!.level,'metro-hall');assert(guide.points.at(-1)!.caption?.includes('改札'));
    for(let i=1;i<guide.points.length;i++){
      const a=guide.points[i-1]!,b=guide.points[i]!;
      if(a.level!==b.level){
        assert(layout.connections.some(c=>c.from.id===a.id&&c.to.id===b.id||c.to.id===a.id&&c.from.id===b.id),'invented vertical guide connection');
        continue;
      }
      for(let j=0;j<=50;j++){
        const t=j/50,point={x:a.x*(1-t)+b.x*t,z:a.z*(1-t)+b.z*t};
        assert(layout.areas.some(area=>area.level===a.level&&area.kind==='paid'&&pointInPolygon(point,area.outline))||layout.platforms.some(p=>{
          if(p.level!==a.level)return false;const local=platformLocalPoint(p,point);return Math.abs(local.x)<=p.length/2&&Math.abs(local.z)<=p.width/2;
        }),`${guide.id}: unsupported paid passage`);
      }
    }
  }
});
