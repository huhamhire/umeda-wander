import { stationPublicInterfaces } from '../../src/application/stations/station-public-interfaces.ts';
import { platformOutline, platformPoint } from '../../src/domain/map/geometry.ts';
import type { StationId } from '../../src/domain/map/model.ts';
import { createGeographicStations } from '../../src/infrastructure/district/geographic-stations.ts';

const references: Record<StationId, string[]> = {
    'jr-osaka': ['references/stations/jr-osaka/station-guide.pdf', 'references/district/osm/umeda-2026-11-16.xml'],
    'hankyu-umeda': ['references/stations/hankyu-umeda/station-guide.svg', 'references/district/osm/umeda-2026-11-16.xml'],
    'metro-umeda': [
        'references/stations/metro-umeda/station-guide.pdf',
        'references/district/underground-walkway-map.pdf'
    ],
    'hanshin-umeda': [
        'references/stations/hanshin-umeda/station-guide.pdf',
        'references/district/underground-walkway-map.pdf'
    ],
    'higashi-umeda': [
        'references/stations/higashi-umeda/station-guide.pdf',
        'references/district/underground-walkway-map.pdf'
    ],
    'nishi-umeda': [
        'references/stations/nishi-umeda/station-guide.pdf',
        'references/district/underground-walkway-map.pdf'
    ],
    'kitashinchi': [
        'references/stations/kitashinchi/station-guide.pdf',
        'references/district/underground-walkway-map.pdf'
    ],
};

/** Rebuildable seven-station record; dimensions describe our fit, not surveys. */
export function createRuntimeCalibrations() {
    return createGeographicStations().map(station => ({
        station: station.id,
        name: station.name,
        units: 'metres',
        axes: { x: 'east', z: 'south' },
        status: 'schematic-calibrated',
        referenceFiles: references[station.id],
        residualMetres: null,
        residualNote: 'No independent surveyed control points; a numeric fitting accuracy cannot be asserted.',
        sources: [...new Set([...station.facilities, ...station.layout.areas, ...station.layout.platforms].flatMap(v => v.evidence.urls ?? []))],
        platforms: station.layout.platforms.map(p => ({
            id: p.id,
            length: p.length,
            width: p.width,
            negativeEnd: platformPoint(p, -p.length / 2, 0),
            positiveEnd: platformPoint(p, p.length / 2, 0),
            outline: platformOutline(p),
            planBow: p.planBow ?? null,
            source: p.evidence.source ?? 'jr'
        })),
        levels: station.levels.map(l => ({ id: l.id, y: l.y, stackIndex: l.stackIndex })),
        interfaces: stationPublicInterfaces(station),
        notes: [
            'Internal topology follows operator diagrams; plan extents, device spacing and vertical heights remain estimates.',
            'External B1 and 2F regional contour assembly belongs to phases three and four; gate contact does not create route edges.'
        ],
    }));
}
