import { passageOutline } from '../../../domain/map/geometry.ts';
import type { Evidence, FloorArea, Point2, VerticalConnection, WalkwayCanopy } from '../../../domain/map/model.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

const blockId = 'hankyu-basements';
const operatorPlan = 'https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf';

/** Fit the street stairs and the south B1 approach at Puchishan (プチシャン). */
export function createWhityPuchishanAccess() {
    const areas: FloorArea[] = [];
    const connections: VerticalConnection[] = [];
    const canopies: WalkwayCanopy[] = [];
    for (const exit of [
        {
            number: '1', node: '8872207243', lon: 135.4988996, lat: 34.7054245,
            foot: { x: 736.4, z: 287.5 }, join: { x: 743.1, z: 291.1 },
            streetApproach: { x: 723.48, z: 289.64 },
            ways: ['958843695', '970881105', '1010195568'],
            detail: 'The north plaza opens west toward the Hankyu station (阪急大阪梅田駅) street corridor. The OSM mouth and corridor constrain the ground opening through the modeled Sanbangai (阪急三番街) edge.'
        },
        {
            number: '16', node: '4609280782', lon: 135.4995858, lat: 34.7044310,
            foot: { x: 774.2, z: 404.5 }, join: { x: 765.2, z: 403.1 },
            streetApproach: { x: 788.48, z: 395.76 },
            ways: ['466035093', '466035094', '466035113'],
            detail: 'The southeast exit is an outdoor stair. The mapped steps and roof constrain the upper flight and point toward the public corridor at the south end of the mall.'
        }
    ]) {
        const id = 'whity-exit-h-' + exit.number;
        const name = messageText('facilities.locations.whityExit', { number: 'H-' + exit.number });
        const evidence: Evidence = {
            source: 'district',
            pages: [50, 53],
            urls: [
                operatorPlan, 'https://www.openstreetmap.org/node/' + exit.node,
                ...exit.ways.map(way => 'https://www.openstreetmap.org/way/' + way)
            ],
            detail: exit.detail + ' The B1 landing, width and rise distribution are fitted.'
        };
        const from = { id: id + '-b1', level: 'district-underground' as const, ...exit.foot };
        const to = { id: id + '-ground', level: 'district-ground' as const, ...toGeographicPlan({ lon: exit.lon, lat: exit.lat }, geographicFrame) };
        const dx = to.x - from.x;
        const dz = to.z - from.z;
        const run = Math.hypot(dx, dz);
        /** Extend under the terminal tread so the local opening retains a landing lip. */
        const inset = (point: Point2, distance: number): Point2 => ({
            x: point.x + dx * distance / run,
            z: point.z + dz * distance / run
        });
        connections.push({ id, kind: 'stairs', blockId, from, to, width: 2.65, stairLandingLength: 1.4, evidence });
        areas.push(
            {
                id: id + '-b1-approach', level: from.level, name, blockId, kind: 'public', label: false,
                outline: passageOutline(exit.join, inset(from, 1.2), 4.8), evidence
            },
            {
                id: id + '-street-apron', level: to.level, name, blockId, kind: 'public', label: false,
                outline: passageOutline(inset(to, -1.35), exit.streetApproach, 4), evidence
            }
        );
        if (exit.number === '16') {
            canopies.push({
                id: id + '-canopy', level: to.level, points: [{ x: 779.8, z: 401.06 }, to],
                width: 3.35, clearHeight: 2.8, postClearances: [{ point: to, radius: 2 }], evidence
            });
        }
    }
    areas.push({
        id: 'whity-3-31-b1-approach',
        name: messageText('publicAreas.whity.entities.hankyuBasements.name'),
        level: 'district-underground',
        kind: 'public',
        blockId,
        label: false,
        outline: passageOutline({ x: 762.8, z: 399.6 }, { x: 753.5, z: 402.1 }, 3.1),
        evidence: {
            source: 'district',
            pages: [50, 53, 54],
            urls: [operatorPlan, 'https://www.city.osaka.lg.jp/kita/cmsfiles/contents/0000419/419991/10_en.pdf#page=2'],
            detail: 'Whity and Osaka City place the 3-31 approach on the west side of south Puchishan (プチシャン). The fitted B1 spur stops at the approach to the stair.'
        }
    });
    const buildingEquipment = [{ buildingId: 'hankyu-sanbangai', connectionId: 'whity-exit-h-1' }];
    return { areas, connections, canopies, buildingEquipment };
}
