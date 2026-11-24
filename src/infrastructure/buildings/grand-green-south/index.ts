import source from '../../../../data/geography/buildings/umekita-south.json' with { type: 'json' };
import { messageText } from '../../i18n/index.ts';
import { volume, type BuildingVolume, type GeographicBuilding } from '../building-data.ts';

const operator = 'https://umekita.com/project/';

/** Use the projected LOD2 roof for the tier footprint; fit the extruded facade below it. */
function towerTier(name: string, base: number, tier: typeof source.towers.park.body, gmlId: string): BuildingVolume {
    return {
        name,
        outline: tier.rings[0]!.map(([x, z]) => ({ x: x!, z: z! })),
        // Gaps between roof tiers are not full-height voids inside the tower.
        holes: [],
        base,
        top: tier.top,
        source: source.source,
        references: [operator],
        certainty: 'plateau-lod2',
        note: source.mesh + ' / ' + gmlId + '; roof elevation and ring retained, lower facade extent fitted.',
        surface: 'tower',
        facade: 'grid'
    };
}

/** Keep the South Building (南館) towers distinct even where the source groups two together. */
function tower(
    kind: 'park' | 'gate' | 'south', name: string, way: string, podiumTop: number
): GeographicBuilding {
    const { gmlId, body, crown } = source.towers[kind];
    const podium: BuildingVolume = {
        ...volume(way, name + ' podium', 0, podiumTop),
        references: [operator, 'https://umekita.com/floor/south/'],
        surface: 'podium',
        facade: 'bands'
    };
    return {
        id: 'grand-green-south-' + kind,
        name,
        volumes: [
            podium,
            towerTier(name, podium.top, body, gmlId),
            ...(kind === 'park' ? [towerTier(name + ' wing', podium.top, source.towers.park.wing, gmlId)] : []),
            ...(crown ? [towerTier(name + ' roof', body.top, crown, gmlId)] : [])
        ]
    };
}

export const grandGreenSouthBuildings = [
    tower('park', messageText('buildings.grandGreenSouth.parkTower'), '1147394026', 21),
    tower('gate', messageText('buildings.grandGreenSouth.gateTower'), '1347368433', 35),
    tower('south', messageText('buildings.grandGreenSouth.southTower'), '1147394027', 24)
];
