import clipping from 'polygon-clipping';
import {volume, alignedPoint, type GeographicBuilding} from '../building-data.ts';
import {softenPodium} from '../profile-data.ts';

const source = volume('502411898', '阪神百货地面退让裙楼', 0, 14);
const groundOutline = softenPodium(source.outline, 8);
const references = [
  'https://www.nihonsekkei.co.jp/projects/18825/',
  'https://office.hankyu-hanshin.co.jp/twin-south/outline/',
];
const rectangle = (u0: number, u1: number, v0: number, v1: number) =>
  [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]
    .map(([u, v]) => alignedPoint(groundOutline, 0, u!, v!));

// The street-level L is not the envelope of the upper retail floors. Those
// bridge the road and form one continuous podium under the inset office tower.
const bridgeOutline = softenPodium(rectangle(.59, .99, .09, .81), 6);
const upperRegion = clipping.union(
  [groundOutline.map(p => [p.x, p.z] as [number, number])],
  [bridgeOutline.map(p => [p.x, p.z] as [number, number])],
);
const podium = {
  ...source,
  outline: groundOutline,
  facade: 'vertical' as const,
  surface: 'podium' as const,
};
const upper = {
  ...source,
  name: '跨道路的一体化上部裙楼',
  outline: upperRegion[0]![0]!.map(([x, z]) => ({x, z})),
  holes: upperRegion[0]!.slice(1).map(r => r.map(([x, z]) => ({x, z}))),
  base: 14,
  top: 52,
  facade: 'vertical' as const,
  surface: 'podium' as const,
  support: 'over-road' as const,
  references,
  note: 'Unified retail envelope across the road, not a second office shaft. Ground clearance, terrace setback and upper extent are reference fits, not surveyed or walkable floors.',
};
const office = {
  ...source,
  name: 'South 东侧单座办公塔楼',
  outline: rectangle(.62, .97, .12, .70),
  base: 52,
  top: 188.9,
  facade: 'grid' as const,
  surface: 'tower' as const,
  references,
  note: 'Single office tower set back on the continuous retail podium. North is the separate Hankyu complex. Approximate 4,650 square metre gross footprint; no historical PLATEAU Hanshin geometry is used.',
};
export const building: GeographicBuilding = {
  id: 'hanshin-dept',
  name: '阪神百货 / Twin Towers South',
  volumes: [podium, upper, office],
};
