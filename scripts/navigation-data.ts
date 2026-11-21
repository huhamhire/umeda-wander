import type { NavigationData } from '../src/application/exploration/navigation-data.ts';
import { facilities, levels, stations } from '../src/infrastructure/district/geographic-map.ts';
import { createWalkingNetwork } from '../src/infrastructure/district/walking-network.ts';
import { isWalkingDestination } from '../src/application/navigation/walking-route.ts';

const { places, approaches } = createWalkingNetwork();
const destinations = new Set(facilities.filter(facility => isWalkingDestination(facility.kind)).map(facility => facility.id));

// Each build subprocess resolves station names in its own locale before creating the directory.
const navigation: NavigationData = {
    levels,
    stations: stations.map(({ id, name }) => ({ id, name })),
    facilities: facilities.map(({ id, name, mapLabel, level, kind }) => ({ id, name, mapLabel, level, kind })),
    walkingPlaces: places.filter(place => isWalkingDestination(place.kind)),
    walkingApproaches: approaches.filter(([id]) => destinations.has(id))
};
process.stdout.write(JSON.stringify(navigation));
