import { passageOutline } from '../../../domain/map/geometry.ts';
import type { Evidence, FloorArea, Point2, VerticalConnection, WalkwayCanopy } from '../../../domain/map/model.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

const whityPlan = 'https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf';

/** Project street mouths from the OSM snapshot into district metres. */
const project = (lon: number, lat: number) => toGeographicPlan({ lon, lat }, geographicFrame);

/** Add the four detached street entrances of Whity Umeda (ホワイティうめだ) north of Izumi-no-hiroba (泉の広場). */
export function createWhityStreetExits() {
    const blockId = 'whity-b1';
    const connections: VerticalConnection[] = [];
    const canopies: WalkwayCanopy[] = [];
    const areas: FloorArea[] = [{
        id: 'whity-nomoka-street-access-spine',
        level: 'district-underground',
        kind: 'public',
        name: messageText('publicAreas.whity.entities.whityB1.name'),
        blockId,
        outline: [
            { x: 980, z: 577 }, { x: 996, z: 576 }, { x: 1003, z: 646 },
            { x: 987, z: 648 }, { x: 982, z: 614 }
        ],
        label: false,
        evidence: {
            source: 'district',
            pages: [50],
            urls: [whityPlan, 'https://www.openstreetmap.org/way/1010195578'],
            detail: 'Operator plan identifies the B1 central passage and branches. The access strip follows the mapped tunnel centre line and overlaps the existing projected public floor. Edges and width are fitted.'
        }
    }];
    const exits = [
        {
            number: 'M-1', node: '2330458903', roof: '618516676',
            mouth: project(135.5016509, 34.7026817), roofEnd: { x: 974.32, z: 582.98 },
            foot: { x: 974.1, z: 577.8 }, joins: { x: 989, z: 578.8 }, roofWidth: 3.5, stairWidth: 2.8
        },
        {
            number: 'M-2', node: '5018031053', roof: '618516665',
            mouth: project(135.5020077, 34.7027147), roofEnd: { x: 1006.75, z: 579.98 },
            foot: { x: 1006.39, z: 574.6 }, joins: { x: 989, z: 579 }, roofWidth: 3.65, stairWidth: 2.85
        },
        {
            number: 'M-5', node: '5018031052', roof: '618516675',
            mouth: project(135.5016593, 34.7025805), roofEnd: { x: 976.10, z: 611.40 },
            foot: { x: 976.52, z: 617.5 }, joins: { x: 992.8, z: 615 }, roofWidth: 4.2, stairWidth: 3.4
        },
        {
            number: 'M-6', node: '2715291801', roof: '618516664',
            mouth: project(135.5020120, 34.7026427), roofEnd: { x: 1008.58, z: 604.40 },
            foot: { x: 1009.18, z: 610.4 }, joins: { x: 992.5, z: 609 }, roofWidth: 2.8, stairWidth: 2.2
        }
    ];
    for (const exit of exits) {
        const id = 'whity-exit-' + exit.number.toLowerCase();
        const name = messageText('facilities.locations.whityExit', { number: exit.number });
        const evidence: Evidence = {
            source: 'district',
            pages: [6, 50],
            urls: [whityPlan, 'https://www.openstreetmap.org/node/' + exit.node, 'https://www.openstreetmap.org/way/' + exit.roof],
            detail: 'Operator plan locates a Whity street entrance on the B1 branch. OSM supplies the street mouth and detached roof footprint. Stair length, width, bottom position and intermediate landing are fitted.'
        };
        const from = { id: id + '-b1', level: 'district-underground' as const, ...exit.foot };
        const to = { id: id + '-ground', level: 'district-ground' as const, ...exit.mouth };
        connections.push({ id, kind: 'stairs', blockId, from, to, width: exit.stairWidth, stairLandingLength: 1.5, evidence });
        // Provide flat landings at both ends before joining the shared slab and planning openings.
        const dx = to.x - from.x;
        const dz = to.z - from.z;
        const run = Math.hypot(dx, dz);
        const along = (p: Point2, distance: number): Point2 => ({ x: p.x + dx * distance / run, z: p.z + dz * distance / run });
        areas.push({
            id: id + '-b1-apron',
            level: from.level,
            kind: 'public',
            name,
            blockId,
            outline: passageOutline(along(from, -2.1), along(from, .9), exit.stairWidth + 1.5),
            label: false,
            evidence
        }, {
            id: id + '-b1-branch',
            level: from.level,
            kind: 'public',
            name,
            blockId,
            outline: passageOutline(from, exit.joins, exit.stairWidth + 1),
            label: false,
            evidence
        }, {
            id: id + '-street-apron',
            level: to.level,
            kind: 'public',
            name,
            blockId,
            outline: passageOutline(along(to, -1.1), along(to, 4), exit.stairWidth + 1.4),
            label: false,
            evidence
        });
        canopies.push({
            id: id + '-canopy',
            level: to.level,
            points: [exit.roofEnd, exit.mouth],
            width: exit.roofWidth,
            clearHeight: 2.9,
            evidence
        });
    }
    return { areas, canopies, connections };
}
