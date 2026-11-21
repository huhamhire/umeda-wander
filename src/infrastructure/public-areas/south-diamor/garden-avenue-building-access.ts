import { passageOutline } from '../../../domain/map/geometry.ts';
import type { AtriumVoid, Evidence, Facility, FloorArea, LevelId, Point2, RouteNode, VerticalConnection } from '../../../domain/map/model.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

const b1 = 'district-underground';
const ground = 'district-ground';
const cityPlan = 'https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000545/545556/12-4bessi2-2.pdf#page=9';
const herbisGuide = 'https://umeda-sc.jp/wp2/wp-content/themes/hhp_umeda/assets/pdf/malls/herbis/floor-guide_202312.pdf';
const hallGuide = 'https://hankyuhanshin-hall.com/herbis-hall/access/';
const meetingGuide = 'https://www.hhbm.hankyu-hanshin.co.jp/meeting/herbis/download/pdf/access_passage.pdf';

/** Model public thresholds and the documented street access along Garden Avenue (ガーデンアベニュー). */
export function createGardenAvenueBuildingAccess() {
    const areas: FloorArea[] = [];
    const facilities: Facility[] = [];
    const connections: VerticalConnection[] = [];

    /** Fit consecutive landing strips with overlap through bends on their common level. */
    const apron = (id: string, name: string, blockId: string, level: LevelId, points: readonly Point2[], width: number, evidence: Evidence) => {
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1]!;
            const b = points[i]!;
            const span = Math.hypot(b.x - a.x, b.z - a.z);
            const dx = (b.x - a.x) / span;
            const dz = (b.z - a.z) / span;
            areas.push({
                id: id + '-' + i, name, blockId, level, kind: 'public', label: false, evidence,
                outline: passageOutline(
                    { x: a.x - dx * .65, z: a.z - dz * .65 },
                    { x: b.x + dx * .65, z: b.z + dz * .65 },
                    width
                )
            });
        }
    };

    for (const entry of [
        {
            id: '6-10', key: 'mainichi', block: 'outer-underground',
            path: [{ x: -50.5, z: 1136.5 }, { x: -55, z: 1130.5 }, { x: -59, z: 1128.2 }],
            urls: [
                'https://www.hearton.co.jp/wp-content/uploads/2017/01/hall_mai_2.pdf#page=2',
                'https://www.umeda-garou.jp/access/'
            ],
            detail: 'The venue plan places the Mainichi Building (毎日新聞ビル) B1 entrance at the end of the numbered north-side branch. The interface position follows the city branch and is fitted.'
        },
        {
            id: '6-31', key: 'herbisPlazaWest', block: 'diamor-b1',
            path: [{ x: 135.5, z: 1037.3 }, { x: 140.17, z: 1037.76 }, { x: 145.7, z: 1043.3 }],
            urls: [hallGuide, 'https://bhj.biock.jp/common/files/bio2025_access.pdf', 'https://www.openstreetmap.org/node/5887069626'],
            detail: 'The venue access map identifies the 6-31 B2 public entrance from the common promenade. The door apron is fitted to the mapped branch.'
        },
        {
            id: '6-47', key: 'herbisPlazaEast', block: 'diamor-b1',
            path: [{ x: 230, z: 967.5 }, { x: 232, z: 973 }, { x: 228, z: 978.5 }, { x: 229.3, z: 981.2 }],
            urls: [meetingGuide, 'https://www.hhbm.hankyu-hanshin.co.jp/meeting/herbis/download/pdf/access_map.pdf',
                'https://www.openstreetmap.org/node/5887069603'],
            detail: 'Building management directs visitors from the promenade through the 6-47 door to the B2 restaurant floor. Only the public entrance apron is fitted.'
        },
        {
            id: '6-47-breeze', key: 'breeze', block: 'diamor-b1',
            path: [{ x: 257, z: 1001 }, { x: 260, z: 1008 }, { x: 265, z: 1010 }],
            urls: ['https://www.breeze-breeze.jp/info/map_underground', herbisGuide],
            detail: 'The operator identifies the BREEZÉ BREEZÉ (ブリーゼブリーゼ) B1 approach from 6-47. Mark the terminal door on the existing south branch.'
        },
        {
            id: '6-57', key: 'herbisEntWest', block: 'diamor-b1',
            path: [{ x: 246, z: 933.5 }, { x: 251, z: 936 }, { x: 259.85, z: 931.5 }],
            urls: [meetingGuide, herbisGuide, 'https://api.billboard-live.com/club/o_index.html',
                'https://www.openstreetmap.org/node/5887069593'],
            detail: 'The building access map identifies 6-57 at the west end of HERBIS PLAZA ENT (ハービスPLAZA ENT). The operator places the public venue threshold on B2; its approach is fitted.'
        }
    ] as const) {
        const id = 'garden-avenue-building-' + entry.id;
        const name = messageText(`facilities.locations.gardenAvenueBuilding.${entry.key}`);
        const evidence: Evidence = { source: 'district', pages: [9], urls: [cityPlan, ...entry.urls], detail: entry.detail };
        apron(id, name, entry.block, b1, entry.path, 4.1, evidence);
        facilities.push({ id, name, kind: 'entrance', level: b1, ...entry.path.at(-1)!, note: '', evidence });
    }

    const hallId = 'garden-avenue-building-6-25';
    const hallName = messageText('facilities.locations.gardenAvenueBuilding.herbisHall');
    const hallEvidence: Evidence = {
        source: 'district', pages: [1, 9],
        urls: [hallGuide, 'https://bhj.biock.jp/common/files/bio2025_access.pdf', herbisGuide, cityPlan,
            'https://www.openstreetmap.org/way/642560140', 'https://www.openstreetmap.org/node/5887069625'],
        detail: 'The Herbis Hall (ハービスホール) directions show the exterior stairs and the adjacent street lift down to its B2 entrance. The floor guide shows B2 opening onto Garden Avenue (ガーデンアベニュー). Landing dimensions, lift door sides and the short lower return are fitted.'
    };
    const hallFoot: RouteNode = { id: hallId + '-b2', level: b1, x: 94.459, z: 1079.314 };
    const hallTop: RouteNode = { id: hallId + '-ground', level: ground, x: 81.958, z: 1088.91 };
    const hallDoor = { x: 99, z: 1082.6 };
    const sidewalk = { x: 76.91, z: 1090.75 };
    const lift = toGeographicPlan({ lon: 135.4920278, lat: 34.6982524 }, geographicFrame);
    const liftMouth = { x: 91.9, z: 1083.85 };
    apron(hallId + '-foyer', hallName, 'outer-underground', b1,
        [{ x: 87, z: 1063 }, { x: 99.4, z: 1074 }, hallDoor, hallFoot], 4.7, hallEvidence);
    apron(hallId + '-street', hallName, 'outer-underground', ground,
        [hallTop, sidewalk], 3.9, hallEvidence);
    apron(hallId + '-lift-street', hallName, 'outer-underground', ground,
        [lift, liftMouth, { x: 89.3, z: 1080.8 }, { x: 83.4, z: 1085.85 }, sidewalk], 4, hallEvidence);
    apron(hallId + '-lift-foyer', hallName, 'outer-underground', b1,
        [lift, hallDoor], 4.2, hallEvidence);
    connections.push(
        {
            id: 'garden-avenue-exit-6-25', blockId: 'outer-underground', kind: 'stairs',
            from: hallFoot, to: hallTop, width: 2.7, stairLandingLength: 1.55, evidence: hallEvidence
        },
        {
            id: 'garden-avenue-lift-6-25', blockId: 'outer-underground', kind: 'elevator',
            from: { id: hallId + '-lift-b2', level: b1, ...lift },
            to: { id: hallId + '-lift-ground', level: ground, ...lift },
            doorFacingRad: Math.atan2(liftMouth.z - lift.z, liftMouth.x - lift.x),
            lowerDoorFacingRad: Math.atan2(hallDoor.z - lift.z, hallDoor.x - lift.x),
            evidence: hallEvidence
        }
    );
    facilities.push({ id: hallId, name: hallName, kind: 'entrance', level: b1, ...hallDoor, note: '', evidence: hallEvidence });

    const plazaId = 'herbis-ent-sunken-entrance';
    const plazaName = messageText('facilities.locations.gardenAvenueBuilding.herbisEntPlaza');
    const plazaEvidence: Evidence = {
        source: 'district', pages: [1, 2],
        urls: [herbisGuide, 'https://www.takenaka.co.jp/design/takenaka_design_works/068/book/pageindices/index5.html',
            'https://www.openstreetmap.org/way/1506836702', 'https://www.openstreetmap.org/way/162158150'],
        detail: 'The operator maps the lower and street entrance squares at the east end of HERBIS PLAZA ENT (ハービスPLAZA ENT). Takenaka describes the shared frontage voids and planted descents. The open edge is fitted south of the mapped surface footway. No additional vertical connection is inferred.'
    };
    const opening = [
        { x: 385.8, z: 859.8 }, { x: 396.4, z: 863.4 }, { x: 405.4, z: 864.7 },
        { x: 403.8, z: 871.4 }, { x: 393, z: 871 }, { x: 385.4, z: 866.7 }
    ];
    const atria: AtriumVoid[] = [{ id: plazaId, name: plazaName, openings: [{ level: ground, outline: opening }], evidence: plazaEvidence }];
    areas.push({
        id: plazaId, name: plazaName, level: b1, blockId: 'hanshin-west-b1',
        kind: 'public', label: false, outline: opening, evidence: plazaEvidence
    });
    apron(plazaId + '-street-edge', plazaName, 'hanshin-west-b1', ground,
        [{ x: 385.504, z: 855.149 }, { x: 394.427, z: 860.492 }, { x: 407.962, z: 862.485 }],
        3.9, plazaEvidence);
    facilities.push({ id: plazaId, name: plazaName, kind: 'entrance', level: b1, x: 395, z: 865, note: '', evidence: plazaEvidence });

    return { areas, connections, facilities, atria };
}
