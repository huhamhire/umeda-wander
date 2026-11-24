import { passageOutline } from '../../../domain/map/geometry.ts';
import type { AtriumVoid, Evidence, FloorArea, Point2, VerticalConnection } from '../../../domain/map/model.ts';
import { messageText } from '../../i18n/index.ts';

const ground = 'district-ground';
const b1 = 'district-underground';
const blockId = 'north-atrium-b1';
const name = messageText('publicAreas.westDecks.entities.sunkenGarden.name');
const evidence: Evidence = {
    source: 'district',
    pages: [],
    urls: [
        'https://umekita.com/assets/S-1F_1.png',
        'https://umekita.com/assets/S-B1.webp',
        'https://www.rbayakyu.jp/rbay-kodawari/item/8033-3-21'
    ],
    detail: 'The operator maps show the Sunken Garden (サンクンガーデン) between Park Tower and Gate Tower, with outdoor stairs beside Time Out Market Osaka on B1. ' +
        'The triangular opening follows the observed valley shape. Its three vertices, stair arms and B1 approach are schematic fits. Reference-derived geometry permission pending.'
};

const opening: Point2[] = [
    { x: 102, z: 571 }, { x: 117.3, z: 577.6 }, { x: 101.3, z: 595 }
];

/** Fit one of the open-air stair arms, keeping its upper landing beyond the court rim. */
function gardenStair(side: 'north' | 'south', foot: Point2, head: Point2, width = 2.5): VerticalConnection {
    const id = 'umekita-sunken-garden-' + side;
    return {
        id,
        kind: 'stairs',
        from: { ...foot, id: id + '-b1', level: b1 },
        to: { ...head, id: id + '-ground', level: ground },
        width,
        blockId,
        placement: 'exterior',
        evidence
    };
}

/** Keep the lower garden inside the South Building public approach and expose it through the 1F rim. */
export const sunkenGarden: {
    areas: FloorArea[];
    connections: VerticalConnection[];
    atrium: AtriumVoid;
} = {
    areas: [
        {
            id: 'umekita-sunken-garden-b1-court',
            level: b1,
            name,
            kind: 'public',
            blockId,
            outline: opening,
            evidence
        },
        {
            id: 'umekita-sunken-garden-b1-approach',
            level: b1,
            name,
            kind: 'public',
            blockId,
            outline: passageOutline({ x: 105, z: 585 }, { x: 144, z: 605 }, 6),
            evidence
        },
        {
            id: 'umekita-sunken-garden-ground-rim',
            level: ground,
            name,
            kind: 'public',
            blockId,
            label: true,
            labelAnchor: { x: 113, z: 573 },
            outline: [
                { x: 104, z: 567 }, { x: 118.5, z: 573 }, { x: 120, z: 576.2 },
                { x: 114.4, z: 584 }, { x: 109, z: 589 }, { x: 102.3, z: 596 },
                { x: 97.5, z: 597 }, { x: 98.2, z: 581 }, { x: 100.8, z: 571 }
            ],
            holes: [opening],
            evidence
        }
    ],
    connections: [
        gardenStair('north', { x: 104, z: 582.5 }, { x: 108.6, z: 572.7 }),
        gardenStair('south', { x: 103.5, z: 590 }, { x: 113, z: 583.5 }, 2.1)
    ],
    atrium: { id: 'umekita-sunken-garden', name, openings: [{ level: ground, outline: opening }], evidence }
};
