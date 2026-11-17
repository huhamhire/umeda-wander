import { mkdirSync, writeFileSync } from 'node:fs';
import { layout, levels, elevated, elevatedAreas, deckBuildingAreas, deckAccess, geographicPlan } from '../../src/infrastructure/district/geographic-map.ts';
import { areaColor } from '../../src/presentation/area-palette.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { pendingDecks } from '../../src/infrastructure/public-areas/elevated-source.ts';
import { deckBuildingOccupancies } from '../../src/infrastructure/public-areas/deck-buildings.ts';
import { pointInPolygon, closestPolygonPoint } from '../../src/domain/map/geometry.ts';
import type { Point2, PlanRegion } from '../../src/domain/map/model.ts';
const project = ([lon, lat]: number[]): Point2 => ({ x: (lon! - 135.491) * 111320 * Math.cos(34.708 * Math.PI / 180), z: (34.708 - lat!) * 111320 });
const path = (r: Point2[]) => 'M' + r.map(p => `${p.x.toFixed(2)},${p.z.toFixed(2)}`).join('L') + 'Z';
const shape = (a: PlanRegion) => [a.outline, ...a.holes ?? []].map(path).join('');
const contains = (a: PlanRegion, p: Point2) => pointInPolygon(p, a.outline) && !a.holes?.some(h => pointInPolygon(p, h));
const distance = (a: PlanRegion, p: Point2) => {
  if (contains(a, p))
    return 0;
  const q = closestPolygonPoint(p, a.outline);
  return Math.hypot(q.x - p.x, q.z - p.z);
};
const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const shapes: string[] = [];
for (const raw of geographicPlan.ground) {
  const f = raw as unknown as {
    id: string;
    properties: Record<string, string>;
    geometry: {
      type: string;
      coordinates: unknown;
    };
  };
  if (f.geometry.type === 'LineString') {
    const p = (f.geometry.coordinates as number[][]).map(project), width = geographicPlan.widths.find(w => String(w.id) === f.id.split('/')[1])?.metres ?? 4;
    shapes.push(`<path d="M${p.map(p => `${p.x},${p.z}`).join('L')}" fill="none" stroke="#ccd3cf" stroke-width="${width}"/>`);
  }
  else {
    const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates as number[][][][] : [f.geometry.coordinates as number[][][]];
    for (const p of polys)
      shapes.push(`<path d="${p.map(r => path(r.map(project))).join('')}" fill="#e1e5d8" stroke="#c5cebd" stroke-width=".3" fill-rule="evenodd"/>`);
  }
}
for (const a of deckBuildingAreas) {
  shapes.push(`<path d="${shape(a)}" fill="#${areaColor(a).toString(16).padStart(6, '0')}" stroke="#b3bcae" stroke-width=".3" fill-rule="evenodd"/>`);
  if (a.label && a.labelAnchor)
    shapes.push(`<text transform="translate(${a.labelAnchor.x} ${a.labelAnchor.z}) rotate(${(a.labelAngleRad ?? 0) * 180 / Math.PI})" text-anchor="middle" fill="#55675f" font-family="Microsoft YaHei,sans-serif" font-size="5" textLength="${a.labelWidth}" lengthAdjust="spacingAndGlyphs">${esc(a.name)}</text>`);
}
for (const area of layout.areas.filter(area => area.kind === 'public' && [4, 8].includes(levels.find(level => level.id === area.level)!.y))) {
  const color = '#' + areaColor(area).toString(16).padStart(6, '0');
  shapes.push(`<path d="${shape(area)}" fill="${color}" stroke="#7e9287" stroke-width=".3" fill-rule="evenodd"><title>${esc(area.id)}</title></path>`);
}
for (const a of layout.areas.filter(a => a.kind === 'paid' && [4, 8].includes(levels.find(l => l.id === a.level)!.y)))
  shapes.push(`<path d="${shape(a)}" fill="#c6caca" stroke="#9d9d9d" stroke-width=".4"/>`);
for (const c of deckAccess.connections)
  shapes.push(`<circle cx="${c.to.x}" cy="${c.to.z}" r="1.6" fill="#355b87"><title>${esc(c.id)}</title></circle>`);
for (const p of elevated.portals)
  shapes.push(`<circle cx="${p.point.x}" cy="${p.point.z}" r="2.5" fill="none" stroke="#a94d47" stroke-width=".8"><title>${esc(p.id)}</title></circle>`);
for (const a of layout.atria ?? [])
  for (const o of a.openings.filter(o => levels.find(l => l.id === o.level)!.y === 8))
    shapes.push(`<path d="${path(o.outline)}" fill="#f4f2e7" stroke="#aa9e85" stroke-dasharray="2 2" stroke-width=".6"/>`);
const out = 'build/geography';
mkdirSync(out, { recursive: true });
for (const [name, box, w, h] of [['overview', '60 250 740 650', 1480, 1300], ['north', '300 300 460 280', 1380, 840], ['south', '300 540 470 320', 1410, 960], ['west', '60 420 290 350', 870, 1050]] as const)
  writeFileSync(`${out}/stage-four-${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${box}"><rect x="-2000" y="-2000" width="5000" height="5000" fill="#f4f2e7"/>${shapes.join('')}</svg>`);
const bindings = elevated.portals.map(p => {
  const y = levels.find(l => l.id === p.level)!.y;
  const surfaces = layout.areas.filter(a => a.kind === 'public' && levels.find(l => l.id === a.level)!.y === y);
  const building = geographicBuildings.find(b => b.id === p.target);
  const contextHost = deckBuildingOccupancies.find(group => group.level === p.level)?.definitions.find(host => host.id === p.target);
  const target = building?.volumes.filter(v => v.base <= y && v.top > y) ?? (contextHost ? [contextHost.region] : layout.areas.filter(a => levels.find(l => l.id === a.level)!.y === y &&
    a.kind === 'public' && levels.find(l => l.id === a.level)!.station === p.target.replace('station:', '')));
  return { id: p.id, target: p.target, elevation: y, publicDistance: Math.min(...surfaces.map(a => distance(a, p.point))), targetDistance: Math.min(...target.map(a => distance(a, p.point))), note: 'Distances audit explicit source targets only; they do not create doors or routing edges.' };
});
const report = { blocks: elevated.blocks.map(b => ({ id: b.id, level: b.level, sourcePaths: b.paths.length, faces: elevatedAreas.filter(a => a.blockId === b.id).length })),
  bindings, publicEquipment: deckAccess.connections.map(c => c.id), pending: pendingDecks,
  limitations: ['Widths, facade mouths, source-to-station frontage and heights estimated.', 'Source-confirmed relation is not survey or accessible-route certification.', 'No browser/WebGL/touch testing; offline plan only.'] };
writeFileSync(out + '/stage-four-audit.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
