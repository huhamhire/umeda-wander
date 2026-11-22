import { pointInPolygon } from '../../domain/map/geometry.ts';
import type { FloorArea, Level, Point2, StationId } from '../../domain/map/model.ts';
import type { StationPublicInterface } from '../../domain/map/spatial-block.ts';

export interface PublicInterfaceBinding {
    interfaceId: string;
    station: StationId;
    surfaceId: string;
    surfaceIds: string[];
    elevation: number;
    point: Point2;
}

/** Resolve explicitly declared gate seams to an existing same-height public face. */
export function bindPublicInterfaces(interfaces: StationPublicInterface[], areas: FloorArea[], levels: Level[]): PublicInterfaceBinding[] {
    return interfaces.map(port => {
        const samples = [
            -.5,
            -.25,
            0,
            .25,
            .5
        ].map(t => ({
            x: port.outside.x + (port.boundary[1].x - port.boundary[0].x) * t,
            z: port.outside.z + (port.boundary[1].z - port.boundary[0].z) * t,
        }));
        const eligible = areas.filter(a => a.kind === 'public' && Math.abs((levels.find(l => l.id === a.level)!.y + (a.elevationOffset ?? 0)) - port.elevation) < .01);
        const faces = samples.map(p => eligible.find(a => pointInPolygon(p, a.outline) && !a.holes?.some(h => pointInPolygon(p, h))));
        if (faces.some(a => !a)) {
            throw new Error(`Public interface has no same-height landing: ${port.id}`);
        }
        const surfaceIds = [...new Set(faces.map(a => a!.id))];
        return {
            interfaceId: port.id,
            station: port.station,
            surfaceId: faces[2]!.id,
            surfaceIds,
            elevation: port.elevation,
            point: { ...port.outside }
        };
    });
}

/** Group the public blocks touching each station's declared interfaces for display focus. */
export function boundPublicBlocksByStation(areas: FloorArea[], bindings: PublicInterfaceBinding[]) {
    const blockBySurface = new Map(areas.map(area => [area.id, area.blockId]));
    const blocksByStation = new Map<StationId, Set<string>>();
    for (const { station, surfaceIds } of bindings) {
        const blocks = blocksByStation.get(station) ?? new Set<string>();
        for (const id of surfaceIds) {
            const block = blockBySurface.get(id);
            if (block) {
                blocks.add(block);
            }
        }
        blocksByStation.set(station, blocks);
    }
    return blocksByStation;
}
