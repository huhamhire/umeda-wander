import type { NavigationData } from '../src/application/exploration/navigation-data.ts';
import { facilities, layout, levels, nodes, stations } from '../src/infrastructure/district/geographic-map.ts';
import { walkingPlaces } from '../src/infrastructure/district/walking-places.ts';
import { walkingApproaches } from '../src/application/navigation/walking-approaches.ts';
import { planFloorOpenings } from '../src/application/connections/connection-openings.ts';
import { planAtriumOpenings } from '../src/application/connections/atrium-openings.ts';

const places = walkingPlaces();
const openings = [
    ...planFloorOpenings(layout.connections, levels, layout.platforms),
    ...planAtriumOpenings(layout.atria ?? [])
];

// Each build subprocess resolves station names in its own locale before creating the directory.
const navigation: NavigationData = {
    levels,
    stations: stations.map(({ id, name }) => ({ id, name })),
    facilities: facilities.map(({ id, name, mapLabel, level, kind }) => ({ id, name, mapLabel, level, kind })),
    walkingPlaces: places,
    walkingApproaches: walkingApproaches(facilities, places, nodes, layout.areas, layout.platforms, openings)
};
process.stdout.write(JSON.stringify(navigation));
