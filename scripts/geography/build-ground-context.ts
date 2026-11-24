import { mkdirSync, writeFileSync } from 'node:fs';
import clipping from 'polygon-clipping';
import plan from '../../data/geography/runtime-plan.json' with { type: 'json' };
import policy from '../../data/geography/context-policy.json' with { type: 'json' };
import { createGeographicStations } from '../../src/infrastructure/district/geographic-stations.ts';
import { createElevatedBlocks } from '../../src/infrastructure/public-areas/elevated-blocks.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { buildingScopeOutline } from '../../src/infrastructure/buildings/building-data.ts';
import { basementOccupancies } from '../../src/infrastructure/public-areas/basement-buildings.ts';
import { inogateHosts } from '../../src/infrastructure/public-areas/west-decks/inogate.ts';
import { umekitaGrove } from '../../src/infrastructure/public-areas/west-decks/umekita-grove.ts';
import { parkGroundAccess } from '../../src/infrastructure/public-areas/west-decks/park-access.ts';
import { sunkenGarden } from '../../src/infrastructure/public-areas/west-decks/sunken-garden.ts';
import { umekitaSouthPark } from '../../src/infrastructure/public-areas/west-decks/south-park.ts';
import { skyBuildingPlaza } from '../../src/infrastructure/public-areas/west-decks/sky-building-plaza.ts';
import { hankyuConcourseAreas } from '../../src/infrastructure/buildings/hankyu-dept/concourse.ts';
import { hankyuSunPlazaAreas } from '../../src/infrastructure/buildings/hankyu-dept/upper-concourse.ts';
import { hankyuBridgeGroundLanding } from '../../src/infrastructure/public-areas/south-decks/north-arm-stairs.ts';
import { calibrateGardenAvenueOutline, createGardenAvenueAccess } from '../../src/infrastructure/public-areas/south-diamor/garden-avenue-access.ts';
import { calibrateMetroSouthPublicOutline, metroSouthPublicApproaches } from '../../src/infrastructure/public-areas/metro-interchange/south-public.ts';
import { createGardenAvenueBuildingAccess } from '../../src/infrastructure/public-areas/south-diamor/garden-avenue-building-access.ts';
import { platformOutline, passageOutline } from '../../src/domain/map/geometry.ts';
import type { Point2 } from '../../src/domain/map/model.ts';
import { contextEnvelope, ring, unionContextPieces } from './context-scope.ts';
import { retainRoadSpans } from './road-continuity.ts';

const stations = createGeographicStations();
const decks = createElevatedBlocks(stations);
const protectedOutlines = [
    ...metroSouthPublicApproaches().map(area => area.outline),
    ...stations.flatMap(s => [...s.layout.areas.map(a => a.outline), ...s.layout.platforms.map(platformOutline)]),
    // Ground scope follows the declared source host, not a rounded facade decoration.
    ...geographicBuildings.map(buildingScopeOutline),
    ...basementOccupancies.map(b => b.region.outline),
    ...inogateHosts.map(host => host.region.outline),
    umekitaGrove.outline,
    umekitaSouthPark.outline,
    skyBuildingPlaza.outline,
    ...parkGroundAccess.areas.map(area => area.outline),
    ...sunkenGarden.areas.map(area => area.outline),
    ...hankyuConcourseAreas.map(area => area.outline),
    ...hankyuSunPlazaAreas.map(area => area.outline),
    hankyuBridgeGroundLanding.outline,
    ...createGardenAvenueAccess().areas.map(area => area.outline),
    ...createGardenAvenueBuildingAccess().areas.map(area => area.outline),
    ...decks.blocks.flatMap(b => b.regions.map(r => r.outline)),
    ...decks.blocks.flatMap(b => b.paths.flatMap(p => p.points.slice(1).map((to, i) => passageOutline(p.points[i]!, to, p.width)))),
];
const underground = calibrateMetroSouthPublicOutline(calibrateGardenAvenueOutline(plan.underground as clipping.MultiPolygon));
const coreScope = contextEnvelope(
    [
        ...underground.map(p => p[0]!.map(([x, z]) => ({ x, z }))),
        ...protectedOutlines,
    ],
    policy.marginMetres,
    policy.outlineToleranceMetres
);
const relatedBuildingIds = new Set([
    ...geographicBuildings.flatMap(b => b.volumes.map(v => new URL(v.source).pathname.slice(1))),
    ...basementOccupancies.flatMap(b => b.evidence.urls ?? []).filter(url => url.includes('openstreetmap.org/')).map(url => new URL(url).pathname.slice(1)),
    ...inogateHosts.map(host => 'way/' + host.way),
    ...policy.additionalBuildingIds,
]);
/**
 * Project source longitude and latitude into the shared district metre frame, with east x and south z.
 */
