import { passageOutline } from '../../../domain/map/geometry.ts';
import type { Evidence, FloorArea, Point2, VerticalConnection, WalkwayCanopy } from '../../../domain/map/model.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

const blockId = 'whity-b1';
const operatorPlan = 'https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf';

/** Project exit and roof points from the OSM snapshot into district metres. */
const project = (lon: number, lat: number) => toGeographicPlan({ lon, lat }, geographicFrame);

/** Fit Whity Umeda's (ホワイティうめだ) central and police-side street access. */
export function createWhityCentralAccess() {
    const areas: FloorArea[] = [];
    const connections: VerticalConnection[] = [];
    const canopies: WalkwayCanopy[] = [];
    /** Add a local public landing; intermediate surfaces retain their fitted elevation. */
    const floor = (id: string, level: FloorArea['level'], outline: Point2[], evidence: Evidence, elevationOffset?: number) => {
        areas.push({
            id, level, outline, evidence, elevationOffset, blockId, kind: 'public', label: false,
            name: messageText('publicAreas.whity.entities.whityB1.name')
        });
    };
    const sharedProof: Evidence = {
        source: 'district',
        pages: [50, 53],
        urls: [
            operatorPlan, 'https://www.osaka-chikagai.jp/company/img/disaster/whity_promotion_plan.pdf',
            'https://www.openstreetmap.org/node/5024365408', 'https://www.openstreetmap.org/node/5024365409',
            'https://www.openstreetmap.org/way/1322885774', 'https://www.openstreetmap.org/way/618516677'
        ],
        detail: 'The Whity diagram shows the common approach at H-50 and two street mouths. The mapped underground spine and enclosure fix the common landing axis. The B1 foot, rise and flight widths are fitted.'
    };
    const h49 = { id: 'whity-h-49-ground', level: 'district-ground' as const, ...project(135.4993255, 34.7024423) };
    const h51 = { id: 'whity-h-51-ground', level: 'district-ground' as const, ...project(135.4993029, 34.7022888) };
    const lower = { id: 'whity-h-49-b1', level: 'district-underground' as const, x: 774.3, z: 627.3 };
    const fork = { id: 'whity-h-49-h-51-landing', level: lower.level, x: 760.94, z: 626.73, elevationOffset: 4.1 };
    connections.push(
        { id: 'whity-exit-h-49-lower', kind: 'stairs', blockId, from: lower, to: fork, width: 2.8, placement: 'exterior', evidence: sharedProof },
        { id: 'whity-exit-h-49', kind: 'stairs', blockId, from: fork, to: h49, width: 2.2, evidence: sharedProof },
        { id: 'whity-exit-h-51', kind: 'stairs', blockId, from: fork, to: h51, width: 2.2, evidence: sharedProof }
    );
    floor('whity-h-49-h-51-b1-approach', lower.level, passageOutline({ x: 773.4, z: 627.3 }, { x: 781.5, z: 627.3 }, 4.4), sharedProof);
    floor('whity-h-49-h-51-turn', fork.level, passageOutline({ x: 761.2, z: 624.95 }, { x: 760.7, z: 628.45 }, 3.4), sharedProof, fork.elevationOffset);
    floor('whity-exit-h-49-street', h49.level, passageOutline({ x: 761.8, z: 619.8 }, { x: 762.35, z: 614.4 }, 3.7), sharedProof);
    floor('whity-exit-h-51-street', h51.level, passageOutline({ x: 759.95, z: 634.65 }, { x: 759.3, z: 639.2 }, 3.7), sharedProof);
    canopies.push({
        id: 'whity-h-49-h-51-canopy', level: 'district-ground', points: [h49, h51],
        width: 2.75, clearHeight: 2.8, evidence: sharedProof,
        postClearances: [{ point: h49, radius: 2 }, { point: h51, radius: 2 }]
    });

    for (const exit of [
        {
            number: '58', lon: 135.4996799, lat: 34.7018297, node: '5024365373', roof: '620835758', sidewalk: '620835757',
            foot: { x: 781.8, z: 686.6 }, join: { x: 774.5, z: 687.1 }, roofEnd: { x: 785.7, z: 687.2 },
            roofWidth: 2.6
        },
        {
            number: '60', lon: 135.4994828, lat: 34.7015879, node: '5024365375', roof: '620835755', sidewalk: '620835754',
            foot: { x: 773, z: 701.2 }, join: { x: 768.2, z: 698.8 }, roofEnd: { x: 774.3, z: 704.7 },
            roofWidth: 3.75
        }
    ]) {
        const id = 'whity-exit-h-' + exit.number;
        const evidence: Evidence = {
            source: 'district',
            pages: [50, 53],
            urls: [
                operatorPlan, 'https://www.openstreetmap.org/node/' + exit.node,
                'https://www.openstreetmap.org/way/' + exit.roof, 'https://www.openstreetmap.org/way/' + exit.sidewalk
            ],
            detail: 'Whity maps a separate public stair beside Sonezaki Police Station (曽根崎警察署). The OSM mouth, enclosure and sidewalk constrain its upper end. The B1 foot and dimensions are fitted.'
        };
        const from = { id: id + '-b1', level: 'district-underground' as const, ...exit.foot };
        const to = { id: id + '-ground', level: 'district-ground' as const, ...project(exit.lon, exit.lat) };
        const dx = to.x - from.x;
        const dz = to.z - from.z;
        const run = Math.hypot(dx, dz);
        /** Extend the apron on the stair axis, leaving flat surfaces at both ends. */
        const along = (p: Point2, metres: number): Point2 => ({ x: p.x + dx * metres / run, z: p.z + dz * metres / run });
        connections.push({ id, kind: 'stairs', blockId, from, to, width: 2.45, stairLandingLength: 1.25, evidence });
        floor(id + '-b1-approach', from.level, passageOutline(exit.join, along(from, 1.15), 4.2), evidence);
        floor(id + '-street', to.level, passageOutline(along(to, -1.1), along(to, 3.6), 3.8), evidence);
        canopies.push({
            id: id + '-canopy', level: to.level, points: [exit.roofEnd, to], width: exit.roofWidth,
            clearHeight: 2.8, evidence, postClearances: [{ point: to, radius: 2 }]
        });
    }
    return { areas, connections, canopies };
}
