import { messageText } from '../../i18n/index.ts';
import type { PublicBlockDefinition, PublicRegionPatch } from '../../../domain/map/public-area.ts';
import { passageOutline } from '../../../domain/map/geometry.ts';
import { box, districtUndergroundEvidence } from '../underground-source.ts';
import { m16NorthExitLanding } from './street-exits.ts';

const northJunction = { x: 555, z: 483.1 };

const proof = {
    ...districtUndergroundEvidence,
    urls: [
        ...districtUndergroundEvidence.urls!,
        'https://subway.osakametro.co.jp/station_guide/station/M16_%E6%A2%85%E7%94%B0_%E6%A7%8B%E5%86%85%E5%9B%B3.pdf',
        'https://www.westjr.co.jp/global/en/timetable/pdf/station_osaka.pdf',
        'https://www.openstreetmap.org/way/1010195566'
    ],
    detail: 'M16 p1: the central public cross-passage serves JR exits 7–9 and the Hankyu side at exit 6; 3A/3B belong to the north gate. JR p6 shows the north B1 eastward destination. Regional landing adapters and widths are fitted.'
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
        id: 'm16-north-jr-junction',
        blockId: 'metro-interchange-b1',
        name: messageText('publicAreas.metroInterchange.entities.jrNorthM16Bypass.name'),
        evidence: {
            ...proof,
            detail: 'The JR Osaka Station (JR大阪駅) B1 footway meets the fitted public landing at exit 3A (3A号出入口). The corner between the paths is a fitted continuous apron.'
        },
        region: { outline: passageOutline({ x: 535.87, z: 494.27 }, northJunction, 7.5) }
    },
    {
        id: 'm16-north-3a-apron',
        blockId: 'metro-interchange-b1',
        name: messageText('publicAreas.metroInterchange.entities.jrNorthM16Bypass.name'),
        evidence: proof,
        region: { outline: passageOutline(northJunction, m16NorthExitLanding, 5.5) }
    },
    {
        id: 'jr-north-m16-bypass',
        blockId: 'metro-interchange-b1',
        name: messageText('publicAreas.metroInterchange.entities.jrNorthM16Bypass.name'),
        evidence: proof,
        region: {
            outline: [
                [550, 491],
                [556, 498],
                [564, 497],
                [564, 487],
                [570, 475],
                [579, 471],
                [573, 460],
                [561, 466],
                [551, 479]
            ].map(([x, z]) => ({ x: x!, z: z! }))
        }
    },
];
