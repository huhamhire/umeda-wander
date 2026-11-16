import * as footprints from './commercial-footprints.ts';
import {districtFrame,districtPlacements} from './district-placement.ts';
import * as orientation from './station-orientation.ts';
import {commercialBuildings} from './commercial-district.ts';
import {layout} from './umeda-map.ts';

/** Machine-readable OSM-derived subset; excludes indoor plans, photos and source code. */
export function osmCreditData(){return {
  title:'UMEDA：OSM 衍生几何数据',attribution:'© OpenStreetMap contributors',
  licence:'https://opendatacommons.org/licenses/odbl/1-0/',source:'https://www.openstreetmap.org/copyright',
  notes:'仅为 OSM 衍生子集，不覆盖整个项目、站内构内图整理、图片或素材的许可。场景坐标为示意比例，不是测量坐标。',
  reconstruction:'原始 way/version 见 footprints；坐标按 frame 投影，随后简化并施加显示偏移。提供缓存点、最终建筑轮廓和 OSM 核对过的轨道尾段方向。不包含从铁路构内图整理的站内几何或配线图。',
  frame:districtFrame,placements:districtPlacements,orientation,footprints,
  buildingOutlines:commercialBuildings.map(b=>({id:b.id,outline:b.outline,osmSources:b.evidence.urls?.filter(u=>u.includes('openstreetmap.org/'))})),
  railDirectionFits:layout.railApproaches.filter(r=>r.evidence.detail.includes('OSM')).map(r=>{
    const tail=r.segments.at(-1)!;
    const end=r.nodes.find(n=>n.id===tail.to)!.point;
    return {id:r.id,end,direction:{x:end.x-tail.control2.x,z:end.z-tail.control2.z}};
  }),
};}
