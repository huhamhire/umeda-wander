import { messageText } from '../i18n/index.ts';
import { volume, type BuildingVolume, type GeographicBuilding } from './building-data.ts';

const name = messageText('buildings.grandGreenNorth.name');
const podium = volume('1147393980', name, 0, 19);
const source = 'https://www.geospatial.jp/ckan/dataset/plateau-27100-osaka-shi-2025';
const tower: BuildingVolume = {
    name: 'North Tower',
    outline: [
        { x: 221.2, z: 246.08 }, { x: 206.43, z: 211.92 },
        { x: 172.57, z: 226.7 }, { x: 187.34, z: 260.86 }
    ],
    holes: [],
    base: podium.top,
    top: 119.71,
    surface: 'tower',
    facade: 'grid',
    source,
    certainty: 'plateau-lod2',
    note: 'Grand Green Osaka North Tower (グラングリーン大阪 ノースタワー), projected roof of bldg_e5c9ed82-741a-4797-b625-fdb9e90a117a; facade is a schematic extrusion.'
};

/** Ground host and upper envelope for the documented North Connection Bridge destination. */
export const grandGreenNorth: GeographicBuilding = {
    id: 'grand-green-north',
    name,
    volumes: [podium, tower, {
        ...tower,
        name: 'North Tower roof',
        outline: [
            { x: 214.49, z: 243.46 }, { x: 206.43, z: 224.83 },
            { x: 187.9, z: 232.92 }, { x: 195.95, z: 251.55 }
        ],
        base: tower.top,
        top: 121.52,
        facade: 'plain'
    }]
};
