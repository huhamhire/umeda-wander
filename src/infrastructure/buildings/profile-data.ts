import clipping from 'polygon-clipping';
import profiles from '../../../data/geography/buildings/plateau-profiles.json' with {type: 'json'};
import type {Point2} from '../../domain/map/model.ts';
import type {BuildingVolume} from './building-data.ts';
import {alignedPoint} from './building-data.ts';

const ring = (points: Point2[]): clipping.Ring => points.map(p => [p.x, p.z]);

/** Only a named, audited subset of the open model is used; the walking host stays OSM. */
export function plateauVolumes(host: BuildingVolume, kind: 'hankyu' | 'sanbangai'): BuildingVolume[] {
  return profiles[kind].flatMap((part, i) => {
    const geometry = clipping.intersection(part.rings as clipping.Polygon, [ring(host.outline)]);
    return geometry.map((polygon, j) => ({
      name: `${kind}-lod2-${i}-${j}`,
      outline: polygon[0]!.map(([x, z]) => ({x, z})),
      holes: polygon.slice(1).map(r => r.map(([x, z]) => ({x, z}))),
      base: part.base,
      top: part.top,
      source: profiles.source,
      certainty: 'plateau-lod2' as const,
      note: profiles.note,
      facade: part.top - part.base > 50 ? 'vertical' as const : 'plain' as const,
    }));
  });
}

/** Shrink a building-aligned rectangle intact instead of clipping a sharp site corner. */
export function inscribedSlab(
  host: BuildingVolume,
  name: string,
  base: number,
  top: number,
  angle: number,
  bounds: [number, number, number, number],
): BuildingVolume {
  const [u0, u1, v0, v1] = bounds;
  const center = alignedPoint(host.outline, angle, (u0 + u1) / 2, (v0 + v1) / 2);
  let outline = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]
    .map(([u, v]) => alignedPoint(host.outline, angle, u!, v!));
  for (let i = 0; i < 60; i++) {
    const outside = clipping.difference([ring(outline)], [ring(host.outline)]);
    if (!outside.length) {
      return {...host, name, outline, holes: [], base, top, certainty: 'estimate'};
    }
    outline = outline.map(p => ({x: center.x + (p.x - center.x) * .97, z: center.z + (p.z - center.z) * .97}));
  }
  throw new Error(`Unable to inscribe ${name}`);
}

/** Round sharp convex podium corners, keeping long street edges and concave access notches. */
export function softenPodium(outline: Point2[], radius: number): Point2[] {
  const points = outline.filter((p, i) => i === 0 || Math.hypot(p.x - outline[i - 1]!.x, p.z - outline[i - 1]!.z) > .01);
  if (Math.hypot(points[0]!.x - points.at(-1)!.x, points[0]!.z - points.at(-1)!.z) < .01) {
    points.pop();
  }
  const signed = points.reduce((sum, a, i) => {
    const b = points[(i + 1) % points.length]!;
    return sum + a.x * b.z - a.z * b.x;
  }, 0);
  return points.flatMap((p, i) => {
    const a = points[(i + points.length - 1) % points.length]!;
    const b = points[(i + 1) % points.length]!;
    const la = Math.hypot(a.x - p.x, a.z - p.z);
    const lb = Math.hypot(b.x - p.x, b.z - p.z);
    const cross = (p.x - a.x) * (b.z - p.z) - (p.z - a.z) * (b.x - p.x);
    if (cross * signed <= 0 || Math.min(la, lb) < 5) {
      return [p];
    }
    const d = Math.min(radius, la * .22, lb * .22);
    const start = {x: p.x + (a.x - p.x) * d / la, z: p.z + (a.z - p.z) * d / la};
    const end = {x: p.x + (b.x - p.x) * d / lb, z: p.z + (b.z - p.z) * d / lb};
    return Array.from({length: 7}, (_, j) => {
      const t = j / 6;
      return {x: (1 - t) ** 2 * start.x + 2 * t * (1 - t) * p.x + t * t * end.x,
        z: (1 - t) ** 2 * start.z + 2 * t * (1 - t) * p.z + t * t * end.z};
    });
  });
}
