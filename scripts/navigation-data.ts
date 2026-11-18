import type { NavigationData } from '../src/application/exploration/navigation-data.ts';
import { facilities, levels, stations } from '../src/infrastructure/district/geographic-map.ts';

// Each build subprocess resolves station names in its own locale before creating the directory.
const navigation: NavigationData = {
    levels,
    stations: stations.map(({ id, name }) => ({ id, name })),
    facilities: facilities.map(({ id, name, level, kind }) => ({ id, name, level, kind }))
};
process.stdout.write(JSON.stringify(navigation));
