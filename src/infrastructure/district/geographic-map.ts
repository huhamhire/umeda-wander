import { messageText, resolveMessage } from '../i18n/index.ts';
import { southDeckCanopies } from '../public-areas/south-decks/canopies.ts';
import { northDeckCanopies } from '../public-areas/north-decks/canopies.ts';
import { westDeckCanopies } from '../public-areas/west-decks/canopies.ts';
import { assembleSharedUnderground, sharedUndergroundLevel } from '../../application/public-areas/shared-underground.ts';
import type { MultiPolygon } from 'polygon-clipping';
import type { BuildingOpening } from '../../domain/map/model.ts';
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
import { createSonechikaAccess } from '../public-areas/south-diamor/sonechika-access.ts';
import { createDiamorCentralAccess } from '../public-areas/south-diamor/diamor-central-access.ts';
import { createDiamorNorthAccess } from '../public-areas/south-diamor/diamor-north-access.ts';
import { createDiamorSouthAccess } from '../public-areas/south-diamor/diamor-south-access.ts';
import { createDiamorEastAccess } from '../public-areas/south-diamor/diamor-east-access.ts';
import { calibrateGardenAvenueOutline, createGardenAvenueAccess } from '../public-areas/south-diamor/garden-avenue-access.ts';
import { createGardenAvenueBuildingAccess } from '../public-areas/south-diamor/garden-avenue-building-access.ts';
import { createDoticaAccess } from '../public-areas/south-diamor/dotica-access.ts';
import { createWhityStreetExits } from '../public-areas/whity/street-exits.ts';
import { createIzumiPlazaAccess } from '../public-areas/whity/izumi-plaza-access.ts';
import { createWhityNorthMallAccess } from '../public-areas/whity/north-mall-access.ts';
import { createWhityNorthMall2Access } from '../public-areas/whity/north-mall-2-access.ts';
import { createWhityCentralAccess } from '../public-areas/whity/central-access.ts';
import { createWhityPuchishanAccess } from '../public-areas/whity/puchishan-access.ts';
import { createWhityEastMallAccess } from '../public-areas/whity/east-mall-access.ts';
import { southernWalkingRoutes } from '../public-areas/south-diamor/walking-routes.ts';
import { northernWalkingRoutes } from '../public-areas/north-decks/walking-routes.ts';
import { createGrandFrontPlazaAccess } from '../public-areas/north-atrium/grand-front-plaza-access.ts';
import { elevatedLevels } from '../public-areas/elevated-source.ts';
import { assemblePublicDecks } from '../../application/public-areas/public-deck-assembly.ts';
import { deckBuildingOpenings, equipmentBuildingOpenings } from '../../application/public-areas/deck-interface-bindings.ts';
import { deckExtensionLabels } from '../../application/public-areas/deck-extension-labels.ts';
import { stationBuildingOpenings } from '../../application/stations/station-building-openings.ts';
import { building as greenPlace } from '../buildings/umekita-green-place/index.ts';
import {
    hankyuConcourses, hankyuConcourseAreas, hankyuConcourseBasementAreas, hankyuConcourseConnections,
    hankyuConcourseOpenings, hankyuConcourseAtria
} from '../buildings/hankyu-dept/concourse.ts';

