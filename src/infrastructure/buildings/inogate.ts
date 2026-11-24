import { messageText } from '../i18n/index.ts';
import { volume, type GeographicBuilding } from './building-data.ts';

const plateau = 'https://www.geospatial.jp/ckan/dataset/plateau-27100-osaka-shi-2025';
const operator = 'https://osakastationcity.com/newbuilding_office/facilities.html';
const name = messageText('buildings.inogate.name');
const parkingName = messageText('buildings.osakaStationCityParking.name');

/** Inogate Osaka (イノゲート大阪) podium and a simplified envelope of its PLATEAU office roof. */
export const inogateBuilding: GeographicBuilding = {
    id: 'inogate',
    name,
    volumes: [{
        ...volume('1147394005', name, 0, 37.23),
        references: [operator, plateau],
        note: 'OSM ground outline with podium height from the 37.23 m roof surface of PLATEAU bldg_4fbf020a-6f1c-4298-9136-d881ebd394f0.',
        facade: 'bands',
        surface: 'podium'
    }, {
        name: name + ' tower',
        outline: [
            { x: 162.56, z: 713.59 }, { x: 231.31, z: 660.3 }, { x: 250.4, z: 648.53 },
            { x: 263.38, z: 669.8 }, { x: 253.11, z: 681.74 }, { x: 199.66, z: 714.67 },
            { x: 197.99, z: 710.7 }, { x: 170.96, z: 727.35 }
        ],
        holes: [],
        base: 37.23,
        top: 121.05,
        source: plateau,
        references: [operator],
        certainty: 'plateau-lod2',
        note: 'Simplified roof envelope of PLATEAU bldg_4fbf020a-6f1c-4298-9136-d881ebd394f0, mesh 52350349. Lower wall extent is fitted.',
        facade: 'grid',
        surface: 'tower'
    }]
};

/** Separate Osaka Station City garage (大阪ステーションシティ駐車場) beside the west landing. */
export const osakaStationCityParking: GeographicBuilding = {
    id: 'osaka-station-city-parking',
    name: parkingName,
    volumes: [{
        ...volume('179071473', parkingName, 0, 45.54),
        references: [plateau, 'https://osakastationcity.com/map/car/'],
        note: 'OSM garage outline with the main roof height of PLATEAU bldg_f263341d-9d79-45c5-bae4-0d55869f7560; roof recesses and plant enclosures are simplified.',
        facade: 'bands',
        surface: 'podium'
    }]
};
