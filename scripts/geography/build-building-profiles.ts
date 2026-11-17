import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import clipping from 'polygon-clipping';

interface RoofSource {
  id: string;
  gmlId: string;
  surveyYear: string;
  roofs: {height: number; slope: number; rings: number[][][]}[];
}
const sources = JSON.parse(readFileSync('build/geography/plateau-roofs.json', 'utf8')) as RoofSource[];
const makeProfile = (ids: string[], minimum: number, maximum: number) => {
  const roofs = sources.filter(s => ids.includes(s.id)).flatMap(s => s.roofs)
    .filter(r => r.height > minimum + .5 && r.slope < 1.1);
  const heights = [...new Set(roofs.map(r => Math.min(maximum, Math.round(r.height))))].sort((a, b) => a - b);
  return heights.flatMap((top, i) => {
    const patches = roofs.filter(r => Math.min(maximum, Math.round(r.height)) >= top);
    // Millimetre/centimetre source coordinates make shared triangle edges stable.
    const geometry = clipping.union(patches[0]!.rings as clipping.Polygon,
      ...patches.slice(1).map(r => r.rings as clipping.Polygon));
    return geometry.filter(p => {
      const ring = p[0]!;
      const area = Math.abs(ring.reduce((s, p, i) => s + p[0] * ring[(i + 1) % ring.length]![1] - p[1] * ring[(i + 1) % ring.length]![0], 0)) / 2;
      return area > 4;
    }).map(p => ({base: i ? heights[i - 1]! : minimum, top, rings: p}));
  });
};
const result = {
  source: 'https://www.geospatial.jp/ckan/dataset/plateau-27100-osaka-shi-2025',
  licence: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: '3D都市モデル（Project PLATEAU）大阪市（2025年度）を加工して作成',
  mesh: '52350349_bldg_6697_op.gml',
  sourceBuildings: sources.map(({id, gmlId, surveyYear}) => ({id, gmlId, surveyYear})),
  note: 'LOD2 roof patches unioned into stepped white-model profiles; no imagery. Survey year 2017. Ground footprints and walking interfaces remain independently maintained. Hanshin and JP post-redevelopment silhouettes are not derived from this historical survey.',
  hankyu: makeProfile(['hankyu-retail', 'hankyu-office'], 60, 186.95),
  sanbangai: makeProfile(['sanbangai-station'], 15, 77),
};
mkdirSync('data/geography/buildings', {recursive: true});
writeFileSync('data/geography/buildings/plateau-profiles.json', JSON.stringify(result) + '\n');
console.log({hankyu: result.hankyu.length, sanbangai: result.sanbangai.length});