const project = ([lon, lat]: number[]): Point2 => ({
    x: (lon! - 135.491) * 111320 * Math.cos(34.708 * Math.PI / 180),
    z: (34.708 - lat!) * 111320,
});
interface SourceFeature {
    id: string;
    properties: Record<string, string>;
    geometry: {
        type: string;
        coordinates: unknown;
    };
}
const features = plan.ground as unknown as SourceFeature[];
// The western 2014 survey predates the current underground approach.
const excludedGroundWays = new Set(policy.excludedGroundWayIds);
const roads = features.filter(f => f.geometry.type === 'LineString' && !excludedGroundWays.has(f.id)).map(feature => ({
    id: feature.id,
    name: feature.properties.ref || feature.properties.name || feature.properties['name:ja'],
    points: (feature.geometry.coordinates as number[][]).map(project),
    width: plan.widths.find(w => String(w.id) === feature.id.split('/')[1])?.metres ?? 4,
}));
const continuity = retainRoadSpans(roads, coreScope);
const roadById = new Map(continuity.retained.map(road => [road.id, road]));
const scope = unionContextPieces([coreScope, ...continuity.retained.map(road => road.geometry)]);
const surfaces: {
    id: string;
    kind: 'road' | 'plaza' | 'building';
    geometry: clipping.MultiPolygon;
}[] = [];
const removed: string[] = [];
const retained: string[] = [];
for (const feature of features) {
    const building = !!feature.properties.building;
    if (building && !relatedBuildingIds.has(feature.id)) {
        removed.push(feature.id);
        continue;
    }
    const coordinates = feature.geometry.coordinates;
    let geometry: clipping.MultiPolygon;
    if (feature.geometry.type === 'LineString') {
        const road = roadById.get(feature.id);
        if (!road) {
            removed.push(feature.id);
            continue;
        }
        geometry = road.geometry;
    }
    else {
        const polygons = feature.geometry.type === 'MultiPolygon' ? coordinates as number[][][][] : [coordinates as number[][][]];
        geometry = polygons.map(p => p.map(r => ring(r.map(project))));
    }
    const clipped = feature.geometry.type === 'LineString' ? geometry : clipping.intersection(geometry, scope);
    if (!clipped.length) {
        removed.push(feature.id);
        continue;
    }
    retained.push(feature.id);
    surfaces.push({
        id: feature.id,
        kind: building ? 'building' : feature.geometry.type === 'LineString' ? 'road' : 'plaza',
        geometry: clipped
    });
}
const report = {
    originalFeatures: plan.ground.length,
    retainedFeatures: retained.length,
    retainedBuildings: surfaces.filter(s => s.kind === 'building').length,
    removedFeatures: removed.length,
    retainedIds: retained,
    removedIds: removed,
    relatedBuildingIds: [...relatedBuildingIds],
    continuityRepairIds: continuity.repairedIds,
    roadSpans: continuity.retained.map(({ id, name, points, width }) => ({
        id,
        name,
        points,
        width
    })),
    note: 'Display-only selection and clipping. Source OSM, widths, B1 excavation and station/deck geometry are unchanged. A related building is not a verified basement door.',
};
const displaySurfaces = surfaces.map(surface => ({
    ...surface,
    geometry: surface.geometry.map(p => p.map(r => r.map(([x, z]) => [
        Math.round(x * 1000) / 1000,
        Math.round(z * 1000) / 1000,
    ]))),
}));
writeFileSync(
    'data/geography/display-context.json',
    JSON.stringify({ policy, scope, surfaces: displaySurfaces }) + '\n'
);
mkdirSync('build/geography', { recursive: true });
writeFileSync('build/geography/context-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log({
    original: report.originalFeatures,
    retained: report.retainedFeatures,
    buildings: report.retainedBuildings,
    removed: report.removedFeatures
});
