import {volume, alignedPoint, type GeographicBuilding} from '../building-data.ts';
import {softenPodium} from '../profile-data.ts';

const source = volume('502411898', '阪神百货曲面裙楼', 0, 52);
const podium = {...source, outline: softenPodium(source.outline, 8), facade: 'vertical' as const};
const outline = [[.62, .12], [.97, .12], [.97, .70], [.62, .70]]
  .map(([u, v]) => alignedPoint(podium.outline, 0, u!, v!));
const references = ['https://www.nihonsekkei.co.jp/projects/18825/', 'https://office.hankyu-hanshin.co.jp/twin-south/outline/'];
const transfer = {
  ...source,
  name: '跨道路上空的裙楼连接体',
  outline,
  base: 14,
  top: 52,
  facade: 'vertical' as const,
  support: 'over-road' as const,
  references,
  note: 'The architect documents construction over the road between two former sites. Keep the ground setback open. The 14 m clearance, upper extent and office rectangle are visual estimates, not surveyed or walkable floors.',
};
const office = {
  ...source,
  name: 'South 东侧单座办公塔楼',
  outline,
  base: 52,
  top: 188.9,
  facade: 'grid' as const,
  references,
  note: 'Post-2022 single office tower over the transfer podium. North refers to the separate Hankyu department-store complex. About 4,650 square metre gross footprint is a reference fit; no historical PLATEAU Hanshin geometry is used.',
};
export const building: GeographicBuilding = {
  id: 'hanshin-dept',
  name: '阪神百货 / Twin Towers South',
  volumes: [podium, office, transfer],
};
