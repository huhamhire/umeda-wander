import {test} from 'node:test';
import assert from 'node:assert/strict';
import {axisPlacement} from '../src/domain/map/axis-calibration.ts';
import {createGeographicStations} from '../src/infrastructure/district/geographic-stations.ts';
import {hankyuStation} from '../src/infrastructure/stations/hankyu-umeda/index.ts';
import {metroAxis} from '../src/infrastructure/stations/metro-umeda/geographic.ts';

test('axis calibration rejects collapsed axes and maps local origin correctly',()=>{
  assert.throws(()=>axisPlacement({...metroAxis,positiveEnd:metroAxis.negativeEnd}));
  const fit=axisPlacement(metroAxis);
  assert.equal(fit.origin.x,(metroAxis.negativeEnd.x+metroAxis.positiveEnd.x)/2);
});
test('geographic generation leaves legacy data unchanged and produces independent instances',()=>{
  const before=JSON.stringify(hankyuStation);
  const a=createGeographicStations(),b=createGeographicStations();
  a[1]!.layout.platforms[0]!.x=0;
  assert.notEqual(b[1]!.layout.platforms[0]!.x,0);
  assert.equal(JSON.stringify(hankyuStation),before);
});
test('M16 platform ends match the calibrated axis and remains narrower than the reservation',()=>{
  const p=createGeographicStations()[2]!.layout.platforms[0]!;
  for(const [sign,target] of [[-1,metroAxis.negativeEnd],[1,metroAxis.positiveEnd]] as const){
    assert.ok(Math.hypot(p.x+sign*p.length/2*Math.cos(p.rotationRad)-target.x,
      p.z+sign*p.length/2*Math.sin(p.rotationRad)-target.z)<1e-8);
  }
  assert.ok(p.width<16&&p.width>8);
});
test('calibrated slices retain valid platform ownership and connection endpoints',()=>{
  for(const s of createGeographicStations()){
    const levels=new Set(s.levels.map(l=>l.id)),platforms=new Map(s.layout.platforms.map(p=>[p.id,p]));
    for(const c of s.layout.connections){
      assert.ok(levels.has(c.from.level)&&levels.has(c.to.level));
      if(!c.platformId)continue;
      const p=platforms.get(c.platformId);assert.ok(p,`${c.id} missing platform`);
      const end=[c.from,c.to].find(n=>n.level===p.level);assert.ok(end);
      const dx=end.x-p.x,dz=end.z-p.z;
      const along=dx*Math.cos(p.rotationRad)+dz*Math.sin(p.rotationRad);
      const across=-dx*Math.sin(p.rotationRad)+dz*Math.cos(p.rotationRad);
      assert.ok(Math.abs(along)<=p.length/2+1e-5,`${c.id} outside platform length`);
      assert.ok(Math.abs(across)<=p.width/2+1e-5,`${c.id} outside platform width`);
    }
  }
});
