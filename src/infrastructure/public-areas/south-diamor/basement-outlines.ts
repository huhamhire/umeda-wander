import source from '../../../../data/geography/underground/basement-outlines.json' with { type: 'json' };
import type { BasementOccupancy } from '../../../domain/map/public-area.ts';
import { districtUndergroundEvidence } from '../underground-source.ts';

/** B1 block boundaries use the excavation's projection, independent of ground massing. */
export const referenceBasements: BasementOccupancy[] = source.buildings.flatMap(building => building.regions.map((region, index) => ({
    id: index ? building.id + '-' + index : building.id,
    name: building.name,
    region,
    evidence: {
        ...districtUndergroundEvidence,
        detail: districtUndergroundEvidence.detail
            + ` B1 occupancy from reviewed drawing ${building.drawingIndex} (${building.boundaryKind});`
            + ' shares the public-space road-controlled projection. Ground OSM footprint is unchanged.'
            + ' This is a named block fill, not a verified basement extent, doorway or walking route.',
    },
})));
