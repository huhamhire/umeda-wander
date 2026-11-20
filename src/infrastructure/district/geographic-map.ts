import { messageText, resolveMessage } from '../i18n/index.ts';
import { platformRail, railApproachFootprints } from '../../domain/map/rail-geometry.ts';
import { passageOutline } from '../../domain/map/geometry.ts';
import { southDeckCanopies } from '../public-areas/south-decks/canopies.ts';
import { northDeckCanopies } from '../public-areas/north-decks/canopies.ts';
import { assembleSharedUnderground, sharedUndergroundLevel } from '../../application/public-areas/shared-underground.ts';
import type { MultiPolygon } from 'polygon-clipping';
import { composeStationMaps } from '../../application/stations/compose-station-maps.ts';
import { createGeographicStations } from './geographic-stations.ts';
import { stationFrontages } from '../public-areas/station-frontages/index.ts';
import { stationPublicInterfaces } from '../../application/stations/station-public-interfaces.ts';
import { bindPublicInterfaces } from '../../application/stations/public-interface-bindings.ts';
import { partitionPublicAreas } from '../../application/public-areas/public-area-blocks.ts';
import { undergroundBlockDefinitions, undergroundPatches } from '../public-areas/underground-blocks.ts';
import { createNorthPublicAccess, publicGroundLevel } from '../public-areas/north-atrium/access.ts';
import { createMetroStreetExits } from '../public-areas/metro-interchange/street-exits.ts';
import { buildBasementOccupancies } from '../../application/public-areas/basement-occupancy.ts';
import { basementOccupancies } from '../public-areas/basement-buildings.ts';
import { completeFacilityDirectory } from '../facility-directory.ts';
import plan from '../../../data/geography/runtime-plan.json' with { type: 'json' };
import { createElevatedBlocks } from '../public-areas/elevated-blocks.ts';
import { createDeckAccess } from '../public-areas/deck-access.ts';
import { createJpBasementAccess } from '../public-areas/south-diamor/jp-access.ts';
import { southernWalkingRoutes } from '../public-areas/south-diamor/walking-routes.ts';
import { northernWalkingRoutes } from '../public-areas/north-decks/walking-routes.ts';
import { createGrandFrontPlazaAccess } from '../public-areas/north-atrium/grand-front-plaza-access.ts';
import { elevatedLevels } from '../public-areas/elevated-source.ts';
import { assemblePublicDecks } from '../../application/public-areas/public-deck-assembly.ts';
import { deckBuildingOpenings, equipmentBuildingOpenings } from '../../application/public-areas/deck-interface-bindings.ts';
import { deckExtensionLabels } from '../../application/public-areas/deck-extension-labels.ts';
import { buildBuildingOccupancies } from '../../application/public-areas/building-occupancy.ts';
import { deckBuildingOccupancies } from '../public-areas/deck-buildings.ts';
import { stationBuildingOpenings } from '../../application/stations/station-building-openings.ts';
import { hankyuConcourses, hankyuConcourseAreas, hankyuConcourseOpenings, hankyuConcourseAtria, } from '../buildings/hankyu-dept/concourse.ts';

const stationMaps = createGeographicStations();
export const publicInterfaces = stationMaps.flatMap(stationPublicInterfaces);
export const publicFrontages = stationFrontages(stationMaps);
const northAccess = createNorthPublicAccess(publicInterfaces);
const metroAccess = createMetroStreetExits();
export const deckAccess = createDeckAccess(northAccess.northLift);
export const jpAccess = createJpBasementAccess(deckAccess.connections.find(c => c.id === 'public-jp-deck-lift')!);
export const grandFrontPlazaAccess = createGrandFrontPlazaAccess();
const streetConnections = [...northAccess.connections, ...jpAccess.connections, ...grandFrontPlazaAccess.connections, ...metroAccess.connections];
export const publicAccess = {
    connections: [...streetConnections, metroAccess.lift],
    areas: [...northAccess.areas, ...jpAccess.areas, ...grandFrontPlazaAccess.areas, ...metroAccess.areas],
};
const patchFloors = undergroundPatches.map(p => ({
    id: p.id,
    level: 'district-underground' as const,
    name: p.name,
    kind: 'public' as const,
    ...p.region,
    blockId: p.blockId,
    evidence: p.evidence,
    label: false
}));
const shared = assembleSharedUnderground(
    stationMaps,
    plan.underground as MultiPolygon,
    [
        ...publicFrontages,
        ...patchFloors,
        ...publicAccess.areas.filter(a => a.level === 'district-underground')
    ]
);
export const undergroundBlocks = partitionPublicAreas(shared.areas, undergroundBlockDefinitions);
export const undergroundPublicAreas = undergroundBlocks.flatMap(b => b.areas);
export const basements = buildBasementOccupancies(
    basementOccupancies,
    undergroundPublicAreas,
    shared.stations.flatMap(s => s.layout.areas.filter(a => a.kind !== 'public' && s.levels.find(l => l.id === a.level)?.y === -8))
);
export const elevated = createElevatedBlocks(shared.stations);
const assemblyLevels = [...shared.stations.flatMap(s => s.levels), ...elevatedLevels, publicGroundLevel];
// Stair landings join their block before union; lift doors meet the existing deck.
for (const b of elevated.blocks) {
    b.regions.push(...deckAccess.areas.filter(a => a.level === b.level && a.blockId === b.id));
}

