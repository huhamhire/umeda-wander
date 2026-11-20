import { passageOutline } from '../../../domain/map/geometry.ts';
import type { Evidence, FloorArea, Point2, VerticalConnection, WalkwayCanopy } from '../../../domain/map/model.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

const blockId = 'diamor-b1';
const operatorPlan = 'https://www.oud.co.jp/pdf/hinankeikaku.pdf#page=40';

/** Fit the paired street stairs along Diamor Osaka (ディアモール大阪) toward Kitashinchi (北新地駅). */
export function createDiamorSouthAccess() {
    const areas: FloorArea[] = [];
    const connections: VerticalConnection[] = [];
    const canopies: WalkwayCanopy[] = [];
    for (const entrance of [
        {
            number: 'D-51', node: '5852387975', lon: 135.4972078, lat: 34.6991036,
            stairs: '623086717', sidewalk: '623086718', exitX: 564.78, footZ: 1004.4, joinX: 571
        },
        {
            number: 'D-52', node: '5884732499', lon: 135.4973312, lat: 34.6991038,
            stairs: '623086707', sidewalk: '623086708', exitX: 582.09, footZ: 1004.4, joinX: 575
        },
        {
            number: 'D-55', node: '5852387976', lon: 135.4971917, lat: 34.6989907,
            roof: '623086716', sidewalk: '623086715', exitX: 564.79, footZ: 1017.5, joinX: 571,
            roofEnd: { x: 567.98, z: 1014.55 }
        },
        {
            number: 'D-56', node: '5852387971', lon: 135.4973439, lat: 34.6989892,
            roof: '623086712', sidewalk: '623086711', exitX: 582.15, footZ: 1017.5, joinX: 575,
            roofEnd: { x: 579.06, z: 1014.72 }
        },
        {
            number: 'D-57', node: '5852387977', lon: 135.4972004, lat: 34.6986788,
            stairs: '623086714', sidewalk: '623086713', exitX: 564.13, footZ: 1023.55, joinX: 571
        },
        {
            number: 'D-58', node: '5852387970', lon: 135.4973228, lat: 34.6986786,
            stairs: '623086709', sidewalk: '623086710', exitX: 581.73, footZ: 1023.55, joinX: 575
        }
    ]) {
        const id = 'diamor-exit-' + entrance.number.toLowerCase();
        const name = messageText('facilities.locations.diamorExit', { number: entrance.number });
        const evidence: Evidence = {
            source: 'district',
            pages: [40],
            urls: [
                operatorPlan, 'https://www.openstreetmap.org/node/' + entrance.node,
                'https://www.openstreetmap.org/way/' + entrance.sidewalk,
                'https://www.openstreetmap.org/way/' + (entrance.stairs ?? entrance.roof)
            ],
            detail: 'The operator plan locates this stair on the south B1 spine. The OSM mouth and stair or roof alignment constrain the upper flight. The B1 landing, flight lengths and intermediate rise are fitted.'
        };
        const street = toGeographicPlan({ lon: entrance.lon, lat: entrance.lat }, geographicFrame);
        const from = { id: id + '-b1', level: 'district-underground' as const, x: entrance.roofEnd?.x ?? street.x, z: entrance.footZ };
        const to = { id: id + '-ground', level: 'district-ground' as const, ...street };
        const outward = Math.sign(entrance.exitX - street.x);
        /** Add the public landing before merging with its same-level surface. */
        const floor = (suffix: string, level: FloorArea['level'], start: Point2, end: Point2, width: number) => {
            areas.push({
                id: id + suffix, name, level, blockId, kind: 'public', label: false,
                outline: passageOutline(start, end, width), evidence
            });
        };
        floor('-b1-apron', from.level, { x: entrance.joinX, z: from.z }, { x: from.x + outward, z: from.z }, 3.8);
        floor('-street-apron', to.level, { x: to.x - outward * 1.4, z: to.z }, { x: entrance.exitX, z: to.z }, 3.8);
        connections.push({ id, kind: 'stairs', blockId, from, to, width: 2.25, stairLandingLength: 1.35, evidence });
        if (entrance.roofEnd) {
            canopies.push({
                id: id + '-canopy', level: to.level, points: [entrance.roofEnd, to],
                width: 2.65, clearHeight: 2.8, postClearances: [{ point: to, radius: 2 }], evidence
            });
        }
    }
    const junction = createDiamorSouthJunctionAccess();
    return {
        areas: [...areas, ...junction.areas],
        connections: [...connections, ...junction.connections],
        canopies: [...canopies, ...junction.canopies]
    };
}

