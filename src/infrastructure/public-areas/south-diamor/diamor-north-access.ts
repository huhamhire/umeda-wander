import { passageOutline } from '../../../domain/map/geometry.ts';
import type { Evidence, FloorArea, Point2, VerticalConnection, WalkwayCanopy } from '../../../domain/map/model.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

const blockId = 'hanshin-west-b1';
const operatorPlan = 'https://www.oud.co.jp/pdf/hinankeikaku.pdf#page=40';

/** Fit the two north entrances of Diamor Osaka (ディアモール大阪) to their street canopies. */
export function createDiamorNorthAccess() {
    const areas: FloorArea[] = [];
    const connections: VerticalConnection[] = [];
    const canopies: WalkwayCanopy[] = [];
    for (const entrance of [
        {
            number: 'D-23', ground: { lon: 135.4969987, lat: 34.7007114 },
            foot: { x: 550.8, z: 799.5 }, join: { x: 557.5, z: 800.5 },
            roofEnd: { x: 545.7, z: 803.15 }, street: { x: 544.99, z: 813.19 },
            turn: { x: 545.7, z: 803.15 }, node: '5848795614', roof: '618802492', sidewalk: '623086756'
        },
        {
            number: 'D-24', ground: { lon: 135.4971817, lat: 34.7008008 },
            foot: { x: 555.25, z: 785.85 }, join: { x: 552.2, z: 785.85 },
            roofEnd: { x: 559.92, z: 794.52 }, street: { x: 568.4, z: 800.55 },
            node: '5682041666', roof: '618802490', sidewalk: '618802487'
        }
    ]) {
        const id = 'diamor-exit-' + entrance.number.toLowerCase();
        const name = messageText('facilities.locations.diamorExit', { number: entrance.number });
        const evidence: Evidence = {
            source: 'district',
            pages: [40],
            urls: [
                operatorPlan, 'https://www.openstreetmap.org/node/' + entrance.node,
                'https://www.openstreetmap.org/way/' + entrance.roof, 'https://www.openstreetmap.org/way/' + entrance.sidewalk
            ],
            detail: 'The operator plan places the stairs on opposite sides of the north B1 approach. OSM supplies the street mouth, canopy and sidewalk. The B1 landing, stair widths and rise are fitted.'
        };
        const from = { id: id + '-b1', level: 'district-underground' as const, ...entrance.foot };
        const to = { id: id + '-ground', level: 'district-ground' as const, ...toGeographicPlan(entrance.ground, geographicFrame) };
        /** Place a landing on its served level within the existing public block. */
        const floor = (suffix: string, level: FloorArea['level'], outline: Point2[], elevationOffset?: number) => {
            areas.push({ id: id + suffix, level, name, blockId, kind: 'public', label: false, outline, evidence, elevationOffset });
        };
        const b1End = { x: from.x + Math.sign(from.x - entrance.join.x), z: from.z };
        floor('-b1-approach', from.level, passageOutline(entrance.join, b1End, 4.2));
        const roofEnd = entrance.roofEnd;
        const dx = to.x - roofEnd.x;
        const dz = to.z - roofEnd.z;
        const run = Math.hypot(dx, dz);
        floor('-street-apron', to.level, passageOutline({ x: to.x - dx / run, z: to.z - dz / run }, entrance.street, 4));
        if (entrance.turn) {
            const middle = { id: id + '-turn', level: from.level, elevationOffset: 4.1, ...entrance.turn };
            connections.push(
                { id: id + '-lower', kind: 'stairs', blockId, from, to: middle, width: 2.55, placement: 'exterior', evidence },
                { id, kind: 'stairs', blockId, from: middle, to, width: 2.55, evidence }
            );
            floor('-turn-apron', middle.level, passageOutline({ x: middle.x - 1.8, z: middle.z }, { x: middle.x + 1.8, z: middle.z }, 3.6), middle.elevationOffset);
        }
        else {
            connections.push({ id, kind: 'stairs', blockId, from, to, width: 2.55, stairLandingLength: 1.4, evidence });
        }
        canopies.push({
            id: id + '-canopy', level: to.level, points: [roofEnd, to], width: 2.95, clearHeight: 2.8,
            postClearances: [{ point: to, radius: 2 }], evidence
        });
    }
    return { areas, connections, canopies };
}
