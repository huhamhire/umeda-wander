import type {PublicPassage} from '../domain/map/model.ts';
import {describeStationSite,stationPublicPortal} from '../application/station-site.ts';
import {planUndergroundSpace} from '../application/underground-space.ts';
import {projectSouthReference} from './district-placement.ts';
import {stationMaps} from './station-maps.ts';
import {southDistrictAreas,diamorRoundPlaza} from './west-district-links.ts';

/** The source-map plane owns the district network; station interiors remain independent. */
export const stationSites=stationMaps.map(describeStationSite);
const stationById=new Map(stationMaps.map(s=>[s.id,s]));
const ref=(points:[number,number][])=>points.map(([x,z])=>projectSouthReference(x,z));
const surfaceId='south-underground-excavation';
const sources=['diamor-','district-','y11-kitashinchi-','nishi-hanshin-','whity-','hanshin-east-whity-','metro-hanshin-','jr-hanshin-'];
const profiles:Record<string,number[]>={
  'diamor-hanshin-kitashinchi-public':[6,7.2,8,6],
  'diamor-east-west-public':[5,8,7.2,5],
  'diamor-diagonal-public':[7.2,5.5,7.2,5,5],
  'diamor-t20-public':[7.2,6,6,5],
};

export function southernUnderground(passages:PublicPassage[]){
  const selected=passages.filter(p=>p.kind==='underground'&&sources.some(prefix=>p.id.startsWith(prefix)));
  const skeletons=selected.map(p=>{
    const points=p.points.map(point=>({...point}));
    for(const index of [0,points.length-1]){
      const endpoint=points[index]!,station=endpoint.station?stationById.get(endpoint.station):undefined;
      if(station)points[index]=stationPublicPortal(station,endpoint,points[index===0?1:index-1]!);
    }
    return {...p,points,surfaceId};
  });
  const evidence={source:'district' as const,pages:[1],detail:
    'references/梅田周边地区通道.pdf and Umeda Walkway Maps/umeda-elevated-walkways-2026.pdf p1: DIAMOR/Whity public-space topology, circular plaza and widened intersections. Width profiles and simplified chamber corners fitted in projectSouthReference, not surveyed excavation boundaries. No navigation edges.'};
  const areas=planUndergroundSpace({id:surfaceId,name:'南侧地下公共空间',level:'kitashinchi-hall',evidence,
    sections:skeletons.map(p=>({points:p.points,widths:profiles[p.id]??p.points.map(()=>p.width)})),
    chambers:[{outline:diamorRoundPlaza.outline},
      {outline:ref([[525,595],[575,598],[580,610],[611,610],[611,641],[574,641],[574,652],[528,652],[528,640],[513,640],[513,613],[525,613]])},
      {outline:ref([[731,606],[760,594],[785,609],[801,642],[772,650],[750,638]])}],
    exclusions:[...southDistrictAreas,
      ...stationSites.flatMap(site=>site.layers.filter(l=>stationMaps.find(s=>s.id===site.station)!.levels.find(level=>level.id===l.level)!.y===-8).flatMap(l=>l.regions)),
    ],
  });
  const replacements=new Map(skeletons.map(p=>[p.id,p]));
  return {areas,passages:passages.map(p=>replacements.get(p.id)??p),skeletons};
}