export const elevatedAreas = assemblePublicDecks(elevated.blocks, shared.stations, assemblyLevels);
export const exteriorOpenings = [
    ...deckBuildingOpenings(elevated.portals, assemblyLevels),
    ...equipmentBuildingOpenings(deckAccess.connections, deckAccess.buildingEquipment, assemblyLevels),
    ...stationBuildingOpenings(shared.stations),
    ...hankyuConcourseOpenings,
];
export const deckBuildingAreas = deckBuildingOccupancies.flatMap(group => {
    const y = assemblyLevels.find(l => l.id === group.level)!.y;
    const stationAreas = shared.stations.flatMap(s => s.layout.areas.filter(a => Math.abs(s.levels.find(l => l.id === a.level)!.y + (a.elevationOffset ?? 0) - y) < .01));
    const atriumCuts = hankyuConcourseAtria.flatMap(a => a.openings.filter(o => o.level === group.level).map(o => ({
        id: a.id,
        name: a.name,
        kind: 'public' as const,
        ...o,
        evidence: a.evidence,
    })));
    // Context slabs must not conceal platform rails or the first metres of their approaches.
    const reservedRegions = shared.stations.flatMap(station => {
        const sameHeight = (id: string) => Math.abs(station.levels.find(l => l.id === id)!.y - y) < .01;
        return [
            ...station.layout.platforms.filter(p => sameHeight(p.level)).flatMap(p => p.tracks.map((_, i) => {
                const rail = platformRail(p, i);
                return { outline: passageOutline(rail.start, rail.end, 3.3) };
            })),
            ...station.layout.railApproaches!.filter(a => sameHeight(a.level))
                .flatMap(a => railApproachFootprints(a, 1.65).map(outline => ({ outline })))
        ];
    });
    return buildBuildingOccupancies(
        group.definitions,
        [...elevatedAreas.filter(a => a.level === group.level), ...atriumCuts],
        stationAreas,
        { level: group.level, prefix: 'deck-context', reservedRegions }
    ).areas;
});
// Preserve the existing ground facility ID shared by both segments of the Midosuji lift.
const externalConnections = [...streetConnections, ...deckAccess.connections, metroAccess.lift];
const composed = composeStationMaps(
    shared.stations,
    {
        areas: [
            ...undergroundPublicAreas,
            ...basements.areas,
            ...publicAccess.areas.filter(a => a.level !== 'district-underground'),
            ...elevatedAreas,
            ...deckBuildingAreas,
            ...deckAccess.areas.filter(a => a.level === 'district-ground'),
            ...hankyuConcourseAreas,
        ],
        platforms: [],
        connections: externalConnections,
        exteriorOpenings,
        canopies: [...northDeckCanopies(), ...southDeckCanopies(), ...metroAccess.canopies],
        concourses: hankyuConcourses,
        atria: hankyuConcourseAtria,
        passages: deckExtensionLabels(elevated.blocks, elevatedAreas),
    }
);
export const { stations } = composed;
export const southWalking = southernWalkingRoutes(composed.nodes);
export const northWalking = northernWalkingRoutes(composed.nodes);
export const publicWalkingRoutes = {
    nodes: [...southWalking.nodes, ...northWalking.nodes],
    edges: [...southWalking.edges, ...northWalking.edges]
};
export const edges = [...composed.edges, ...publicWalkingRoutes.edges];
export const nodes = [...composed.nodes, ...externalConnections.flatMap(c => [c.from, c.to]), ...publicWalkingRoutes.nodes];
export const levels = [...composed.levels, sharedUndergroundLevel, publicGroundLevel, ...elevatedLevels].map(level => ({
    ...level,
    name: resolveMessage(level.name),
    description: resolveMessage(level.description),
}));
export const publicInterfaceBindings = bindPublicInterfaces(publicInterfaces.filter(p => p.elevation === -8), composed.layout.areas, levels);
export const removedPublicAreas = shared.removed;
export const layout = {
    ...composed.layout,
    areas: composed.layout.areas.map(area => ({ ...area, name: resolveMessage(area.name) })),
    passages: composed.layout.passages?.map(passage => ({
        ...passage,
        name: resolveMessage(passage.name),
        points: passage.points.map(point => ({
            ...point,
            boundaryName: point.boundaryName ? resolveMessage(point.boundaryName) : undefined,
        })),
    })),
};
export const facilities = completeFacilityDirectory(composed.sourceFacilities, layout.connections, layout.platforms, levels);
export const geographicPlan = plan;
