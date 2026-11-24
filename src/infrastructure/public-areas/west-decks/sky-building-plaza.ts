import type { Evidence, Facility, FloorArea } from '../../../domain/map/model.ts';
import { messageText } from '../../i18n/index.ts';

const plazaEvidence: Evidence = {
    source: 'district',
    pages: [],
    urls: [
        'https://www.skybldg.co.jp/convention/room/wonder/',
        'https://www.skybldg.co.jp/convention/asset/pdf/download/cmn_map.pdf?u=250331',
        'https://www.skybldg.co.jp/en/'
    ],
    detail: 'Wonder Square (ワンダースクエア) is the public space between the towers of Umeda Sky Building (梅田スカイビル). ' +
        'The pavement and ground-side visitor approach to Tower East (タワーイースト) are fitted within the LOD2 shell.'
};

/** Leave the ground courtyard below the sky bridges and keep its south approach open. */
export const skyBuildingPlaza: FloorArea = {
    id: 'umeda-sky-wonder-square',
    name: messageText('buildings.umedaSkyBuilding.wonderSquare'),
    level: 'district-ground',
    kind: 'public',
    outline: [
        { x: -95, z: 283 }, { x: -65, z: 285 }, { x: -61, z: 300 }, { x: -62, z: 315 },
        { x: -67, z: 331 }, { x: -91, z: 329 }, { x: -93, z: 319 }, { x: -97, z: 307 }
    ],
    elevationOffset: -1.5,
    height: 1.58,
    label: true,
    labelAnchor: { x: -77, z: 306 },
    evidence: plazaEvidence
};

/** Mark the court-side approach to the documented visitor entrance without assigning a station route. */
export const skyBuildingEntrance: Facility = {
    id: 'umeda-sky-tower-east-entrance',
    name: messageText('buildings.umedaSkyBuilding.eastEntrance'),
    kind: 'entrance',
    level: 'district-ground',
    x: -64,
    z: 314,
    note: 'Schematic ground approach. The usual observatory entrance is on Tower East 3F.',
    evidence: plazaEvidence
};
