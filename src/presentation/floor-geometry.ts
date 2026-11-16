import * as T from 'three';
import polygonClipping from 'polygon-clipping';
import type { PlanRegion,Point2 } from '../domain/map/model.ts';

/** Real polygon subtraction supports both enclosed wells and edge notches. */
export function buildFloorGeometry(outline: Point2[], openings: Point2[][], thickness: number, bottomY = 0, publicVoids:PlanRegion[]=[]): T.BufferGeometry {
  const ring = (points: Point2[]): [number, number][] => points.map(point => [point.x,point.z]);
  const polygons = polygonClipping.difference([ring(outline)], ...openings.map(points => [ring(points)]),...publicVoids.map(region=>[region.outline,...region.holes??[]].map(ring)));
  const shapes: T.Shape[] = [];
  for (const polygon of polygons) {
    const shape = new T.Shape();
    polygon[0]!.forEach(([x,z],i) => i === 0 ? shape.moveTo(x,-z) : shape.lineTo(x,-z));
    shape.closePath();
    for (const hole of polygon.slice(1)) {
      const path = new T.Path(); hole.forEach(([x,z],i) => i === 0 ? path.moveTo(x,-z) : path.lineTo(x,-z));
      path.closePath(); shape.holes.push(path);
    }
    shapes.push(shape);
  }
  if (!shapes.length) return new T.BufferGeometry();
  const geometry = new T.ExtrudeGeometry(shapes, { depth: thickness, bevelEnabled: false, steps: 1 });
  geometry.rotateX(-Math.PI / 2); geometry.translate(0,bottomY,0);
  return geometry;
}
