import type { Evidence, FloorArea, Point2, StationMap, VerticalConnection } from '../../../domain/map/model.ts';
import { passageOutline } from '../../../domain/map/geometry.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { elevatorDoorApproach } from '../../../application/connections/connection-openings.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

/** Project reviewed entrance and roof points from the OSM snapshot into district metres. */
const project = (lon: number, lat: number) => toGeographicPlan({ lon, lat }, geographicFrame);

/** Place a reference point a signed distance along the stair axis away from the opposite end. */
function extend(end: Point2, opposite: Point2, distance: number): Point2 {
    const dx = end.x - opposite.x;
    const dz = end.z - opposite.z;
    const length = Math.hypot(dx, dz);
    return { x: end.x + dx / length * distance, z: end.z + dz / length * distance };
}

/** Locate public stair mouths and the mapped roofs without inventing links to the paid hall. */
export function calibrateNishiStreetExits(station: StationMap): void {
    const { layout, nodes, facilities } = station;
    const canopies: NonNullable<typeof layout.canopies> = [];
    for (const exit of [
        {
            key: '1',
            node: '12183322171',
            footprint: '1316299648',
            top: project(135.4959961, 34.7011259),
            foot: { x: 447.5, z: 771.6 },
            publicApproach: { x: 436.6, z: 788.2 },
            width: 2.7,
            detail: 'C12 entrance on the north public passage towards Osaka Station (大阪駅).'
        },
        {
            key: '4-B',
            node: '5024365394',
            top: project(135.4953178, 34.6996132),
            foot: { x: 386, z: 933.4 },
            width: 2.45,
            roof: {
                way: '618802435',
                points: [project(135.4952427, 34.6996150), project(135.4953178, 34.6996132)],
                width: 2.8
            },
            detail: 'Hilton Plaza West (ヒルトンプラザウエスト) entrance and compact street roof.'
        },
        {
            key: '5',
            node: '5340837790',
            footprint: '992368846',
            top: project(135.4954599, 34.7009293),
            foot: { x: 419, z: 785.2 },
            publicApproach: { x: 430, z: 784.2 },
            width: 3,
            detail: 'C7 entrance on the north public passage towards Osaka Station (大阪駅).'
        },
        {
            key: '6',
            node: '2299299144',
            top: project(135.4958847, 34.7000808),
            foot: { x: 436.7, z: 883.8 },
            width: 3,
            detail: 'C30 entrance on the Yoshimoto Building (吉本ビルディング) side, separate from its hydraulic lift.'
        },
        {
            key: '9',
            node: '5024365386',
            top: project(135.4950114, 34.6982437),
            foot: { x: 378.4, z: 1084.8 },
            width: 3.15,
            detail: 'C57 entrance on the Kansai Electric Power Realty Nishi-Umeda Building (関電不動産西梅田ビル) boundary.'
        },
        {
            key: '10',
            node: '2293280516',
            top: project(135.4952299, 34.6986635),
            foot: { x: 397.8, z: 1034.7 },
            width: 2.9,
            roof: {
                way: '618802434',
                points: [project(135.4953347, 34.6987050), project(135.4952299, 34.6986635)],
                width: 4
            },
            detail: 'C49 entrance by the northwest corner of Sakurabashi crossing (桜橋交差点), with a mapped roof.'
        }
    ]) {
        const prefix = 'nishi-umeda-exit-' + exit.key;
        const facility = facilities.find(f => f.id === prefix);
        const evidence: Evidence = {
            source: 'yotsubashi',
            pages: [1],
            urls: [
                ...(exit.footprint
                    ? [
                        'https://subway.osakametro.co.jp/cn/station_guide/Y/Y11/map.php',
                        'https://subway.osakametro.co.jp/station_guide/station/Y11_%E8%A5%BF%E6%A2%85%E7%94%B0_%E6%A7%8B%E5%86%85%E5%9B%B3.pdf',
                        'https://ekitan.com/sta-info/station/5737/exit',
                        'https://www.openstreetmap.org/way/' + exit.footprint
                    ]
                    : facility!.evidence.urls!),
                'https://www.openstreetmap.org/node/' + exit.node,
                ...(exit.roof ? ['https://www.openstreetmap.org/way/' + exit.roof.way] : [])
            ],
            detail: exit.detail + ' The upper mouth follows OSM; the lower landing, stair axis, width and intermediate landing are fitted.' +
                (exit.publicApproach ? ' The station guide shows the foot of the stair opening onto the JR Osaka B1 public passage. Its local approach is fitted.' : '')
        };
        let connection = layout.connections.find(c => c.id === prefix + '-stairs');
        if (!connection) {
            connection = {
                id: prefix + '-stairs',
                kind: 'stairs',
                from: { id: prefix + '-low', level: 'y11-hall', ...exit.foot },
                to: { id: prefix + '-high', level: 'y11-ground', ...exit.top },
                evidence
            };
            nodes.push(connection.from, connection.to);
            layout.connections.push(connection);
        }
        Object.assign(connection.from, exit.foot);
        Object.assign(connection.to, exit.top);
        Object.assign(connection, { evidence, width: exit.width, stairLandingLength: 1.65 });
        const name = facility?.name ?? messageText('stations.nishiUmeda.labels.streetEntrance', { key: exit.key });
        if (facility) {
            Object.assign(facility, { ...exit.foot, evidence, note: '' });
        }
        else {
            facilities.push({ id: prefix, kind: 'entrance', level: connection.from.level, name, ...exit.foot, evidence, note: '' });
        }
        const oldFloors = new Set([prefix + '-arm', prefix + '-ground', prefix + '-public']);
        layout.areas = layout.areas.filter(a => !oldFloors.has(a.id));
        for (const [stop, opposite, suffix] of [
            [connection.from, connection.to, 'arm'],
            [connection.to, connection.from, 'ground']
        ] as const) {
            const approach = suffix === 'arm' ? exit.publicApproach : undefined;
            layout.areas.push({
                id: prefix + '-' + suffix,
                level: stop.level,
                kind: 'public',
                name,
                outline: passageOutline(extend(stop, opposite, -.55), approach ?? extend(stop, opposite, 3.9), exit.width + 1.4),
                label: false,
                evidence
            });
        }
        if (exit.roof) {
            canopies.push({
                id: prefix + '-canopy',
                level: connection.to.level,
                points: exit.roof.points,
                width: exit.roof.width,
                clearHeight: 2.9,
                evidence
            });
        }
    }
    layout.canopies = canopies;
    calibrateNorthLift(station);
}

