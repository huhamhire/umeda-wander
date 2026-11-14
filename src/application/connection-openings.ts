import type { FloorOpening, Level, Platform, Point2, VerticalConnection } from '../domain/map/model.ts';
import { passageOutline, rotatePoint } from '../domain/map/geometry.ts';
import { connectionHeading } from './connection-orientation.ts';
import {connectionLanes,escalatorOverallWidth} from './connection-lanes.ts';

// Diagram units shared by the clearance plan and its rendered equipment.
export const escalatorWidth = escalatorOverallWidth;
export const elevatorShaftWidth = 4;

export function planFloorOpenings(connections: VerticalConnection[], levels: Level[], platforms:Platform[], surfaces:Pick<Level,'id'|'y'>[]=levels): FloorOpening[] {
  const openings: FloorOpening[] = [];
  for (const bank of connections) for(const connection of connectionLanes(bank)) {
    if(connection.placement==='exterior')continue;
    const fromY = levels.find(level => level.id === connection.from.level)!.y+(connection.from.elevationOffset??0);
    const toY = levels.find(level => level.id === connection.to.level)!.y+(connection.to.elevationOffset??0);
    const lowY = Math.min(fromY, toY), highY = Math.max(fromY, toY);
    const dx = connection.to.x - connection.from.x, dz = connection.to.z - connection.from.z;
    const run = Math.hypot(dx, dz);
    const direction = { x: run > 0 ? dx / run : 1, z: run > 0 ? dz / run : 0 };
    for (const level of surfaces) {
      if (level.y < lowY || level.y > highY) continue;
      if (connection.kind !== 'elevator' && level.y === lowY) continue;
      const t = (level.y - fromY) / (toY - fromY);
      const center: Point2 = { x: connection.from.x + t * dx, z: connection.from.z + t * dz };
      let outline: Point2[];
      if (connection.kind === 'elevator') {
        const half = (elevatorShaftWidth + 0.5) / 2;
        const heading=connectionHeading(connection,platforms,fromY,toY);
        outline = [{ x: center.x-half,z:center.z-half },{ x:center.x+half,z:center.z-half },
          { x:center.x+half,z:center.z+half },{ x:center.x-half,z:center.z+half }].map(point=>rotatePoint(point,center,heading));
      } else {
        // Opening extends toward the descending ramp, leaving an upper landing plate.
        const sign = Math.sign(toY - fromY);
        const clearance = Math.min(7, Math.max(3.5, run / (highY-lowY) * 3.5));
        outline = passageOutline(
          { x:center.x-direction.x*sign*clearance,z:center.z-direction.z*sign*clearance },
          { x:center.x+direction.x*sign*0.8,z:center.z+direction.z*sign*0.8 },
          connection.width ? connection.width+0.5 : connection.kind === 'escalator' ? escalatorWidth + 0.5 : 3.4);
      }
      openings.push({ connectionId: bank.id, level: level.id, kind: connection.kind, outline });
    }
  }
  return openings;
}
