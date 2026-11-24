import { passageOutline } from '../../../domain/map/geometry.ts';
import type { Evidence, FloorArea, Point2, RouteNode, VerticalConnection } from '../../../domain/map/model.ts';
import type { DeckPath } from '../../../domain/map/public-deck.ts';
import { messageText } from '../../i18n/index.ts';

const ground = 'district-ground';
const blockId = 'west-decks';
const sidewalkOffset = -1.4;
const stepPlazaName = messageText('publicAreas.westDecks.entities.stepPlaza.name');
const southParkName = messageText('publicAreas.westDecks.entities.southPark.name');
const southParkFoot = { x: 142.7, z: 431.9 };
const southParkBend = { x: 148.79, z: 426 };
const southParkHead = { x: 155.85, z: 428.13 };
const southParkEvidence: Evidence = {
    source: 'district',
    pages: [],
    urls: [
        'https://www.openstreetmap.org/way/1314528010',
        'https://www.openstreetmap.org/way/1347756740',
        'https://www.openstreetmap.org/way/1314528006',
        'https://www.openstreetmap.org/way/1347756741',
        'https://www.youtube.com/watch?v=4wNCIRHmkvc&t=2033s'
    ],
    detail: 'Mapped stairs beside the southern end of the road span meet the South Park (サウスパーク) footpath. ' +
        'Two display flights retain the major bend. Width and intermediate rise are illustrative.'
};

/** Join the stair head to the exact shared end of the source deck. */
export function southParkDeckLanding(join: Point2): DeckPath {
    return {
        id: 'umekita-south-park-deck-landing',
        name: southParkName,
        points: [join, southParkHead],
        width: 3,
        evidence: southParkEvidence
    };
}

/** Make a public apron continuous through the tread endpoint and adjoining OSM walk. */
function apron(node: RouteNode, next: Point2, width: number, name: string, evidence: Evidence): FloorArea {
    const run = Math.hypot(node.x - next.x, node.z - next.z);
    const back = { x: node.x + (node.x - next.x) / run * .25, z: node.z + (node.z - next.z) / run * .25 };
    return {
        id: node.id + '-apron',
        name,
        level: node.level,
        elevationOffset: node.elevationOffset,
        kind: 'public',
        outline: passageOutline(back, next, width),
        blockId,
        evidence
    };
}

/** Register the upper and lower public approaches from the north and south sidewalks. */
function stepPlazaEntrance(
    side: 'north' | 'south', sidewalk: Point2, foot: Point2, head: Point2, park: Point2, ways: number[]
): { areas: FloorArea[]; stairs: VerticalConnection } {
    const id = 'umekita-step-plaza-' + side;
    const evidence: Evidence = {
        source: 'district',
        pages: [],
        urls: [
            'https://www.ur-net.go.jp/west/press/bn5k4400000037c7-att/20260409_ur_umekita_prerelease.pdf#page=2',
            'https://umekita.com/midori/features/fon_20221121_12/',
            ...ways.map(way => 'https://www.openstreetmap.org/way/' + way)
        ],
        detail: 'Step Plaza (ステッププラザ) meets the sidewalk on Osaka Station North Route 1 (大阪駅北1号線). ' +
            'Adjacent short flights are simplified as one terraced axis. Width and rise are display fits.'
    };
    const from: RouteNode = { ...foot, id: id + '-street', level: ground, elevationOffset: sidewalkOffset };
    const to: RouteNode = { ...head, id: id + '-park', level: ground, elevationOffset: .6 };
    return {
        areas: [apron(from, sidewalk, 3.2, stepPlazaName, evidence), apron(to, park, 3.2, stepPlazaName, evidence)],
        stairs: { id, kind: 'stairs', from, to, width: 3, stairLandingLength: 2.2, blockId, placement: 'exterior', evidence }
    };
}

const northEntrance = stepPlazaEntrance(
    'north', { x: 190.29, z: 370.28 }, { x: 191, z: 361.34 }, { x: 192.09, z: 347.69 },
    { x: 194.13, z: 313.03 }, [1313936497, 1347576765, 1347576762, 1347576761, 1347576760, 1347576758, 1347368412, 1347576756]
);
const southEntrance = stepPlazaEntrance(
    'south', { x: 103.23, z: 420.68 }, { x: 104.58, z: 425.78 }, { x: 106.93, z: 434.16 },
    { x: 109.08, z: 441.6 }, [1313936499, 1347756724, 1347756723, 1347756721, 1347756719, 1347756717, 1347756715]
);

const foot: RouteNode = { ...southParkFoot, id: 'umekita-south-park-stair-foot', level: ground, elevationOffset: sidewalkOffset };
const bend: RouteNode = { ...southParkBend, id: 'umekita-south-park-stair-bend', level: ground, elevationOffset: 3 };
const head: RouteNode = { ...southParkHead, id: 'umekita-south-park-stair-head', level: 'district-north-deck' };
const parkJunction: RouteNode = { id: 'umekita-south-park-path-junction', level: ground, elevationOffset: sidewalkOffset, x: 141.36, z: 433.19 };

/** Keep the street entrances and the two flights at the South Park bridge on the park side. */
export const parkGroundAccess: { areas: FloorArea[]; connections: VerticalConnection[] } = {
    areas: [
        ...northEntrance.areas,
        ...southEntrance.areas,
        apron(foot, parkJunction, 3.4, southParkName, southParkEvidence),
        apron(parkJunction, { x: 142.42, z: 435.32 }, 3.4, southParkName, southParkEvidence),
        {
            id: bend.id + '-apron',
            name: southParkName,
            level: bend.level,
            elevationOffset: bend.elevationOffset,
            kind: 'public',
            blockId,
            evidence: southParkEvidence,
            outline: Array.from({ length: 12 }, (_, index) => ({
                x: bend.x + 1.65 * Math.cos(index * Math.PI / 6),
                z: bend.z + 1.65 * Math.sin(index * Math.PI / 6)
            }))
        }
    ],
    connections: [
        northEntrance.stairs,
        southEntrance.stairs,
        { id: 'umekita-south-park-stairs-lower', kind: 'stairs', from: foot, to: bend, width: 3, blockId, placement: 'exterior', evidence: southParkEvidence },
        { id: 'umekita-south-park-stairs-upper', kind: 'stairs', from: bend, to: head, width: 3, blockId, placement: 'exterior', evidence: southParkEvidence }
    ]
};
