import type { FloorArea } from '../../domain/map/model.ts';
import type { BasementOccupancy } from '../../domain/map/public-area.ts';
import { buildBuildingOccupancies } from './building-occupancy.ts';

/** Basement-specific adapter; geometric clipping and floor labels are shared. */
export function buildBasementOccupancies(definitions: BasementOccupancy[], publicAreas: FloorArea[], stationInteriors: FloorArea[]) {
    return buildBuildingOccupancies(
        definitions,
        publicAreas,
        stationInteriors,
        { level: 'district-underground', prefix: 'basement' }
    );
}