const stationMaps = createGeographicStations();
export const publicInterfaces = stationMaps.flatMap(stationPublicInterfaces);
export const publicFrontages = stationFrontages(stationMaps);
const northAccess = createNorthPublicAccess(publicInterfaces);
const metroAccess = createMetroStreetExits();
export const deckAccess = createDeckAccess(northAccess.northLift);
export const jpAccess = createJpBasementAccess(
    deckAccess.connections.find(c => c.id === 'public-jp-deck-lift')!,
    deckAccess.connections.find(c => c.id === 'public-jp-deck-stairs')!
);
export const grandFrontPlazaAccess = createGrandFrontPlazaAccess();
const sonechikaAccess = createSonechikaAccess();
const diamorNorthAccess = createDiamorNorthAccess();
const diamorCentralAccess = createDiamorCentralAccess();
const diamorSouthAccess = createDiamorSouthAccess();
const diamorEastAccess = createDiamorEastAccess();
const gardenAvenueAccess = createGardenAvenueAccess();
const gardenAvenueBuildings = createGardenAvenueBuildingAccess();
const doticaAccess = createDoticaAccess();
const izumiAccess = createIzumiPlazaAccess();
const whityNorthAccess = createWhityNorthMallAccess();
const whityNorth2Access = createWhityNorthMall2Access();
const puchishanAccess = createWhityPuchishanAccess();
const eastMallAccess = createWhityEastMallAccess();
const whityAccess = [
    createWhityStreetExits(), izumiAccess, whityNorthAccess, whityNorth2Access, createWhityCentralAccess(), puchishanAccess
];
const streetConnections = [
    ...northAccess.connections,
    ...jpAccess.connections,
    ...grandFrontPlazaAccess.connections,
    ...metroAccess.connections,
    ...sonechikaAccess.connections,
    ...diamorNorthAccess.connections,
    ...diamorCentralAccess.connections,
    ...diamorSouthAccess.connections,
    ...diamorEastAccess.connections,
    ...gardenAvenueAccess.connections,
    ...gardenAvenueBuildings.connections,
    ...doticaAccess.connections,
    ...hankyuConcourseConnections,
    ...whityAccess.flatMap(access => access.connections)
];
export const publicAccess = {
    connections: [...streetConnections, metroAccess.lift],
    areas: [
        ...northAccess.areas, ...jpAccess.areas, ...grandFrontPlazaAccess.areas, ...metroAccess.areas,
        ...sonechikaAccess.areas, ...diamorNorthAccess.areas, ...diamorCentralAccess.areas, ...diamorSouthAccess.areas,
        ...diamorEastAccess.areas, ...gardenAvenueAccess.areas, ...gardenAvenueBuildings.areas, ...doticaAccess.areas,
        ...whityAccess.flatMap(access => access.areas), ...eastMallAccess.areas, ...hankyuConcourseBasementAreas
    ],
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
    calibrateGardenAvenueOutline(plan.underground as MultiPolygon),
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
const assemblyLevels = [...shared.stations.flatMap(s => s.levels), ...elevatedLevels, sharedUndergroundLevel, publicGroundLevel];
// Stair landings join their block before union; lift doors meet the existing deck.
for (const b of elevated.blocks) {
    b.regions.push(...deckAccess.areas.filter(a => a.level === b.level && a.blockId === b.id));
}

export const elevatedAreas = assemblePublicDecks(elevated.blocks, shared.stations, assemblyLevels);
// The lift stands below the raised central section; only the two sloped flights cut the north wing.
const greenPlaceGroundAccess = northAccess.connections.filter(c =>
    c.id === 'public-umekita-ground-stairs' || c.id === 'public-umekita-ground-escalator'
);
const greenPlaceGroundLandings = northAccess.areas.filter(a => a.level === 'district-ground' &&
    greenPlaceGroundAccess.some(c => a.id === c.to.id + ':landing'));
export const exteriorOpenings: BuildingOpening[] = [
    ...deckBuildingOpenings(elevated.portals, assemblyLevels),
    ...elevated.buildingOpenings,
    ...jpAccess.buildingOpenings,
    ...equipmentBuildingOpenings(deckAccess.connections, deckAccess.buildingEquipment, assemblyLevels),
    ...equipmentBuildingOpenings(whityNorthAccess.connections, whityNorthAccess.buildingEquipment, assemblyLevels),
    ...equipmentBuildingOpenings(whityNorth2Access.connections, whityNorth2Access.buildingEquipment, assemblyLevels),
    ...equipmentBuildingOpenings(puchishanAccess.connections, puchishanAccess.buildingEquipment, assemblyLevels),
    ...equipmentBuildingOpenings(
        greenPlaceGroundAccess,
        greenPlaceGroundAccess.map(c => ({ connectionId: c.id, buildingId: greenPlace.id })),
        assemblyLevels
    ),
    ...greenPlaceGroundLandings.map(a => ({
        buildingId: greenPlace.id,
        outline: a.outline,
        base: -.1,
        top: 4.5,
        evidence: a.evidence
    })),
    ...stationBuildingOpenings(shared.stations),
    ...hankyuConcourseOpenings,
];
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
            ...deckAccess.areas.filter(a => a.level === 'district-ground'),
            ...hankyuConcourseAreas,
        ],
        platforms: [],
        connections: externalConnections,
        exteriorOpenings,
        canopies: [
            ...northDeckCanopies(), ...southDeckCanopies(),
            ...westDeckCanopies(elevated.blocks.find(block => block.id === 'west-decks')!),
            ...metroAccess.canopies, ...sonechikaAccess.canopies,
            ...diamorNorthAccess.canopies,
            ...diamorCentralAccess.canopies,
            ...diamorSouthAccess.canopies,
            ...diamorEastAccess.canopies,
            ...gardenAvenueAccess.canopies,
            ...doticaAccess.canopies,
            ...whityAccess.flatMap(access => access.canopies)
        ],
        landmarks: izumiAccess.landmarks,
        concourses: hankyuConcourses,
        atria: [...hankyuConcourseAtria, ...gardenAvenueBuildings.atria],
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
// A landing shared by successive public stair flights is one graph node.
const externalNodes = new Map(externalConnections.flatMap(c => [c.from, c.to]).map(node => [node.id, node]));
export const nodes = [...composed.nodes, ...externalNodes.values(), ...publicWalkingRoutes.nodes];
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
export const facilities = completeFacilityDirectory(
    [
        ...composed.sourceFacilities, ...sonechikaAccess.facilities, ...diamorCentralAccess.facilities,
        ...diamorEastAccess.facilities, ...gardenAvenueAccess.facilities, ...gardenAvenueBuildings.facilities, ...eastMallAccess.facilities
    ],
    layout.connections,
    layout.platforms,
    levels
);
export const geographicPlan = plan;
