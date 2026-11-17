import type {Point2} from '../../src/domain/map/model.ts';
import clipping from 'polygon-clipping';
import {passageOutline} from '../../src/domain/map/geometry.ts';

// Millimetre rounding prevents near-coincident source fits destabilising clipping.
// It is numerical normalization, not a claim of survey accuracy.
export const ring = (points: Point2[]): clipping.Ring => points.map(p => [
  Math.round(p.x * 1000) / 1000,
  Math.round(p.z * 1000) / 1000,
]);

function distance(point: Point2, a: Point2, b: Point2): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(point.x - a.x - t * dx, point.z - a.z - t * dz);
}

/** Simplification is for the outer display mask only, never the underground faces. */
function simplify(points: Point2[], tolerance: number): Point2[] {
  if (points.length < 4) {
    return points;
  }
  let split = 0;
  let maximum = tolerance;
  for (let i = 1; i < points.length - 1; i++) {
    const d = distance(points[i]!, points[0]!, points.at(-1)!);
    if (d > maximum) {
      maximum = d;
      split = i;
    }
  }
  if (!split) {
    return [points[0]!, points.at(-1)!];
  }
  return [...simplify(points.slice(0, split + 1), tolerance).slice(0, -1), ...simplify(points.slice(split), tolerance)];
}

/** Preserve the enclosing ground, filling display-mask holes without changing B1. */
export function contextEnvelope(outlines: Point2[][], margin: number, tolerance: number): clipping.MultiPolygon {
  const pieces: clipping.Polygon[] = [];
  for (const outline of outlines) {
    const closed = [...outline];
    const first = closed[0]!;
    const last = closed.at(-1)!;
    if (first.x !== last.x || first.z !== last.z) {
      closed.push(first);
    }
    const edge = simplify(closed, tolerance);
    pieces.push([ring(edge)]);
    for (let i = 1; i < edge.length; i++) {
      const a = edge[i - 1]!;
      const b = edge[i]!;
      if (Math.hypot(b.x - a.x, b.z - a.z) > .01) {
        pieces.push([ring(passageOutline(a, b, margin * 2))]);
      }
      pieces.push([ring(Array.from({length: 12}, (_, j) => ({
        x: a.x + margin * Math.cos(j * Math.PI / 6),
        z: a.z + margin * Math.sin(j * Math.PI / 6),
      })))]);
    }
  }
  return unionContextPieces(pieces.map(p => [p]));
}

export function unionContextPieces(pieces: clipping.MultiPolygon[]): clipping.MultiPolygon {
  let batches = pieces;
  while (batches.length > 1) {
    const next: clipping.MultiPolygon[] = [];
    for (let i = 0; i < batches.length; i += 16) {
      const batch = batches.slice(i, i + 16);
      const merged = clipping.union(batch[0]!, ...batch.slice(1));
      next.push(merged.map(p => p.map(r => r.map(([x, z]) => [
        Math.round(x * 1000) / 1000,
        Math.round(z * 1000) / 1000,
      ]))));
    }
    batches = next;
  }
  const union = batches[0]!;
  // Small enclosed blocks should still hide the underground when ground is enabled.
  return union.map(polygon => [polygon[0]!]);
}
