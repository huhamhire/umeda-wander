import { messageText } from '../i18n/index.ts';
import type { FloorArea, VerticalConnection, Point2 } from '../../domain/map/model.ts';
import { elevatorDoorApproach } from '../../application/connections/connection-openings.ts';
import { deckEvidence } from './elevated-source.ts';

/** Only public equipment explicitly marked by the supplied elevated/2F plans. */
export function createDeckAccess(atriumLift: VerticalConnection) {
    const connections: VerticalConnection[] = [];
    const areas: FloorArea[] = [];
    const pad = (p: Point2, w = 6) => [
        { x: p.x - w / 2, z: p.z - w / 2 },
        { x: p.x + w / 2, z: p.z - w / 2 },
        { x: p.x + w / 2, z: p.z + w / 2 },
        { x: p.x - w / 2, z: p.z + w / 2 }
    ];
    const add = (
        id: string,
        blockId: string,
        level: 'district-north-deck' | 'district-south-deck',
        high: Point2,
        low = high,
        kind: VerticalConnection['kind'] = 'elevator',
        ownsGroundApproach = true
    ) => {
        const evidence = {
            ...deckEvidence,
            detail: deckEvidence.detail + ' Public plan reference ' + id + '; schematic equipment location and size, not a field sign or certified accessible route.'
        };
        const c: VerticalConnection = {
            id,
            blockId,
            kind,
            evidence,
            from: { id: id + '-ground', level: 'district-ground', ...low },
            to: { id: id + '-deck', level, ...high },
            ...(kind === 'elevator' ? { doorFacingRad: -Math.PI / 6 } : { width: 3.2 })
        };
        connections.push(c);
        if (!ownsGroundApproach) {
            return;
        }
        // The bridge supplies the upper lift approach. At street level draw only the door-side strip.
        const landings = kind === 'elevator' ? [c.from] : [c.from, c.to];
        areas.push(...landings.map(n => ({
            id: n.id + ':landing',
            blockId,
            level: n.level,
            name: messageText('publicAreas.deckAccess.landing.name'),
            kind: 'public' as const,
            outline: kind === 'elevator' ? elevatorDoorApproach(n, c.doorFacingRad!) : pad(n),
            height: .55,
            label: false,
            evidence
        })));
    };
    // The city map's lift 26 serves the same upper stops as JR lift B.
    const atriumDeck = {
        ...atriumLift.to,
        id: 'public-north-lift-26-deck',
        level: 'platform' as const
    };
    const atriumUpperEvidence = {
        ...atriumLift.evidence,
        urls: [...atriumLift.evidence.urls!, ...deckEvidence.urls!],
        detail: 'JR North Gate building plans and the Osaka city accessibility map (p1, ref. 26) identify the same lift at 1F, 2F and 3F. Both upper doors use existing JR public floors; shaft location is fitted.'
    };
    connections.push(
        {
            ...atriumLift,
            id: 'public-north-lift-26',
            blockId: 'north-decks',
            from: { ...atriumLift.to, id: 'public-north-lift-26-ground' },
            to: atriumDeck,
            evidence: atriumUpperEvidence
        },
        {
            ...atriumLift,
            id: 'public-north-lift-26-bridge',
            blockId: 'north-decks',
            from: { ...atriumDeck, id: 'public-north-lift-26-bridge-deck' },
            to: { ...atriumDeck, id: 'public-north-lift-26-bridge-upper', level: 'bridge' },
            evidence: atriumUpperEvidence
        }
    );
    add('public-north-lift-28', 'north-decks', 'district-north-deck', { x: 526.4, z: 473.2 });
    for (const [ref, x, z] of [
        [6, 618.6, 607.7],
        [7, 625.9, 580.8],
        [8, 628.4, 659.7],
        [9, 669.3, 632.4],
        [21, 701.5, 750.3]
    ]) {
        add('public-south-lift-' + ref, 'south-decks', 'district-south-deck', { x: x!, z: z! });
    }
    add(
        'public-jp-deck-stairs',
        'south-decks',
        'district-south-deck',
        { x: 337.7, z: 811 },
        { x: 331.7, z: 815 },
        'stairs'
    );
    const jpLift = { x: 342, z: 808.4 };
    // The ground door opens onto the shared sunken garden stair landing.
    add('public-jp-deck-lift', 'south-decks', 'district-south-deck', jpLift, jpLift, 'elevator', false);
    // JR south/east 1F plan: the stair at the north end of the perimeter bridge.
    add(
        'umeda-deck-north-stairs',
        'south-decks',
        'district-south-deck',
        { x: 614.5, z: 596 },
        { x: 605, z: 591 },
        'stairs'
    );
    const northStair = connections.find(c => c.id === 'umeda-deck-north-stairs')!;
    northStair.width = 2.6;
    northStair.evidence = {
        ...northStair.evidence,
        pages: [5],
        urls: [
            ...northStair.evidence.urls ?? [],
            'https://www.westjr.co.jp/global/en/timetable/pdf/station_osaka.pdf'
        ],
        detail: 'JR south/east 1F plan shows a stair to the perimeter pedestrian bridge north landing. Location fitted to the calibrated bridge-north axis; width and rise estimated.',
    };
    // The public stair owns its landing independently of the calibrated JR envelope.
    return {
        connections,
        areas,
        buildingEquipment: [
            { connectionId: 'public-north-lift-26', buildingId: 'lucua' },
            { connectionId: 'public-north-lift-26-bridge', buildingId: 'lucua' },
            { connectionId: 'public-jp-deck-stairs', buildingId: 'jp-tower' },
            { connectionId: 'public-south-lift-9', buildingId: 'hankyu-dept' },
            { connectionId: 'public-south-lift-21', buildingId: 'hanshin-dept' },
        ]
    };
}
