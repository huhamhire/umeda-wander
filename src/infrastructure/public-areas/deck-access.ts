import { messageText } from '../i18n/index.ts';
import type { FloorArea, VerticalConnection, Point2 } from '../../domain/map/model.ts';
import { passageOutline } from '../../domain/map/geometry.ts';
import { elevatorDoorApproach } from '../../application/connections/connection-openings.ts';
import { deckEvidence, sourceDeckPaths } from './elevated-source.ts';

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
        ownsGroundApproach = true,
        doorFacingRad = -Math.PI / 6
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
            ...(kind === 'elevator' ? { doorFacingRad } : { width: 3.2 })
        };
        connections.push(c);
        if (!ownsGroundApproach) {
            return c;
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
        return c;
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
    const liftApproach = sourceDeckPaths(['grand-front-atrium']).find(p => p.id === 'grand-front-atrium:583058600')!;
    const [liftJunction, liftPoint] = liftApproach.points;
    const plazaLift = add(
        'public-north-plaza-lift',
        'north-decks',
        'district-north-deck',
        liftPoint!,
        liftPoint!,
        'elevator',
        true,
        Math.atan2(liftJunction!.z - liftPoint!.z, liftJunction!.x - liftPoint!.x)
    );
    plazaLift.evidence = {
        ...liftApproach.evidence,
        urls: [...liftApproach.evidence.urls!, 'https://www.openstreetmap.org/node/5574843124'],
        detail: 'The branch ends at the OSM elevator node west of lift B in the North Gate Building (ノースゲートビルディング) area. The city accessibility plan indicates a ground-to-atrium lift. Shaft and door geometry are fitted.'
    };
    const stairApproach = sourceDeckPaths(['atrium-public']).find(p => p.id === 'atrium-public:549066317')!;
    // The bottom of the exterior stair is the western endpoint of OSM way 501012842.
    const plazaStair = add('public-north-plaza-stairs', 'north-decks', 'district-north-deck', stairApproach.points[0]!, { x: 345.2, z: 510.9 }, 'stairs');
    plazaStair.placement = 'exterior';
    plazaStair.width = 7;
    plazaStair.evidence = {
        ...stairApproach.evidence,
        urls: [...stairApproach.evidence.urls!, 'https://www.openstreetmap.org/way/501012842'],
        detail: 'This deck arm reaches the exterior steps down to Umekita Plaza (うめきた広場). Endpoints follow the connected OSM stair way; tread dimensions and width are fitted.'
    };
    const run = Math.hypot(plazaStair.to.x - plazaStair.from.x, plazaStair.to.z - plazaStair.from.z);
    const dx = (plazaStair.to.x - plazaStair.from.x) / run * 2;
    const dz = (plazaStair.to.z - plazaStair.from.z) / run * 2;
    for (const end of [plazaStair.from, plazaStair.to]) {
        const landing = areas.find(a => a.id === end.id + ':landing')!;
        landing.outline = passageOutline(
            { x: end.x - dx, z: end.z - dz },
            { x: end.x + dx, z: end.z + dz },
            plazaStair.width
        );
        landing.evidence = plazaStair.evidence;
    }
    areas.find(a => a.id === plazaLift.from.id + ':landing')!.evidence = plazaLift.evidence;
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
