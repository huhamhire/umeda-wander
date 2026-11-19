import { messageText } from '../../i18n/index.ts';
import type { AtriumVoid, Evidence, Facility, FloorArea, LevelId, RouteNode, VerticalConnection } from '../../../domain/map/model.ts';
import { passageOutline } from '../../../domain/map/geometry.ts';

/**
 * Attach JR plan pages and interpretation limits to an upper-level connection.
 */
const evidence = (pages: number[], detail: string): Evidence => ({ pages, detail });
/**
 * Construct a local landing rectangle from its centre, width and depth.
 */
const rect = (x: number, z: number, w: number, d: number) => [
    { x: x - w / 2, z: z - d / 2 },
    { x: x + w / 2, z: z - d / 2 },
    { x: x + w / 2, z: z + d / 2 },
    { x: x - w / 2, z: z + d / 2 }
];
export const northAtrium: AtriumVoid = {
    id: 'north-atrium-void',
    name: messageText('stations.jrOsaka.entities.northAtriumVoid.name'),
    openings: [
        { level: 'platform', outline: rect(-0.5, -48.5, 21, 21) },
        { level: 'bridge', outline: rect(-0.5, -54, 26, 10) }
    ],
    evidence: evidence(
        [2, 3, 5],
        'Shared open atrium between LUCUA wings, banks 2/3 and 47/48 on exterior floor edges; clear dimensions schematic'
    )
};
/** Matched diagram IDs on PDF pages 2–5; dimensions remain schematic. */
export function refineUpperLevelLinks(areas: FloorArea[], connections: VerticalConnection[], facilities: Facility[]): void {
    const area = (id: string, level: LevelId, name: string, x: number, z: number, w: number, d: number, label = false) => {
        areas.push({
            id,
            level,
            name,
            kind: 'paid',
            outline: rect(x, z, w, d),
            label,
            evidence: evidence([3, 4], 'Mezzanine passage and its separate platform access branches')
        });
    };
    const link = (
        id: string,
        kind: VerticalConnection['kind'],
        from: Omit<RouteNode, 'id'>,
        to: Omit<RouteNode, 'id'>,
        pages: number[],
        detail: string
    ) => {
        const connection: VerticalConnection = {
            id,
            kind,
            from: { id: `${id}-lower`, ...from },
            to: { id: `${id}-upper`, ...to },
            evidence: evidence(pages, detail)
        };
        connections.push(connection);
        return connection;
    };
    // 51 reaches the half-height passage; 17–31 are separate short flights to 2F.
    areas.find(a => a.id === 'sakurabashi-mezz')!.outline = rect(-48, -4, 5, 57);
    areas.find(a => a.id === 'mezz-link')!.outline = rect(-36.5, 21, 28, 6);
    area('mezz-north-arm', 'mezzanine', messageText('stations.jrOsaka.areas.mezzNorthArm.name'), -30, -30, 16, 5);
    area(
        'mezz-south-finger',
        'mezzanine',
        messageText('stations.jrOsaka.areas.mezzSouthFinger.name'),
        -38,
        26,
        5,
        14
    );
    area(
        'mezz-central-south-arm',
        'mezzanine',
        messageText('stations.jrOsaka.areas.mezzCentralSouthArm.name'),
        -21,
        30,
        14,
        6
    );
    link(
        'sakura-stairs-51',
        'stairs',
        { level: 'concourse', x: -48, z: 30 },
        { level: 'mezzanine', x: -48, z: 23 },
        [4, 5],
        '51: Sakurabashi 1F to mezzanine only, not directly to a platform'
    );
    const stairs = [
        [17, -48, -42, -30],
        [20, -48, -42, -18],
        [22, -48, -42, -6],
        [24, -48, -42, 6],
        [26, -50, -56, 18],
        [27, -46, -40, 18],
        [29, -38, -44, 30],
        [21, -25, -31, -18],
        [23, -25, -31, -6],
        [25, -25, -31, 6],
        [28, -25, -31, 18],
    ];
    for (const [id, fromX, toX, z] of stairs) {
        link(
            `mezz-stairs-${id}`,
            'stairs',
            { level: 'mezzanine', x: fromX!, z: z! },
            { level: 'platform', x: toX!, z: z! },
            [3, 4],
            `${id}: short mezzanine-to-platform flight, separate from the opposite passage bank`
        );
    }
    for (const [id, fromX, toX, z] of [[18, -35, -29, -30], [19, -25, -19, -30], [30, -25, -31, 30], [31, -19, -13, 30]]) {
        link(
            `mezz-escalator-${id}`,
            'escalator',
            { level: 'mezzanine', x: fromX!, z: z! },
            { level: 'platform', x: toX!, z: z! },
            [3, 4],
            `${id}: mezzanine-to-platform escalator`
        );
    }
    const sakura = facilities.find(f => f.id === 'mezz-sakura')!;
    Object.assign(sakura, { x: -48, z: 0, note: '51 号楼梯先到 M2F 夹层，再沿通道选择各站台的独立短楼梯。与中央口夹层通过南端横向联络段连接，坐标为示意。' });
    // A free-standing atrium bank arrives at the outside edge of the upper slab.
    const northPad: FloorArea = {
        id: 'north-atrium-lower-landing',
        level: 'platform',
        name: messageText('stations.jrOsaka.entities.northAtriumLowerLanding.name'),
        kind: 'public',
        label: true,
        outline: rect(-.5, -63.5, 26, 9),
        railings: true,
        evidence: evidence(
            [2, 3],
            'North Gate Building 2F Atrium Plaza extends under the north entrance canopy to the Grand Front Osaka (グランフロント大阪) approach; outline is fitted.'
        )
    };
    areas.push(northPad);
    areas.find(a => a.id === 'north-2f-public')!.label = false;
    for (const [id, x] of [['west', -12], ['east', 11]] as const) {
        areas.push({
            id: `north-atrium-${id}-gallery`,
            level: 'platform',
            name: messageText('stations.jrOsaka.areas.northAtriumSideGallery.name'),
            kind: 'public',
            outline: rect(x, -53, 2, 12),
            railings: true,
            evidence: northAtrium.evidence
        });
    }
    for (const [id, x] of [['north-47', -0.5], ['north-48', 9]] as const) {
        const c = connections.find(c => c.id === id)!;
        Object.assign(c.from, { x, z: -42 });
        Object.assign(c.to, { x, z: -59 });
        c.placement = 'exterior';
        c.evidence = evidence(
            [3, 5],
            '47/48: open atrium ascent to north-side 2F platform edge, no individual enclosed floor well'
        );
    }
    for (const [id, kind, x] of [['north-2', 'escalator', -5], ['north-2-stairs', 'stairs', -10], ['north-3', 'escalator', 3]] as const) {
        const connection = link(
            id,
            kind,
            { level: 'platform', x, z: -59 },
            { level: 'bridge', x, z: -49 },
            [2, 3],
            'North atrium outside-edge 2F/3F connection; no interior slab well'
        );
        connection.placement = 'exterior';
    }
    const tokiAccess = link(
        'north-toki-escalator',
        'escalator',
        { level: 'bridge', x: 2, z: -40 },
        { level: 'jr-toki-plaza', x: 2, z: -57 },
        [],
        'Osaka Station City 3F guide marks the escalator to Toki no Hiroba (時空の広場) on 5F. The northward flight and upper platform are schematic.'
    );
    tokiAccess.placement = 'exterior';
    tokiAccess.evidence = {
        ...tokiAccess.evidence,
        source: 'jr',
        urls: ['https://osakastationcity.com/guide/', 'https://osakastationcity.com/green/toki/']
    };
    areas.push({
        id: 'north-atrium-toki-landing',
        level: 'jr-toki-plaza',
        name: messageText('stations.jrOsaka.entities.tokiPlaza.name'),
        kind: 'public',
        outline: rect(2, -58, 8, 4),
        railings: true,
        evidence: tokiAccess.evidence
    });
    facilities.push({
        id: 'bridge-north-information',
        name: messageText('stations.jrOsaka.facilities.bridgeNorthInformation.name'),
        kind: 'information',
        level: 'bridge',
        x: -8,
        z: -42,
        note: 'OSC 问讯台位于 3F 南北联络桥北端的公共走道。',
        evidence: {
            source: 'jr',
            pages: [2],
            urls: ['https://osakastationcity.com/guide/information/'],
            detail: 'Osaka Station City Information is at the north end of the public North-South Bridge. Counter dimensions and its precise placement are fitted.'
        }
    });
    // Station 2F corresponds to South Gate building 3F; the bridge reaches building 4F.
    // Keep building names explicit instead of renumbering station floors globally.
    areas.find(a => a.id === 'bridge-south')!.outline = rect(-7.5, 41.5, 35, 13);
    const southArea = (id: string, level: LevelId, name: string, outline: FloorArea['outline']) => {
        areas.push({
            id,
            level,
            name,
            kind: 'public',
            outline,
            label: true,
            evidence: evidence(
                [2, 3, 4],
                'South Gate building floor labels differ from station floor labels; simplified public approach only'
            )
        });
    };
    southArea(
        'south-building-2f',
        'mezzanine',
        messageText('stations.jrOsaka.areas.southBuildingEntrance.name'),
        rect(4, 59, 58, 22)
    );
    southArea(
        'south-building-3f',
        'platform',
        messageText('stations.jrOsaka.areas.daimaruEntrance.name'),
        rect(4, 59, 58, 22)
    );
    southArea(
        'south-building-3f-lift-bay',
        'platform',
        messageText('stations.jrOsaka.areas.southLiftLobby.name'),
        rect(-21, 47, 7, 14)
    );
    southArea(
        'south-building-4f',
        'bridge',
        messageText('stations.jrOsaka.areas.southBridgeBoundary.name'),
        rect(24, 60, 20, 12)
    );
    southArea(
        'south-bridge-4f-link',
        'bridge',
        messageText('stations.jrOsaka.labels.southBridgeConnection'),
        passageOutline({ x: 3, z: 44 }, { x: 20, z: 56 }, 5)
    );
    link(
        'south-15',
        'escalator',
        { level: 'platform', x: -2, z: 56 },
        { level: 'bridge', x: -8, z: 48 },
        [2, 3],
        '15: diagonal exterior flight from South Gate public entrance to the bridge edge'
    ).placement = 'exterior';
    link(
        'south-stairs-16',
        'stairs',
        { level: 'platform', x: -9, z: 56 },
        { level: 'bridge', x: -15, z: 48 },
        [2, 3],
        '16: diagonal exterior stairs parallel to 15, open to the public entrance'
    ).placement = 'exterior';
    const lift = link(
        'south-lift-i',
        'elevator',
        { level: 'platform', x: -21, z: 44 },
        { level: 'bridge', x: -21, z: 44 },
        [2, 3],
        'I: South Gate building 3F to bridge public approach'
    );
    lift.doorFacingRad = Math.PI / 2;
    link(
        'south-building-50',
        'escalator',
        { level: 'mezzanine', x: 16, z: 63 },
        { level: 'platform', x: 16, z: 56 },
        [3, 4],
        '50: South Gate building 2F to 3F'
    );
    const t = link(
        'south-lift-t',
        'elevator',
        { level: 'mezzanine', x: 25, z: 62 },
        { level: 'platform', x: 25, z: 62 },
        [3, 4],
        'T: South Gate building 2F to 3F'
    );
    t.doorFacingRad = -Math.PI / 2;
    // 61 and U join the existing small raised 1F entrance to the building's next floor.
    link(
        'south-building-61',
        'escalator',
        {
            level: 'concourse',
            x: 0,
            z: 55,
            elevationOffset: 1.3
        },
        { level: 'mezzanine', x: 0, z: 61 },
        [4, 5],
        '61: South Gate Plaza 1F to building 2F; local 1F rise schematic'
    );
    const u = link(
        'south-lift-u',
        'elevator',
        {
            level: 'concourse',
            x: -5,
            z: 55,
            elevationOffset: 1.3
        },
        { level: 'mezzanine', x: -5, z: 55 },
        [4, 5],
        'U: South Gate Plaza 1F to building 2F'
    );
    u.doorFacingRad = 0;
    for (const [id, name, kind, level, x, z, detail] of [
        [
            'sakura-access-51',
            messageText('stations.jrOsaka.items.sakuraAccess51.name'),
            'stairs',
            'concourse',
            -48,
            30,
            '先上 M2F 夹层，再沿通道选择站台短楼梯。'
        ],
        [
            'south-bridge-access',
            messageText('stations.jrOsaka.items.southBridgeAccess.name'),
            'entrance',
            'bridge',
            -8,
            42,
            '15/16 及 I 直梯连接南门大楼 3F；旁侧连廊通往大楼 4F。大楼楼层与车站楼层分别标注。'
        ],
        [
            'south-building-3f-entry',
            messageText('stations.jrOsaka.items.southBuilding3fEntry.name'),
            'entrance',
            'platform',
            0,
            59,
            '位于车站 2F 站台标高附近，与 3F 联络桥以 15/16/I 连接；不代表商场内部已完整建模。'
        ],
    ] as const) {
        facilities.push({
            id,
            name,
            kind,
            level,
            x,
            z,
            note: detail,
            evidence: evidence([2, 3, 4, 5], 'Matched public approach and mezzanine connections')
        });
    }
}