/** Join the west and east street stairs to opposite corners of the Diamor (ディアモール大阪) B1 junction. */
function createDiamorSouthJunctionAccess() {
    const areas: FloorArea[] = [];
    const connections: VerticalConnection[] = [];
    const canopies: WalkwayCanopy[] = [];
    for (const entrance of [
        {
            number: 'D-49',
            ground: { lon: 135.4971258, lat: 34.6992286 },
            node: '5852387974',
            alignment: '623086721',
            sidewalk: '623086720',
            foot: { x: 556.6, z: 972.9 },
            join: { x: 561, z: 973.1 },
            street: { x: 560.53, z: 977.96 },
            turn: { x: 551.45, z: 974.95 },
            roof: [{ x: 551.08, z: 975.15 }, { x: 561.32, z: 975 }]
        },
        {
            number: 'D-50',
            ground: { lon: 135.4976403, lat: 34.6992461 },
            node: '5852387973',
            alignment: '623086724',
            sidewalk: '623086725',
            foot: { x: 581, z: 975.15 },
            join: { x: 577, z: 976.9 },
            street: { x: 607.49, z: 969.21 }
        }
    ]) {
        const id = 'diamor-exit-' + entrance.number.toLowerCase();
        const name = messageText('facilities.locations.diamorExit', { number: entrance.number });
        const evidence: Evidence = {
            source: 'district',
            pages: [40],
            urls: [
                operatorPlan, 'https://www.openstreetmap.org/node/' + entrance.node,
                'https://www.openstreetmap.org/way/' + entrance.alignment,
                'https://www.openstreetmap.org/way/' + entrance.sidewalk
            ],
            detail: 'The operator plan shows the B1 junction and its stair entrances. The OSM mouth, sidewalk and stair or pavilion axis fix the street approach. The lower approach, rise, and flight layout are fitted.'
        };
        const from = { id: id + '-b1', level: 'district-underground' as const, ...entrance.foot };
        const to = { id: id + '-ground', level: 'district-ground' as const, ...toGeographicPlan(entrance.ground, geographicFrame) };
        /** Add an apron within the level or local landing it serves. */
        const floor = (suffix: string, level: FloorArea['level'], start: Point2, end: Point2, width: number, elevationOffset?: number) => {
            areas.push({
                id: id + suffix, name, level, blockId, kind: 'public', label: false,
                outline: passageOutline(start, end, width), evidence, elevationOffset
            });
        };
        const footExtension = Math.sign(from.x - entrance.join.x);
        const sidewalkDirection = Math.sign(entrance.street.z - to.z);
        floor('-b1-apron', from.level, entrance.join, { x: from.x + footExtension, z: from.z }, 3.8);
        floor('-street-apron', to.level, { x: to.x, z: to.z - sidewalkDirection * 1.4 }, entrance.street, 4);
        if (entrance.turn) {
            const middle = { id: id + '-turn', level: from.level, elevationOffset: 4, ...entrance.turn };
            floor('-turn-apron', middle.level, { x: middle.x - 1.5, z: middle.z }, { x: middle.x + 1.2, z: middle.z }, 3.2, middle.elevationOffset);
            connections.push(
                { id: id + '-lower', kind: 'stairs', blockId, from, to: middle, width: 2.1, placement: 'exterior', evidence },
                { id, kind: 'stairs', blockId, from: middle, to, width: 2.1, evidence }
            );
            canopies.push({
                id: id + '-canopy', level: to.level, points: entrance.roof,
                width: 2.6, clearHeight: 2.8, postClearances: [{ point: to, radius: 2 }], evidence
            });
        }
        else {
            connections.push({ id, kind: 'stairs', blockId, from, to, width: 2.3, stairLandingLength: 1.5, evidence });
        }
    }
    return { areas, connections, canopies };
}
