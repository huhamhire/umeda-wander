import { messageText } from '../../i18n/index.ts';
import type { Evidence, FloorArea, Point2, VerticalConnection } from '../../../domain/map/model.ts';
import { elevatorDoorApproach } from '../../../application/connections/connection-openings.ts';

const evidence: Evidence = {
    source: 'district',
    pages: [2],
    urls: ['https://www.post.japanpost.jp/notification/productinformation/2023/1027_01_01.pdf'],
    detail: 'Japan Post access section explicitly shows exterior B1–1F stairs and a B1–2F lift at the southeast sunken garden. The B1 segment shares the existing 1F–2F shaft. Positions, footprint and rise are estimated. Garden Avenue attachment still requires local plan calibration; no nearest-point corridor is inferred.',
};
/** The source-confirmed sunken garden, independently owned from station interiors. */
export function createJpBasementAccess(upperLift: VerticalConnection) {
    const lift: VerticalConnection = {
        id: 'jp-garden-lift-0',
        kind: 'elevator',
        blockId: 'hanshin-west-b1',
        evidence,
        doorFacingRad: upperLift.doorFacingRad,
        from: {
            id: 'jp-lift-b1',
            level: 'district-underground',
            x: upperLift.from.x,
            z: upperLift.from.z
        },
        to: { ...upperLift.from, id: 'jp-lift-ground' },
    };
    const stairs: VerticalConnection = {
        id: 'jp-garden-b1-ground-stairs',
        kind: 'stairs',
        blockId: 'hanshin-west-b1',
        width: 3.2,
        stairLandingLength: 1.5,
        evidence,
        from: {
            id: 'jp-stairs-b1',
            level: 'district-underground',
            x: 350,
            z: 822
        },
        to: {
            id: 'jp-stairs-ground',
            level: 'district-ground',
            x: 343,
            z: 810
        },
    };
    const pad = (p: Point2): Point2[] => [
        { x: p.x - 3, z: p.z - 3 },
        { x: p.x + 3, z: p.z - 3 },
        { x: p.x + 3, z: p.z + 3 },
        { x: p.x - 3, z: p.z + 3 },
    ];
    const connections = [stairs, lift];
    const areas: FloorArea[] = [stairs.from, stairs.to].map(n => ({
        id: n.id + ':landing',
        level: n.level,
        blockId: stairs.blockId,
        name: messageText('publicAreas.southDiamor.jpGardenLanding.name'),
        kind: 'public',
        outline: n === stairs.to ? elevatorDoorApproach(lift.to, lift.doorFacingRad!, pad(n)) : pad(n),
        height: .55,
        label: false,
        evidence,
    }));
    areas.push({
        id: 'jp-sunken-garden-b1',
        level: 'district-underground',
        blockId: 'hanshin-west-b1',
        name: messageText('facilities.locations.jpGarden'),
        kind: 'public',
        label: false,
        evidence,
        outline: [{ x: 339, z: 805 }, { x: 347, z: 802 }, { x: 356, z: 822 }, { x: 347, z: 827 }],
    });
    return { connections, areas };
}
