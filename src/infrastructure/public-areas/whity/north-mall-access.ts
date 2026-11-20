import { joinedPassageOutlines, passageOutline } from '../../../domain/map/geometry.ts';
import type { Evidence, FloorArea, Point2, VerticalConnection, WalkwayCanopy } from '../../../domain/map/model.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

const operatorPlan = 'https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf';
const blockId = 'whity-b1';

/** Convert OSM mouth and passage coordinates to the shared district frame. */
const project = (lon: number, lat: number) => toGeographicPlan({ lon, lat }, geographicFrame);

/** Fit Whity Umeda's (ホワイティうめだ) North Mall access against street and tunnel anchors. */
export function createWhityNorthMallAccess() {
    const areas: FloorArea[] = [];
    const connections: VerticalConnection[] = [];
    const canopies: WalkwayCanopy[] = [];
    /** Register a flat public landing at its modeled height. */
    const floor = (id: string, name: string, level: FloorArea['level'], outline: Point2[], evidence: Evidence, elevationOffset?: number) => {
        areas.push({ id, name, level, kind: 'public', blockId, outline, evidence, elevationOffset, label: false });
    };
    const northMallName = messageText('publicAreas.whity.entities.whityB1.name');
    const sunnyTerrace: Evidence = {
        source: 'district',
        pages: [50, 53],
        urls: [operatorPlan, 'https://whity.osaka-chikagai.jp/service', 'https://www.openstreetmap.org/way/1208420372'],
        detail: 'The North Mall plan connects the H-28 and H-30 stairs through Sunny Terrace. Street anchors constrain the local public cross-passage, with the lower points and width fitted.'
    };
    const h28Foot = { x: 785.8, z: 467.6 };
    const h30Foot = { x: 804.5, z: 465.5 };
    for (const [i, outline] of joinedPassageOutlines([
        { x: 777, z: 468 }, h28Foot, { x: 797.5, z: 472 }, h30Foot
    ], 6).entries()) {
        floor('whity-sunny-terrace-fit-' + i, northMallName, 'district-underground', outline, sunnyTerrace);
    }
    for (const exit of [
        {
            number: 'H-28', node: '5865318034', foot: h28Foot, top: project(135.4996605, 34.7039048), width: 2.65,
            detail: 'The named Sunny Terrace stair has an outdoor mouth. Its upper direction follows the mapped steps, and the underground position and middle landing are fitted.',
            sources: ['https://whity.osaka-chikagai.jp/service', 'https://www.openstreetmap.org/way/1208420372']
        },
        {
            number: 'H-30', node: '5865318036', foot: h30Foot, top: project(135.4998578, 34.7037043), width: 2.65,
            detail: 'H-30 reaches the south frontage of HEP FIVE. The public stair and wall opening are fitted from the operator plan and mapped facade mouth.',
            sources: ['https://www.openstreetmap.org/way/161451126', 'https://www.openstreetmap.org/way/1458907022']
        }
    ]) {
        const id = 'whity-exit-' + exit.number.toLowerCase();
        const name = messageText('facilities.locations.whityExit', { number: exit.number });
        const evidence: Evidence = {
            source: 'district', pages: [6, 50, 53],
            urls: [operatorPlan, 'https://www.openstreetmap.org/node/' + exit.node, ...exit.sources],
            detail: exit.detail
        };
        const from = { id: id + '-b1', level: 'district-underground' as const, ...exit.foot };
        const to = { id: id + '-ground', level: 'district-ground' as const, ...exit.top };
        connections.push({ id, kind: 'stairs', blockId, from, to, width: exit.width, stairLandingLength: 1.45, evidence });
        const dx = to.x - from.x;
        const dz = to.z - from.z;
        const run = Math.hypot(dx, dz);
        /** Extend a landing along its stair axis. */
        const along = (p: Point2, distance: number): Point2 => ({ x: p.x + dx * distance / run, z: p.z + dz * distance / run });
        floor(id + '-b1-apron', name, from.level, passageOutline(along(from, -2.1), along(from, 1.2), 4.4), evidence);
        floor(id + '-street-apron', name, to.level, passageOutline(along(to, -1.1), along(to, 4), 4.2), evidence);
    }

    const h41Name = messageText('facilities.locations.whityExit', { number: 'H-41' });
    const h41Proof: Evidence = {
        source: 'district',
        pages: [50, 53],
        urls: [
            operatorPlan, 'https://www.openstreetmap.org/node/5865318493',
            'https://www.openstreetmap.org/way/1322885763', 'https://www.openstreetmap.org/way/620835761'
        ],
        detail: 'OSM locates the detached canopy and the underground turn. The right-angle stair and intermediate rise are fitted to the mapped corner and directions.'
    };
    const h41Bottom = project(135.4994971, 34.7029049);
    const h41Bend = project(135.4994231, 34.7029102);
    const h41Mouth = project(135.4994190, 34.7028652);
    const bottom = { id: 'whity-h-41-b1', level: 'district-underground' as const, ...h41Bottom };
    const middle = { id: 'whity-h-41-landing', level: bottom.level, elevationOffset: 4.15, ...h41Bend };
    const street = { id: 'whity-h-41-street', level: 'district-ground' as const, ...h41Mouth };
    connections.push(
        { id: 'whity-exit-h-41-lower', kind: 'stairs', blockId, from: bottom, to: middle, width: 2.1, placement: 'exterior', evidence: h41Proof },
        { id: 'whity-exit-h-41', kind: 'stairs', blockId, from: middle, to: street, width: 2.1, evidence: h41Proof }
    );
    floor('whity-h-41-b1-fit', h41Name, bottom.level, passageOutline({ x: bottom.x - .8, z: bottom.z }, { x: 782.1, z: 567.7 }, 3.6), h41Proof);
    floor('whity-h-41-turn-apron', h41Name, middle.level, passageOutline({ x: 769.1, z: 566.6 }, { x: 772.55, z: 566.6 }, 3.6), h41Proof, middle.elevationOffset);
    floor('whity-h-41-street-apron', h41Name, street.level, passageOutline({ x: street.x, z: street.z - 1.1 }, { x: street.x, z: street.z + 3.7 }, 3.4), h41Proof);
    canopies.push({
        id: 'whity-h-41-canopy', level: street.level, points: [{ x: 770.94, z: 565.64 }, street],
        width: 2.05, clearHeight: 2.8, evidence: h41Proof
    });
    return { areas, connections, canopies, buildingEquipment: [{ buildingId: 'hep-five', connectionId: 'whity-exit-h-30' }] };
}