/** Align the concourse, B1 and street stops of the same 4-A lift beside Herbis ENT (ハービスENT). */
function calibrateNorthLift(station: StationMap): void {
    const { layout, facilities } = station;
    const upper = layout.connections.find(c => c.id === 'nishi-umeda-street-lift')!;
    const facility = facilities.find(f => f.id === 'nishi-umeda-exit-4-A')!;
    const center = project(135.4955390, 34.7002199);
    const east = Math.atan2(866.39 - center.z, 424.84 - center.x);
    const evidence: Evidence = {
        ...upper.evidence,
        urls: [
            ...upper.evidence.urls!,
            'https://www.openstreetmap.org/node/2299297072',
            'https://www.openstreetmap.org/way/1316049306',
            'https://www.openstreetmap.org/way/1322885747'
        ],
        detail: 'The operator plan identifies the 4-A lift serving the north concourse, B1 and street. OSM fixes the shaft and approach sides. The underground stop separation and door dimensions are fitted.'
    };
    const concourse = { ...upper.from, id: 'nishi-umeda-4-a-concourse', ...center };
    Object.assign(upper.from, center, { elevationOffset: 2.4 });
    Object.assign(upper.to, center);
    Object.assign(upper, { doorFacingRad: east + Math.PI, reverseLowerDoor: true, evidence });
    const lower: VerticalConnection = {
        ...upper,
        id: 'nishi-umeda-4-a-lift-lower',
        from: concourse,
        to: upper.from,
        doorFacingRad: east,
        reverseLowerDoor: false
    };
    station.nodes.push(concourse);
    layout.connections.push(lower);
    Object.assign(facility, {
        x: center.x + 2 * Math.cos(east),
        z: center.z + 2 * Math.sin(east),
        evidence,
        note: ''
    });
    layout.areas = layout.areas.filter(a => a.id !== 'nishi-umeda-street-lift-ground' && a.id !== 'nishi-umeda-exit-4-A-public');
    for (const [id, stop, facing] of [
        ['nishi-umeda-exit-4-a-concourse-approach', lower.from, east],
        ['nishi-umeda-exit-4-a-b1-approach', lower.to, east],
        ['nishi-umeda-street-lift-ground', upper.to, east + Math.PI]
    ] as const) {
        const landing: FloorArea = {
            id,
            level: stop.level,
            blockId: 'hanshin-west-b1',
            kind: 'public',
            name: facility.name,
            outline: elevatorDoorApproach(stop, facing),
            elevationOffset: stop.elevationOffset,
            label: false,
            evidence
        };
        layout.areas.push(landing);
    }
}
