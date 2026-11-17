import type {PublicPassage} from '../../src/domain/map/model.ts';
import {describeStationSite,stationPublicPortal} from '../../src/application/station-site.ts';
import {planUndergroundSpace} from '../../src/application/underground-space.ts';
import {stationMaps} from './station-maps.ts';
import {southDistrictAreas,diamorRoundPlaza} from './west-district-links.ts';
import {southWalkwayRegions} from './south-walkway-plan.ts';

/** The source-map plane owns the district network; station interiors remain independent. */
export const stationSites=stationMaps.map(describeStationSite);
const stationById=new Map(stationMaps.map(s=>[s.id,s]));
const surfaceId='south-underground-excavation';
const sources=['diamor-','district-','y11-kitashinchi-','nishi-hanshin-','whity-hankyu-','whity-metro-'];

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
    'references/梅田周边地区通道.pdf, UMEDA CONNECT 2024-02 map: simplified yellow public-space boundary polygons in one shared crop frame. Station perimeters and building infill are constraints; geometry is not buffered from old chords or a surveyed excavation plan. No navigation edges.'};
  const areas=planUndergroundSpace({id:surfaceId,name:'南侧地下公共空间',level:'kitashinchi-hall',evidence,
    // Only short boundary landing adapters may be procedural. District streets
    // themselves are authored faces; never regenerate them from these skeletons.
    sections:skeletons.flatMap(p=>[0,p.points.length-1].flatMap(i=>{
      const endpoint=p.points[i]!,near=p.points[i===0?1:i-1]!;
      return (endpoint.station||endpoint.buildingId)&&Math.hypot(endpoint.x-near.x,endpoint.z-near.z)<9?
        [{points:[endpoint,near],widths:[p.width,p.width]}]:[];
    })),
    chambers:[...southWalkwayRegions,{outline:diamorRoundPlaza.outline}],
    exclusions:[...southDistrictAreas,
      ...stationSites.flatMap(site=>site.layers.filter(l=>stationMaps.find(s=>s.id===site.station)!.levels.find(level=>level.id===l.level)!.y===-8).flatMap(l=>l.regions)),
    ],
  });
  const replacements=new Map(skeletons.map(p=>[p.id,p]));
  return {areas,passages:passages.map(p=>replacements.get(p.id)??p),skeletons};
}
