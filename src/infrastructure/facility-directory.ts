import type {Facility,Level,Platform,VerticalConnection} from '../domain/map/model.ts';

/** Include each modeled vertical landing and platform without duplicating existing POIs. */
export function completeFacilityDirectory(existing:Facility[],connections:VerticalConnection[],platforms:Platform[],levels:Level[]):Facility[]{
  const knownPlatforms:Record<string,string>={platform:'p5-6','umekita-platform':'p21-22',
    'hankyu-umeda-kyoto-platform':'hankyu-umeda-platform-1','metro-umeda-platform-1':'metro-umeda-island','metro-umeda-platform-2':'metro-umeda-island'};
  const result:Facility[]=existing.map(f=>knownPlatforms[f.id]?{...f,kind:'platform',platformId:knownPlatforms[f.id]}:{...f});
  const names={escalator:'扶梯',elevator:'直梯',stairs:'楼梯'};
  const caption=(id:string)=>{
    if(id.startsWith('public-north'))return '北中庭';
    if(id.startsWith('public-umekita'))return '梅北闸外';
    if(id.startsWith('public-jp'))return 'JP Tower 连廊';
    if(id.startsWith('grand-front-plaza'))return 'Grand Front 南侧下沉广场';
    if(id.startsWith('public-south'))return '南侧步道桥';
    if(id.startsWith('jp-garden'))return 'JP Tower 下沉广场';
    if(id.startsWith('district-jr-metro'))return 'JR—御堂筋线通路';
    if(id.startsWith('hankyu'))return '阪急';if(id.startsWith('metro'))return '御堂筋线';
    if(id.startsWith('hanshin'))return '阪神';
    if(id.startsWith('higashi'))return 'T20 东梅田';
    if(id.startsWith('nishi'))return 'Y11 西梅田';
    if(id.startsWith('kitashinchi'))return '北新地';
    if(id.startsWith('walkway')||id.startsWith('umekita')||id==='west-92')return '西口—梅北通路';
    if(id.startsWith('north'))return '北中庭';if(id.startsWith('carillon'))return '钟楼广场';
    if(id.startsWith('central'))return '中央口';if(id.startsWith('sakura'))return '樱桥口';
    if(id.startsWith('west'))return '西口';if(id.startsWith('mido'))return '御堂筋口';
    if(id.startsWith('crost'))return 'Crost';return '南侧公共通道';
  };
  for(const c of connections)for(const [side,p]of [['from',c.from],['to',c.to]] as const){
    const match=result.find(f=>f.kind===c.kind&&f.level===p.level&&Math.hypot(f.x-p.x,f.z-p.z)<0.01&&(f.elevationOffset??0)===(p.elevationOffset??0));
    if(match){match.connectionId=c.id;continue;}
    const platform=platforms.find(p=>p.id===c.platformId),from=levels.find(l=>l.id===c.from.level)!,to=levels.find(l=>l.id===c.to.level)!;
    const destination=platform?(platform.name??`${platform.tracks.join('/')} 番线`):`${from.label} ↔ ${to.label}`;
    result.push({id:`connection-${c.id}-${side}`,connectionId:c.id,name:`${caption(c.id)} · ${names[c.kind]} · ${destination}`,
      kind:c.kind,level:p.level,x:p.x,z:p.z,elevationOffset:p.elevationOffset,note:'',evidence:c.evidence});
  }
  for(const p of platforms){
    if(result.some(f=>f.platformId===p.id))continue;
    result.push({id:`platform-${p.id}`,platformId:p.id,kind:'platform',name:p.name??`${p.tracks.join('/')} 番线站台`,
      level:p.level,x:p.x,z:p.z,note:'',evidence:p.evidence});
  }
  return result;
}
