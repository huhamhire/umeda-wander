import type { Facility, Level, StationId } from '../../domain/map/model.ts';
import type { WalkingPlace } from '../navigation/walking-route.ts';

export type FacilityOption = Pick<Facility, 'id' | 'name' | 'level' | 'kind'>;

/** Data needed to explore floors and filter facilities before the 3D scene loads. */
export interface NavigationData {
    levels: Level[];
    stations: { id: StationId; name: string }[];
    facilities: FacilityOption[];
    walkingPlaces: WalkingPlace[];
}
