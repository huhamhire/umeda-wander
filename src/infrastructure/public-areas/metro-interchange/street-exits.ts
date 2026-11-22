import type { Evidence, FloorArea, Point2, VerticalConnection, WalkwayCanopy } from '../../../domain/map/model.ts';
import { passageOutline } from '../../../domain/map/geometry.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';
import { elevatorDoorApproach } from '../../../application/connections/connection-openings.ts';

const operatorPlan = 'https://subway.osakametro.co.jp/station_guide/station/M16_%E6%A2%85%E7%94%B0_%E6%A7%8B%E5%86%85%E5%9B%B3_1.pdf';
export const m16NorthExitLanding = { x: 556, z: 472.5 };
const exitPhotos = 'https://commons.wikimedia.org/wiki/File:大阪メトロ梅田駅';
const southLiftCenter = toGeographicPlan({ lon: 135.4976487, lat: 34.7026307 }, geographicFrame);
const southLiftDeckJoin = toGeographicPlan({ lon: 135.497715, lat: 34.7026454 }, geographicFrame);
export const midosujiSouthLift = {
    center: southLiftCenter,
    deckJoin: southLiftDeckJoin,
    deckFacing: Math.atan2(southLiftDeckJoin.z - southLiftCenter.z, southLiftDeckJoin.x - southLiftCenter.x),
    evidence: {
        source: 'metro',
        pages: [1],
        urls: [
            operatorPlan,
            'https://www.openstreetmap.org/node/5340839338',
            'https://www.openstreetmap.org/way/553268918',
            'https://www.openstreetmap.org/way/879781086',
            'https://www.openstreetmap.org/way/1010195576'
        ],
        detail: 'The Osaka Metro plan identifies the public concourse–street–footbridge lift at JR Midosuji South Gate (御堂筋南口). The B1 door approach is fitted to the mapped JR public corridor; shaft and street/deck axes follow OSM.'
    } satisfies Evidence
};

