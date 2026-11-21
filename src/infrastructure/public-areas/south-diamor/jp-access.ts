import { messageText } from '../../i18n/index.ts';
import type { BuildingOpening, Evidence, FloorArea, Point2, VerticalConnection } from '../../../domain/map/model.ts';
import { elevatorDoorApproach } from '../../../application/connections/connection-openings.ts';
import { passageOutline } from '../../../domain/map/geometry.ts';

const evidence: Evidence = {
    source: 'district',
    pages: [2],
    urls: ['https://www.post.japanpost.jp/notification/productinformation/2023/1027_01_01.pdf'],
    detail: 'Japan Post shows exterior B1–1F stairs and a B1–2F lift at the southeast sunken garden. Both lift segments share the 1F stop. Positions, footprint and rise are fitted.',
};

const gardenAvenueEvidence: Evidence = {
    source: 'district',
    pages: [2],
    urls: [
        'https://www.post.japanpost.jp/notification/productinformation/2023/1027_01_01.pdf',
        'https://www.pref.osaka.lg.jp/documents/96901/005jptower_panf.pdf',
        'https://osaka.jp-kitte.jp/guide/eventspace-jpbm.jsp',
        'https://www.openstreetmap.org/way/1318982038',
        'https://www.openstreetmap.org/node/12095159222',
        'https://www.openstreetmap.org/way/1459203729'
    ],
    detail: 'The developer section and Osaka Prefecture plan identify the southeast B1 link. The operator confirms public access. Its centre line and width are fitted from the southeast landing to the mapped Garden Avenue axis.'
};

/** Connect the southeast sunken garden (サンクンガーデン) to Garden Avenue (ガーデンアベニュー). */
export function createJpBasementAccess(upperLift: VerticalConnection, deckStairs: VerticalConnection) {
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
        to: upperLift.from,
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
    areas.push({
        id: 'jp-garden-avenue-link',
        level: 'district-underground',
        blockId: stairs.blockId,
        name: messageText('facilities.locations.jpGarden'),
        kind: 'public',
        label: false,
        evidence: gardenAvenueEvidence,
        outline: passageOutline(stairs.from, { x: 388.98, z: 828.20 }, 5.2),
    });
    // Japan Post shows the two exterior stair approaches connected across the 1F plaza.
    // Keep the walkway on the plaza side of the B1 stair opening before it narrows to the OSM sidewalk.
    const streetApproach = [
        { x: 338.65, z: 812.9 }, { x: 358.9, z: 800.75 }, { x: 359.4, z: 804.4 },
        { x: 349.5, z: 815.8 }, { x: 346.4, z: 818.1 }, { x: 340, z: 817.4 }
    ];
    const plazaApproach = passageOutline({ x: deckStairs.from.x - 0.6, z: deckStairs.from.z }, { x: 343.4, z: 812.1 }, 4);
    for (const [id, outline] of [['street', streetApproach], ['plaza', plazaApproach]] as const) {
        areas.push({
            id: 'jp-garden-' + id + '-approach',
            level: 'district-ground',
            blockId: stairs.blockId,
            name: messageText('facilities.locations.jpGarden'),
            kind: 'public',
            label: false,
            evidence: gardenAvenueEvidence,
            outline,
        });
    }
    const buildingOpenings: BuildingOpening[] = [{
        buildingId: 'jp-tower',
        base: -.1,
        top: 3.2,
        outline: plazaApproach,
        evidence: gardenAvenueEvidence,
    }];
    return { connections, areas, buildingOpenings };
}
