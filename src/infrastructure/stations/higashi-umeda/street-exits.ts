import type { Point2, StationMap } from '../../../domain/map/model.ts';
import { passageOutline } from '../../../domain/map/geometry.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

/** Project the reviewed snapshot coordinates into district metres. */
const project = (lon: number, lat: number) => toGeographicPlan({ lon, lat }, geographicFrame);

/** Draw an apron around two landing mouths, including enough overlap for the equipment plates. */
function apron(from: Point2, to: Point2, width: number, margin = 1.3): Point2[] {
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    const dx = (to.x - from.x) * margin / length;
    const dz = (to.z - from.z) * margin / length;
    return passageOutline({ x: from.x - dx, z: from.z - dz }, { x: to.x + dx, z: to.z + dz }, width);
}

/** Keep the Whity Umeda (ホワイティうめだ) connections at their underground entrances. */
function calibrateWhityExits(station: StationMap): void {
    const { layout } = station;
    const direct = layout.connections.find(c => c.id === 'higashi-umeda-exit-1-stairs')!;
    layout.connections = layout.connections.filter(c => c !== direct);
    layout.areas = layout.areas.filter(a => a.id !== 'higashi-umeda-exit-1-ground');
    station.nodes = station.nodes.filter(n => n.id !== direct.from.id && n.id !== direct.to.id);
    const exit1 = station.facilities.find(f => f.id === 'higashi-umeda-exit-1')!;
    Object.assign(exit1, {
        name: messageText('stations.higashiUmeda.labels.basementEntrance', { number: 1 }),
        note: '',
        evidence: {
            ...exit1.evidence,
            urls: [...exit1.evidence.urls!, 'https://whity.osaka-chikagai.jp/index.php/access'],
            detail: 'Exit 1 is the direct underground connection to Whity Umeda (ホワイティうめだ). The separate Fukoku Seimei Building (富国生命ビル) lift is outside this connection.'
        }
    });

    const stair = layout.connections.find(c => c.id === 'higashi-umeda-exit-3-stairs')!;
    const upper = layout.areas.find(a => a.id === 'higashi-umeda-exit-3-ground')!;
    const branch = layout.areas.find(a => a.id === 'higashi-umeda-exit-3-arm')!;
    const exit3 = station.facilities.find(f => f.id === 'higashi-umeda-exit-3')!;
    Object.assign(stair.to, { level: stair.from.level, x: 758, z: 814.5, elevationOffset: 1.6 });
    stair.width = 3.3;
    stair.evidence = {
        ...stair.evidence,
        urls: [...stair.evidence.urls!, 'https://mcs-webcontents.s3.ap-northeast-1.amazonaws.com/contents/access_umeda_tanimachi_line.pdf'],
        detail: 'Exit 3 climbs toward the underground Whity Umeda and Diamor (ディアモール大阪) connection. The short flight axis, width and rise are display fits.'
    };
    branch.evidence = stair.evidence;
    Object.assign(exit3, {
        name: messageText('stations.higashiUmeda.labels.basementEntrance', { number: 3 }),
        note: '',
        evidence: stair.evidence
    });
    Object.assign(upper, {
        id: 'higashi-umeda-exit-3-upper-apron',
        level: stair.to.level,
        name: exit3.name,
        blockId: 'whity-b1',
        label: false,
        elevationOffset: stair.to.elevationOffset,
        outline: apron(stair.to, { x: 754, z: 816 }, 4.2),
        evidence: stair.evidence
    });
}

