import clipping from 'polygon-clipping';
import type {FloorArea, PlanRegion, Point2} from '../../src/domain/map/model.ts';
import type {BasementOccupancy} from '../../src/domain/map/public-area.ts';
import {closestPolygonPoint} from '../../src/domain/map/geometry.ts';

const geometry = (region: PlanRegion): clipping.Polygon =>
  [region.outline, ...region.holes ?? []].map(ring => ring.map(p => [p.x, p.z]));

/** Diagnostic separation only. Never creates geometry, portals or navigation edges. */
export function basementBoundaryGaps(buildings: BasementOccupancy[], publicAreas: FloorArea[]) {
  return buildings.map(building => {
    let closest: {gapMetres: number; buildingPoint: Point2; publicPoint: Point2; surfaceId: string; blockId?: string} | undefined;
    for (const surface of publicAreas.filter(a => !a.elevationOffset)) {
      if (clipping.intersection(geometry(building.region), geometry(surface)).length) {
        return {buildingId: building.id, gapMetres: 0, surfaceId: surface.id, kind: 'overlap' as const};
      }
      for (const a of [building.region.outline, ...building.region.holes ?? []]) {
        for (const b of [surface.outline, ...surface.holes ?? []]) {
          const record = (buildingPoint: Point2, publicPoint: Point2) => {
            const gapMetres = Math.hypot(buildingPoint.x - publicPoint.x, buildingPoint.z - publicPoint.z);
            if (!closest || gapMetres < closest.gapMetres) {
              closest = {gapMetres, buildingPoint, publicPoint, surfaceId: surface.id, blockId: surface.blockId};
            }
          };
          for (const p of a) {
            record(p, closestPolygonPoint(p, b));
          }
          for (const p of b) {
            record(closestPolygonPoint(p, a), p);
          }
        }
      }
    }
    return {buildingId: building.id, ...closest, kind: 'boundary-gap' as const};
  });
}
