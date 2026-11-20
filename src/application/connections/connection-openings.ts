import clipping from 'polygon-clipping';
import type { FloorOpening, Level, Platform, Point2, VerticalConnection } from '../../domain/map/model.ts';
import { passageOutline, rotatePoint } from '../../domain/map/geometry.ts';
import { connectionHeading } from './connection-orientation.ts';
import { connectionLanes, escalatorOverallWidth } from './connection-lanes.ts';
// Diagram units shared by the clearance plan and its rendered equipment.
export const escalatorWidth = escalatorOverallWidth;
export const elevatorShaftWidth = 3;
export const elevatorWellHalfWidth = elevatorShaftWidth / 2 + 0.25;

/** Build a door-width apron, joining it to the supplied floor where they overlap. */
export function elevatorDoorApproach(center: Point2, facing: number, connectedFloor?: Point2[]): Point2[] {
    const point = (distance: number): Point2 => ({
        x: center.x + Math.cos(facing) * distance,
        z: center.z + Math.sin(facing) * distance
    });
    const approach = passageOutline(point(elevatorShaftWidth / 2 - 0.1), point(elevatorWellHalfWidth + 1.5), 2.6);
    if (!connectedFloor) {
        return approach;
    }
    const [floor, apron] = [connectedFloor, approach].map(outline => [outline.map(({ x, z }): clipping.Pair => [x, z])]);
    const joined = clipping.union(floor!, apron!);
    if (joined.length !== 1 || joined[0]!.length !== 1) {
        throw new Error('An elevator approach and its connected floor must form one simple outline');
    }
    return joined[0]![0]!.slice(0, -1).map(([x, z]) => ({ x, z }));
}

/**
 * Plan real slab openings for each equipment lane; exterior connections do not cut internal wells.
 */
export function planFloorOpenings(
    connections: VerticalConnection[],
    levels: Level[],
    platforms: Platform[],
    surfaces: Pick<Level, 'id' | 'y'>[] = levels
): FloorOpening[] {
    const openings: FloorOpening[] = [];
    for (const bank of connections) {
        for (const connection of connectionLanes(bank)) {
            if (connection.placement === 'exterior') {
                continue;
            }
            const fromY = levels.find(level => level.id === connection.from.level)!.y + (connection.from.elevationOffset ?? 0);
            const toY = levels.find(level => level.id === connection.to.level)!.y + (connection.to.elevationOffset ?? 0);
            const lowY = Math.min(fromY, toY);
            const highY = Math.max(fromY, toY);
            const dx = connection.to.x - connection.from.x;
            const dz = connection.to.z - connection.from.z;
            const run = Math.hypot(dx, dz);
            const direction = { x: run > 0 ? dx / run : 1, z: run > 0 ? dz / run : 0 };
            for (const level of surfaces) {
                const owner = levels.find(l => l.id === level.id)?.station ?? 'jr-osaka';
                const owners = [connection.from.level, connection.to.level].map(id => levels.find(l => l.id === id)?.station ?? 'jr-osaka');
                // Shared district surfaces receive equipment openings across station ownership.
                if (levels.find(l => l.id === level.id)?.station && !connection.blockId && !owners.includes(owner)) {
                    continue;
                }
                if (level.y < lowY || level.y > highY) {
                    continue;
                }
                if (connection.kind !== 'elevator' && level.y === lowY) {
                    continue;
                }
                const t = (level.y - fromY) / (toY - fromY);
                const center: Point2 = { x: connection.from.x + t * dx, z: connection.from.z + t * dz };
                let outline: Point2[];
                if (connection.kind === 'elevator') {
                    const half = elevatorWellHalfWidth;
                    const heading = connectionHeading(connection, platforms, fromY, toY);
                    outline = [
                        { x: center.x - half, z: center.z - half },
                        { x: center.x + half, z: center.z - half },
                        { x: center.x + half, z: center.z + half },
                        { x: center.x - half, z: center.z + half }
                    ].map(point => rotatePoint(point, center, heading));
                }
                else {
                    // Opening extends toward the descending ramp, leaving an upper landing plate.
                    const sign = Math.sign(toY - fromY);
                    const clearance = Math.min(7, Math.max(3.5, run / (highY - lowY) * 3.5));
                    outline = passageOutline(
                        { x: center.x - direction.x * sign * clearance, z: center.z - direction.z * sign * clearance },
                        { x: center.x + direction.x * sign * 0.8, z: center.z + direction.z * sign * 0.8 },
                        connection.openingWidth ?? ((connection.width ?? (connection.kind === 'escalator' ? escalatorWidth : 2.9)) + 0.5)
                    );
                }
                openings.push({
                    connectionId: bank.id,
                    level: level.id,
                    kind: connection.kind,
                    outline
                });
            }
        }
    }
    return openings;
}