/** Calibrate the reviewed exits without borrowing the host buildings' street equipment. */
export function calibrateHigashiStreetExits(station: StationMap): void {
    calibrateWhityExits(station);
    const { layout, nodes, facilities } = station;
    const exit8 = layout.connections.find(c => c.id === 'higashi-umeda-exit-8-stairs')!;
    const arm8 = layout.areas.find(a => a.id === 'higashi-umeda-exit-8-arm')!;
    const facility8 = facilities.find(f => f.id === 'higashi-umeda-exit-8')!;
    Object.assign(exit8.from, { x: 777, z: 870 });
    Object.assign(exit8.to, project(135.4994294, 34.7001084), { level: arm8.level, elevationOffset: 2.2 });
    exit8.width = 3.4;
    exit8.evidence = {
        ...exit8.evidence,
        urls: [
            ...exit8.evidence.urls!,
            'https://www.city.osaka.lg.jp/zaisei/page/0000419949.html',
            'https://www.city.osaka.lg.jp/shimin/page/0000600984.html',
            'https://www.openstreetmap.org/node/5024365377'
        ],
        detail: 'Osaka City shows stairs and escalator access to the underground concourse toward Osaka Ekimae Building 4 (大阪駅前第4ビル). The F54 mapped point is a plan reference; flight direction, B1 rise and apron are fitted.'
    };
    const escalator = {
        ...exit8,
        id: 'higashi-umeda-exit-8-escalator',
        kind: 'escalator' as const,
        width: 1.75,
        from: { ...exit8.from, id: 'higashi-umeda-exit-8-escalator-b1', x: exit8.from.x + 2.4, z: exit8.from.z + 1.6 },
        to: { ...exit8.to, id: 'higashi-umeda-exit-8-escalator-upper', x: exit8.to.x + 2.4, z: exit8.to.z + 1.6 }
    };
    nodes.push(escalator.from, escalator.to);
    layout.connections.push(escalator);
    Object.assign(facility8, {
        x: exit8.from.x,
        z: exit8.from.z,
        name: messageText('stations.higashiUmeda.labels.basementEntrance', { number: 8 }),
        evidence: exit8.evidence
    });
    arm8.outline = apron({ x: 762, z: 871.5 }, escalator.from, 5);
    arm8.evidence = exit8.evidence;
    const upper8 = layout.areas.find(a => a.id === 'higashi-umeda-exit-8-ground')!;
    Object.assign(upper8, {
        id: 'higashi-umeda-exit-8-upper-apron',
        level: arm8.level,
        blockId: 'whity-b1',
        elevationOffset: exit8.to.elevationOffset,
        outline: apron(exit8.to, escalator.to, 3.2),
        evidence: exit8.evidence
    });

    const exit9 = layout.connections.find(c => c.id === 'higashi-umeda-exit-9-stairs')!;
    const arm9 = layout.areas.find(a => a.id === 'higashi-umeda-exit-9-arm')!;
    const ground9 = layout.areas.find(a => a.id === 'higashi-umeda-exit-9-ground')!;
    const facility9 = facilities.find(f => f.id === 'higashi-umeda-exit-9')!;
    const lower = { ...exit9.from, id: 'higashi-umeda-exit-9-lower-b1', ...project(135.499249, 34.7002957) };
    const turn = { ...lower, id: 'higashi-umeda-exit-9-turn-in', ...project(135.4991687, 34.700277), elevationOffset: 4 };
    Object.assign(exit9.from, project(135.4991625, 34.7002945), { elevationOffset: turn.elevationOffset });
    Object.assign(exit9.to, project(135.4992444, 34.700314));
    exit9.width = 1.75;
    exit9.evidence = {
        ...exit9.evidence,
        urls: [
            ...exit9.evidence.urls!,
            'https://mcs-webcontents.s3.ap-northeast-1.amazonaws.com/contents/access_umeda_tanimachi_line.pdf',
            'https://www.openstreetmap.org/node/5024365378',
            'https://www.openstreetmap.org/way/1329514174',
            'https://www.openstreetmap.org/way/619026238'
        ],
        detail: 'The street stair beside Osaka Ekimae Building 4 (大阪駅前第4ビル) is mapped in OSM as exit 9 with two opposed flights, a cross landing and a roof. Rise and flight widths are fitted.'
    };
    nodes.push(lower, turn);
    layout.connections.push({ ...exit9, id: 'higashi-umeda-exit-9-lower-stairs', from: lower, to: turn });
    Object.assign(facility9, { x: lower.x, z: lower.z, evidence: exit9.evidence });
    arm9.outline = apron(lower, { x: 750.5, z: 856.9 }, 3.5);
    arm9.evidence = exit9.evidence;
    ground9.outline = apron(exit9.to, { x: 757.4, z: 854.8 }, 3.4);
    ground9.evidence = exit9.evidence;
    layout.areas.push({
        ...arm9,
        id: 'higashi-umeda-exit-9-switchback-landing',
        blockId: 'whity-b1',
        elevationOffset: turn.elevationOffset,
        outline: apron(turn, exit9.from, 2.4),
        label: false
    });
    layout.canopies = [{
        id: 'higashi-umeda-exit-9-canopy',
        level: exit9.to.level,
        points: [project(135.4991673, 34.7002958), project(135.4992450, 34.7003132)],
        width: 2.8,
        clearHeight: 2.9,
        evidence: exit9.evidence
    }];
}
