import type { FloorArea } from '../domain/map/model.ts';

const publicConnectionAreas = new Set([
    'central-public',
    'midosuji-public',
    'bridge-public',
    'south-bridge-4f-link',
    'hankyu-umeda-ground',
]);

/** Use stable area IDs rather than translated names to hide redundant connection labels. */
export function showAreaLabel(area: FloorArea, floorElevation: number): boolean {
    return Boolean(area.label) && !(area.kind === 'public' &&
        (floorElevation < 0 || publicConnectionAreas.has(area.id)));
}
