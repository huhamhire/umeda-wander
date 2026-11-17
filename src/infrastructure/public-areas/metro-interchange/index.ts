import { messageText } from '../../i18n/index.ts';
import type { PublicBlockDefinition, PublicRegionPatch } from '../../../domain/map/public-area.ts';
import { box, districtUndergroundEvidence } from '../underground-source.ts';

const proof = {
    ...districtUndergroundEvidence,
    urls: [
        ...districtUndergroundEvidence.urls!,
        'https://subway.osakametro.co.jp/station_guide/station/M16_%E6%A2%85%E7%94%B0_%E6%A7%8B%E5%86%85%E5%9B%B3.pdf',
        'https://www.westjr.co.jp/global/en/timetable/pdf/station_osaka.pdf'
    ],
    detail: 'M16 p1: central-west exit toward JR (3A/3B), central-east toward Hankyu and underground streets; JR p6 north B1 eastward destination. Authored landing adapters in the calibrated metre frame, estimated widths and corners; not extracted from OSM or inferred by proximity.'
};
export const metroInterchangeBlock: PublicBlockDefinition = {
    id: 'metro-interchange-b1',
    name: messageText('publicAreas.metroInterchange.entities.metroInterchangeB1.name'),
    mask: box(540, 430, 705, 700),
    evidence: { ...proof, detail: districtUndergroundEvidence.detail + ' ' + proof.detail }
};
/** Known cross-diagram relations. These are excavation faces, not buffered bridge chords. */
export const metroPublicPatches: PublicRegionPatch[] = [
    {
        id: 'm16-jr-west-forecourt',
        blockId: 'metro-interchange-b1',
        name: messageText('publicAreas.metroInterchange.entities.m16JrWestForecourt.name'),
        evidence: proof,
        region: {
            outline: [
                [552, 492],
                [562, 490],
                [575, 513],
                [594, 546],
                [590, 558],
                [580, 562],
                [565, 531],
                [555, 510]
            ].map(([x, z]) => ({ x: x!, z: z! }))
        }
    },
    {
        id: 'm16-hankyu-east-forecourt',
        blockId: 'metro-interchange-b1',
        name: messageText('publicAreas.metroInterchange.entities.m16HankyuEastForecourt.name'),
        evidence: proof,
        region: {
            outline: [
                [650, 535],
                [658, 531],
                [688, 566],
                [695, 575],
                [687, 584],
                [679, 577],
                [663, 557],
                [655, 550]
            ].map(([x, z]) => ({ x: x!, z: z! }))
        }
    },
    {
        id: 'jr-north-m16-bypass',
        blockId: 'metro-interchange-b1',
        name: messageText('publicAreas.metroInterchange.entities.jrNorthM16Bypass.name'),
        evidence: proof,
        region: {
            outline: [
                [549, 490],
                [561, 487],
                [570, 475],
                [579, 471],
                [573, 460],
                [561, 466],
                [551, 479]
            ].map(([x, z]) => ({ x: x!, z: z! }))
        }
    },
];
