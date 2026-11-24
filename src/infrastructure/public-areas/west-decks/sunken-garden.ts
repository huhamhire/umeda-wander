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
    detail: 'The operator maps show the Sunken Garden (サンクンガーデン) between the ground retail wings with stairs from B1 to the park side. ' +
        'The opening, two stair arms and the approach within the South Building are schematic fits. Reference-derived geometry permission pending.'
};

const opening: Point2[] = [
    { x: 129, z: 579 }, { x: 144.5, z: 575 }, { x: 151.7, z: 590 }, { x: 137, z: 595 }, { x: 130, z: 591 }
];

/** Fit one of the open-air stair arms, keeping its upper landing beyond the court rim. */
function gardenStair(side: 'north' | 'south', foot: Point2, head: Point2): VerticalConnection {
    const id = 'umekita-sunken-garden-' + side;
    return {
        id,
        kind: 'stairs',
        from: { ...foot, id: id + '-b1', level: b1 },
        to: { ...head, id: id + '-ground', level: ground },
        width: 2.5,
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
            outline: passageOutline({ x: 137, z: 589 }, { x: 144, z: 605 }, 6),
            evidence
        },
        {
            id: 'umekita-sunken-garden-ground-rim',
            level: ground,
            name,
            kind: 'public',
            blockId,
            label: true,
            labelAnchor: { x: 152, z: 588 },
            outline: [
                { x: 125, z: 576 }, { x: 147, z: 571 }, { x: 152.8, z: 591 },
                { x: 148, z: 602 }, { x: 136, z: 599 }, { x: 127, z: 593 }
            ],
            holes: [opening],
            evidence
        }
    ],
    connections: [
        gardenStair('north', { x: 133.5, z: 583.5 }, { x: 147.5, z: 577.5 }),
        gardenStair('south', { x: 137, z: 590.5 }, { x: 148.5, z: 593 })
    ],
    atrium: { id: 'umekita-sunken-garden', name, openings: [{ level: ground, outline: opening }], evidence }
};
