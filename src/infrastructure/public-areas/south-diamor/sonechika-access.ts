import type { Evidence, Facility, FloorArea, VerticalConnection, WalkwayCanopy } from '../../../domain/map/model.ts';
import { passageOutline } from '../../../domain/map/geometry.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

/** Project the reviewed OSM street mouths and lift shaft into district metres. */
const project = (lon: number, lat: number) => toGeographicPlan({ lon, lat }, geographicFrame);

/** Add the confirmed public access to Sonechika (そねちか), outside the JR station. */
export function createSonechikaAccess() {
    const blockId = 'kitashinchi-public-b1';
    const exit43Evidence: Evidence = {
        source: 'district',
        pages: [1],
        urls: [
            'https://umeda-connect.jp/common/pdf/map_tw.pdf',
            'https://phoenixhall.jp/access/',
            'https://www.openstreetmap.org/node/3499801000',
            'https://www.openstreetmap.org/way/618802454',
            'https://www.openstreetmap.org/way/1322885750'
        ],
        detail: 'The district plan identifies 11-43 and the venue access guide confirms its escalator. OSM fixes the mouth, roof and B1 branch direction; landing depth and width are fitted.'
    };
    const exit44Evidence: Evidence = {
        source: 'district',
        pages: [1],
        urls: [
            'https://umeda-connect.jp/common/pdf/map_tw.pdf',
            'https://www.openstreetmap.org/node/5024365381',
            'https://www.openstreetmap.org/way/618802450'
        ],
        detail: 'The district plan and OSM locate the street mouth and its roof. The lower doorway and vertical equipment are not resolved by these sources.'
    };
    const liftEvidence: Evidence = {
        source: 'district',
        pages: [1],
        urls: [
            'https://www.kkr.mlit.go.jp/plan/happyou/thesises/2021/ol9a8v000004bznv-att/aka-11.pdf',
            'https://www.club-kansai.jp/access/',
            'https://www.openstreetmap.org/node/5865318044',
            'https://www.openstreetmap.org/way/1322885752',
            'https://www.openstreetmap.org/way/1551653211'
        ],
        detail: 'The road authority shows the walkway, parking and street stops. Only the walkway and street landings are modeled. OSM fixes the shaft; model door headings follow the mapped approaches.'
    };

    const mouth43 = project(135.4993909, 34.6981002);
    const mouth44 = project(135.4993970, 34.6983878);
    const shaft = project(135.4988636, 34.6981004);
    const escalator: VerticalConnection = {
        id: 'sonechika-exit-11-43',
        kind: 'escalator',
        blockId,
        width: 2.15,
        from: { id: 'sonechika-11-43-walkway', level: 'district-underground', x: 754, z: 1102 },
        to: { id: 'sonechika-11-43-street', level: 'district-ground', ...mouth43 },
        evidence: exit43Evidence
    };
    const lift: VerticalConnection = {
        id: 'sonechika-public-lift',
        kind: 'elevator',
        blockId,
        from: { id: 'sonechika-lift-walkway', level: 'district-underground', ...shaft },
        to: { id: 'sonechika-lift-street', level: 'district-ground', ...shaft },
        doorFacingRad: Math.PI / 2,
        lowerDoorFacingRad: Math.PI,
        evidence: liftEvidence
    };
    const exitName = (number: string) => messageText('facilities.locations.sonechikaExit', { number });
    const liftName = messageText('facilities.locations.sonechikaLift');
    const areas: FloorArea[] = [
        {
            id: 'sonechika-exit-11-43-branch',
            level: escalator.from.level,
            kind: 'public',
            name: exitName('11-43'),
            blockId,
            outline: [
                { x: 748, z: 1086 }, { x: 753.5, z: 1086 }, { x: 753.5, z: 1099.3 },
                { x: 756, z: 1099.3 }, { x: 756, z: 1104.7 }, { x: 748, z: 1104.7 }
            ],
            label: false,
            evidence: exit43Evidence
        },
        {
            id: 'sonechika-exit-11-43-apron',
            level: escalator.to.level,
            kind: 'public',
            name: exitName('11-43'),
            blockId,
            outline: passageOutline({ x: mouth43.x - 1.1, z: mouth43.z }, { x: mouth43.x + 3.8, z: mouth43.z }, 4),
            label: false,
            evidence: exit43Evidence
        },
        {
            id: 'sonechika-lift-walkway-apron',
            level: lift.from.level,
            kind: 'public',
            name: liftName,
            blockId,
            outline: passageOutline({ x: 707.8, z: 1102 }, shaft, 5.2),
            label: false,
            evidence: liftEvidence
        },
        {
            id: 'sonechika-lift-street-apron',
            level: lift.to.level,
            kind: 'public',
            name: liftName,
            blockId,
            outline: passageOutline(shaft, { x: shaft.x, z: shaft.z + 4 }, 4.2),
            label: false,
            evidence: liftEvidence
        }
    ];
    const canopies: WalkwayCanopy[] = [
        {
            id: 'sonechika-11-43-canopy',
            level: escalator.to.level,
            points: [{ x: 755.2, z: 1101.91 }, mouth43],
            width: 3.3,
            clearHeight: 2.9,
            evidence: exit43Evidence
        },
        {
            id: 'sonechika-11-44-canopy',
            level: 'district-ground',
            points: [{ x: 757.59, z: 1070.02 }, mouth44],
            width: 2.6,
            clearHeight: 2.9,
            evidence: exit44Evidence
        }
    ];
    const facilities: Facility[] = [{
        id: 'sonechika-exit-11-44',
        level: 'district-ground',
        name: exitName('11-44'),
        kind: 'entrance',
        ...mouth44,
        note: '',
        evidence: exit44Evidence
    }];
    return { areas, connections: [escalator, lift], canopies, facilities };
}