/** Public B1–1F exits of Umeda (梅田駅) identified in the operator plan and the local OSM snapshot. */
export function createMetroStreetExits() {
    const connections: VerticalConnection[] = [];
    const areas: FloorArea[] = [];
    const canopies: WalkwayCanopy[] = [];
    const blockId = 'metro-interchange-b1';
    for (const exit of [
        {
            number: '3A',
            osm: '3512355893',
            engineeringRef: '3-1',
            point: { lon: 135.4969421, lat: 34.7037769 },
            lower: m16NorthExitLanding,
            lowerApron: { x: 565, z: 472.5 },
            width: 5.2,
            canopy: { clearHeight: 3.15, width: 6.4 },
            photo: '3A出入口.jpg',
            detail: 'Wide staircase and independent canopy at JR Midosuji North Gate (御堂筋北口).'
        },
        {
            number: '8',
            osm: '3448863955',
            engineeringRef: '5-38',
            point: { lon: 135.4973791, lat: 34.7026493 },
            lower: { x: 596, z: 582 },
            lowerApron: { x: 598, z: 578 },
            width: 5.8,
            canopy: { clearHeight: 3.5, width: 7.6 },
            photo: '8号出入口.jpg',
            detail: 'Wide staircase with a raised entrance apron under the JR Midosuji South Gate (御堂筋南口) roof.'
        },
        {
            number: '9',
            osm: '3448863958',
            engineeringRef: '5-42',
            point: { lon: 135.4973885, lat: 34.7029775 },
            lower: { x: 596, z: 564 },
            width: 1.85,
            photo: '9号出入口.jpg',
            detail: 'Indoor escalator bank near the central west gate (中北西改札).'
        },
        {
            number: '18',
            osm: '3394153475',
            engineeringRef: '7-30',
            point: { lon: 135.4977352, lat: 34.7021239 },
            lower: toGeographicPlan({ lon: 135.4977362, lat: 34.7020506 }, geographicFrame),
            width: 3.1,
            trace: 'https://www.openstreetmap.org/way/1338274269',
            detail: 'The two endpoints follow OSM way 1338274269. Its lower landing joins the mapped south public passage via way 1338274268.'
        }
    ]) {
        const top = toGeographicPlan(exit.point, geographicFrame);
        const name = messageText('facilities.locations.midosujiExit', { number: exit.number });
        const evidence: Evidence = {
            source: 'metro',
            pages: [1],
            urls: [operatorPlan, 'https://www.openstreetmap.org/node/' + exit.osm, ...(exit.trace ? [exit.trace] : [exitPhotos + exit.photo])],
            detail: `Exit ${exit.number}, OSM engineering point ${exit.engineeringRef}. ${exit.detail} Lower landing, flight direction, dimensions and intermediate landings are display fits.`
        };
        const run = Math.hypot(top.x - exit.lower.x, top.z - exit.lower.z);
        const along = { x: (top.x - exit.lower.x) / run, z: (top.z - exit.lower.z) / run };
        const advance = (p: Point2, distance: number): Point2 => ({ x: p.x + along.x * distance, z: p.z + along.z * distance });
        // The JR–Metro facility codes continue to identify the two ends of its North Gate stair.
        const north = exit.number === '3A';
        const id = north ? 'district-jr-metro-stairs' : 'metro-umeda-exit-' + exit.number;
        const surface = {
            id: north ? 'district-jr-metro-surface' : id + '-street',
            level: exit.number === '18' ? 'district-ground' as const : 'concourse' as const,
            ...top
        };
        const underground = {
            id: north ? 'district-jr-metro-underground' : id + '-b1',
            level: 'district-underground' as const,
            ...exit.lower
        };
        connections.push({
            id,
            blockId,
            evidence,
            from: surface,
            to: underground,
            width: exit.width,
            ...(exit.number === '9'
                ? { kind: 'escalator', lanes: 2, laneSpacing: 1.95 }
                : { kind: 'stairs', stairLandingLength: 2.2 })
        });
        const apronWidth = exit.number === '9' ? 4.8 : exit.width + 1;
        areas.push(
            {
                id: surface.id + ':landing',
                level: surface.level,
                blockId,
                name,
                kind: 'public',
                outline: passageOutline(advance(surface, -.5), advance(surface, 3.5), apronWidth),
                height: .55,
                label: false,
                evidence
            },
            {
                id: underground.id + ':landing',
                level: underground.level,
                blockId,
                name,
                kind: 'public',
                outline: passageOutline(advance(underground, 1.1), exit.lowerApron ?? advance(underground, -3), apronWidth),
                height: .55,
                label: false,
                evidence
            }
        );
        if (exit.canopy) {
            canopies.push({
                id: 'metro-umeda-exit-' + exit.number + '-canopy',
                level: surface.level,
                points: [advance(surface, -6), advance(surface, 2.5)],
                ...exit.canopy,
                evidence
            });
        }
    }
    const { center, deckFacing, evidence } = midosujiSouthLift;
    const lift: VerticalConnection = {
        id: 'metro-umeda-midosuji-south-lift',
        kind: 'elevator',
        blockId,
        evidence,
        from: { id: 'metro-umeda-midosuji-south-lift-b1', level: 'district-underground', ...center },
        to: { id: 'metro-umeda-midosuji-south-lift-street', level: 'district-ground', ...center },
        doorFacingRad: deckFacing + Math.PI
    };
    const b1Join = toGeographicPlan({ lon: 135.4974613, lat: 34.7025872 }, geographicFrame);
    const door = {
        x: center.x + Math.cos(lift.doorFacingRad!) * 1.55,
        z: center.z + Math.sin(lift.doorFacingRad!) * 1.55
    };
    for (const stop of [lift.from, lift.to]) {
        areas.push({
            id: stop.id + ':landing',
            level: stop.level,
            blockId,
            name: messageText('facilities.locations.midosuji'),
            kind: 'public',
            evidence,
            outline: elevatorDoorApproach(
                stop, lift.doorFacingRad!, stop === lift.from ? passageOutline(door, b1Join, 4.4) : undefined
            ),
            height: .55,
            label: false
        });
    }
    return { connections, areas, canopies, lift };
}
