import { joinedPassageOutlines, passageOutline } from '../../../domain/map/geometry.ts';
import type { Evidence, FloorArea, Point2, VerticalConnection, WalkwayCanopy } from '../../../domain/map/model.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

const blockId = 'whity-b1';
const operatorPlan = 'https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf';
const junction = { x: 818, z: 594 };
const exits = [
    {
        number: 'J-2', node: '8878597296', sidewalk: '1459201095',
        mouth: { lon: 135.5003246, lat: 34.7029165 },
        bottom: { x: 851, z: 582 }, via: [{ x: 829, z: 589 }],
        width: 3, buildingId: 'os-building', buildingWay: '162157817',
    },
    {
        number: 'J-3', node: '8878597300', sidewalk: '1459201096',
        mouth: { lon: 135.4998444, lat: 34.7028221 },
        bottom: { x: 800.7, z: 568.5 }, via: [{ x: 812, z: 581.6 }],
        width: 2.65, buildingId: 'hep-navio', buildingWay: '174789734',
    },
    {
        number: 'J-4', node: '8878597302', sidewalk: '1459201003',
        mouth: { lon: 135.4999946, lat: 34.7026411 },
        bottom: { x: 832, z: 604.4 }, via: [{ x: 827, z: 599.4 }],
        width: 2.65, buildingId: 'os-building', buildingWay: '162157817',
    },
];

/** Fit the Whity Umeda (ホワイティうめだ) North Mall 2 branch to three facade mouths. */
export function createWhityNorthMall2Access() {
    const areas: FloorArea[] = [];
    const connections: VerticalConnection[] = [];
    const buildingEquipment: { buildingId: string; connectionId: string }[] = [];
    const mallName = messageText('publicAreas.whity.entities.whityB1.name');
    const branchEvidence: Evidence = {
        source: 'district',
        pages: [50, 53],
        urls: [operatorPlan, 'https://whity.osaka-chikagai.jp/common/images/floor_lang.pdf'],
        detail: 'The North Mall 2 public branch serves the separately mapped J-2, J-3 and J-4 street stairs. The branch alignment between these mouths and the source public floor is fitted.'
    };
    for (const [index, outline] of joinedPassageOutlines([{ x: 803, z: 614.4 }, { x: 810.1, z: 601 }, junction], 5.8).entries()) {
        areas.push({
            id: 'whity-north-mall-2-fit-' + index, name: mallName, level: 'district-underground', kind: 'public',
            blockId, outline, evidence: branchEvidence, label: false
        });
    }
    for (const exit of exits) {
        const id = 'whity-exit-' + exit.number.toLowerCase();
        const name = messageText('facilities.locations.whityExit', { number: exit.number });
        const evidence: Evidence = {
            source: 'district',
            pages: [6, 50, 53],
            urls: [
                operatorPlan, 'https://www.openstreetmap.org/node/' + exit.node,
                'https://www.openstreetmap.org/way/' + exit.sidewalk, 'https://www.openstreetmap.org/way/' + exit.buildingWay
            ],
            detail: 'The Whity plan marks a public street stair. The OSM mouth is on the host footprint and connects to the sidewalk. The stair flights, B1 approach and opening dimensions are fitted.'
        };
        const from = { id: id + '-b1', level: 'district-underground' as const, ...exit.bottom };
        const to = { id: id + '-ground', level: 'district-ground' as const, ...toGeographicPlan(exit.mouth, geographicFrame) };
        connections.push({ id, kind: 'stairs', blockId, from, to, width: exit.width, stairLandingLength: 1.45, evidence });
        buildingEquipment.push({ buildingId: exit.buildingId, connectionId: id });
        const dx = to.x - from.x;
        const dz = to.z - from.z;
        const run = Math.hypot(dx, dz);
        /** Extend the floor across the end of the flight to support the modeled landing. */
        const along = (p: Point2, distance: number): Point2 => ({ x: p.x + dx * distance / run, z: p.z + dz * distance / run });
        const outlines = [
            ...joinedPassageOutlines([junction, ...exit.via, from], exit.width + 1.8),
            passageOutline(along(from, -2.25), along(from, 1.1), exit.width + 1.8)
        ];
        for (const [index, outline] of outlines.entries()) {
            areas.push({
                id: id + '-b1-approach-' + index, name, level: from.level, kind: 'public',
                blockId, outline, evidence, label: false
            });
        }
        areas.push({
            id: id + '-street-apron', name, level: to.level, kind: 'public',
            blockId, outline: passageOutline(along(to, -1.1), along(to, 3.2), exit.width + 1.5),
            evidence, label: false
        });
    }
    const canopy: WalkwayCanopy = {
        id: 'whity-os-plaza-canopy',
        level: 'district-ground',
        points: [{ x: 820.6, z: 595 }, { x: 862.7, z: 552.3 }],
        width: 5.6,
        clearHeight: 4.5,
        postClearances: connections
            .filter(c => buildingEquipment.some(binding => binding.connectionId === c.id && binding.buildingId === 'os-building'))
            .map(c => ({ point: c.to, radius: 3.5 })),
        evidence: {
            source: 'district',
            pages: [3, 4, 5],
            urls: ['https://www.osgroup.co.jp/business/assets/os_guidance.pdf', 'https://www.openstreetmap.org/way/162157817'],
            detail: 'The OS plaza plan and elevation show a covered public area about 60 m long with 4.5 m eaves. Its endpoints and roof width are fitted along the mapped facade; supports yield to the street mouths.'
        }
    };
    return { areas, connections, buildingEquipment, canopies: [canopy] };
}
