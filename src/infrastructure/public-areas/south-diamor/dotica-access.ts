import { passageOutline } from '../../../domain/map/geometry.ts';
import type { Evidence, FloorArea, Point2, VerticalConnection, WalkwayCanopy } from '../../../domain/map/model.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

const planUrl = 'https://dotica.osaka-chikagai.jp/front/common/img/dotica_evacuation_plan_2024.pdf#page=47';

/** Fit the Dojima Underground Center (ドージマ地下センター) street entrances and their B1 approaches. */
export function createDoticaAccess() {
    const areas: FloorArea[] = [];
    const connections: VerticalConnection[] = [];
    const canopies: WalkwayCanopy[] = [];
    for (const group of [
        {
            number: 'C-60', blockId: 'kitashinchi-public-b1',
            foot: { x: 416.2, z: 1105 }, join: { x: 412.5, z: 1104.1 },
            turn: { x: 425.3, z: 1105.15 }, landingLength: 4.2, lowerWidth: 2.6,
            mouths: [
                {
                    suffix: '-north', node: '5852387951', lon: 135.4956578, lat: 34.6981733,
                    walk: '619294241', sidewalk: { x: 426.86, z: 1092.35 },
                    roof: '619294244', roofEnd: { x: 425.57, z: 1101.83 }, width: 2.1
                },
                {
                    suffix: '-south', node: '2360458675', lon: 135.4956358, lat: 34.6979684,
                    walk: '619294239', sidewalk: { x: 426.03, z: 1119.43 },
                    roof: '619294243', roofEnd: { x: 424.89, z: 1109.51 }, width: 1.9
                }
            ]
        },
        {
            number: 'C-69', blockId: 'outer-underground',
            foot: { x: 405, z: 1166.2 }, join: { x: 407.75, z: 1166.25 },
            turn: { x: 398.12, z: 1164.35 }, landingLength: 3, lowerWidth: 1.65,
            mouths: [
                {
                    suffix: '', node: '5024365387', lon: 135.4953542, lat: 34.6976080,
                    walk: '619294235', sidewalk: { x: 398.51, z: 1153.43 },
                    roof: '619294237', roofEnd: { x: 398.1, z: 1163.75 }, width: 1.55
                }
            ]
        },
        {
            number: 'C-83', blockId: 'outer-underground',
            foot: { x: 402.7, z: 1259.8 }, join: { x: 405, z: 1259.8 },
            turn: { x: 387.24, z: 1257.55 }, landingLength: 5.8, lowerWidth: 2.3,
            escalatorOffset: -2.6, intermediateRise: 4.65,
            additionalSources: ['https://dotica.osaka-chikagai.jp/faq', 'https://www.dojima-hari.com/our-hospital/pdf/nishi_umeda.pdf'],
            mouths: [
                {
                    suffix: '', node: '5024365391', lon: 135.4952340, lat: 34.6966450,
                    walk: '619294230', sidewalk: { x: 387.62, z: 1266.24 },
                    roof: '619294234', roofEnd: { x: 387.23, z: 1258.52 }, width: 2.55
                }
            ]
        },
        {
            number: 'C-93', blockId: 'outer-underground',
            foot: { x: 417.9, z: 1341.85 }, join: { x: 419.1, z: 1341.5 },
            turn: { x: 406.25, z: 1342.35 }, landingLength: 3.1, lowerWidth: 1.9,
            intermediateRise: 4.05,
            additionalSources: ['https://www.sps.sgn.ne.jp/company/profile/'],
            mouths: [
                {
                    suffix: '', node: '5024365393', lon: 135.4954482, lat: 34.6958778,
                    walk: '621688355', sidewalk: { x: 406.95, z: 1354.74 },
                    roof: '621688356', roofEnd: { x: 406.02, z: 1343.76 }, width: 1.75
                }
            ]
        }
    ]) {
        const id = 'dotica-exit-' + group.number.toLowerCase();
        const { blockId } = group;
        const name = messageText('facilities.locations.doticaExit', { number: group.number });
        const evidence: Evidence = {
            source: 'district',
            pages: [47],
            urls: [
                planUrl, ...group.additionalSources ?? [],
                ...group.mouths.flatMap(mouth => [
                    'https://www.openstreetmap.org/node/' + mouth.node,
                    'https://www.openstreetmap.org/way/' + mouth.walk,
                    'https://www.openstreetmap.org/way/' + mouth.roof
                ])
            ],
            detail: 'The operator plan supplies the lower approach and its direction. OSM fixes the street mouths and canopy axes. Stair dimensions and the intermediate elevation are fitted.'
        };
        const from = { id: id + '-b1', level: 'district-underground' as const, ...group.foot };
        const turn = { id: id + '-turn', level: from.level, elevationOffset: group.intermediateRise ?? 3.6, ...group.turn };
        /** Add a local entrance surface at the same elevation as its served endpoint. */
        const apron = (suffix: string, level: FloorArea['level'], start: Point2, end: Point2, width: number, elevationOffset?: number) => {
            areas.push({
                id: id + suffix, name, level, blockId, kind: 'public', label: false, evidence, elevationOffset,
                outline: passageOutline(start, end, width)
            });
        };
        const footExtension = Math.sign(from.x - group.join.x);
        const landingZ = turn.z + (group.escalatorOffset ?? 0) / 2;
        apron('-b1-apron', from.level, group.join, { x: from.x + footExtension * 1.15, z: from.z }, 3.5);
        apron('-turn-apron', turn.level,
            { x: turn.x, z: landingZ - group.landingLength / 2 },
            { x: turn.x, z: landingZ + group.landingLength / 2 }, 3.15, turn.elevationOffset);
        connections.push({ id: id + '-lower', kind: 'stairs', blockId, from, to: turn, width: group.lowerWidth, placement: 'exterior', evidence });
        if (group.escalatorOffset !== undefined) {
            const escalatorId = id + '-escalator';
            const escalatorFrom = { ...from, id: escalatorId + '-b1', z: from.z + group.escalatorOffset };
            const escalatorTo = { ...turn, id: escalatorId + '-turn', z: turn.z + group.escalatorOffset };
            apron('-escalator-b1-apron', from.level,
                { x: group.join.x, z: group.join.z + group.escalatorOffset },
                { x: escalatorFrom.x + footExtension * 1.15, z: escalatorFrom.z }, 3.1);
            connections.push({
                id: escalatorId, kind: 'escalator', blockId, from: escalatorFrom, to: escalatorTo, placement: 'exterior', evidence
            });
        }
        for (const mouth of group.mouths) {
            const upperId = id + mouth.suffix;
            const ground = toGeographicPlan(mouth, geographicFrame);
            const to = { id: upperId + '-ground', level: 'district-ground' as const, ...ground };
            const towardStreet = Math.sign(mouth.sidewalk.z - ground.z);
            const beyondMouth = { x: ground.x, z: ground.z - towardStreet * 1.25 };
            apron(mouth.suffix + '-street-apron', to.level, beyondMouth, mouth.sidewalk, 3.7);
            connections.push({ id: upperId, kind: 'stairs', blockId, from: turn, to, width: mouth.width, evidence });
            canopies.push({
                id: upperId + '-canopy', level: to.level, points: [mouth.roofEnd, to],
                width: mouth.width + .55, clearHeight: 2.7, postClearances: [{ point: to, radius: 1.8 }], evidence
            });
        }
    }
    return { areas, connections, canopies };
}
