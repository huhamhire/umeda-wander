import { messageText } from '../../i18n/index.ts';
import type { FloorArea, Point2, VerticalConnection, Evidence, Level } from '../../../domain/map/model.ts';
import type { StationPublicInterface } from '../../../domain/map/spatial-block.ts';
import { jrPublicAccessAnchors } from '../../stations/jr-osaka/public-access.ts';
import { passageOutline } from '../../../domain/map/geometry.ts';
import { elevatorDoorApproach } from '../../../application/connections/connection-openings.ts';

export const publicGroundLevel: Level = {
    id: 'district-ground',
    label: '1F',
    name: messageText('publicAreas.northAtrium.entities.districtGround.name'),
    y: 0,
    stackIndex: 0,
    description: '公共 B1 设备的地面落台；不归入车站付费区。'
};
const jrUrl = 'https://www.westjr.co.jp/global/en/timetable/pdf/station_osaka.pdf';
/** Public equipment belongs to the public block; no new walking route edges. */
export function createNorthPublicAccess(interfaces: StationPublicInterface[]) {
    const connections: VerticalConnection[] = [];
    const areas: FloorArea[] = [];
    const pad = (p: Point2, w = 6) => [
        { x: p.x - w / 2, z: p.z - w / 2 },
        { x: p.x + w / 2, z: p.z - w / 2 },
        { x: p.x + w / 2, z: p.z + w / 2 },
        { x: p.x - w / 2, z: p.z + w / 2 }
    ];
    const add = (
        id: string,
        kind: VerticalConnection['kind'],
        b1: Point2,
        ground: Point2,
        groundLevel: 'concourse' | 'district-ground',
        evidence: Evidence,
        blockId = 'north-atrium-b1'
    ) => {
        const c: VerticalConnection = {
            id,
            kind,
            blockId,
            evidence,
            from: { id: id + '-b1', level: 'district-underground', ...b1 },
            to: { id: id + '-ground', level: groundLevel, ...ground },
            ...(kind === 'elevator' ? { doorFacingRad: -31.65 * Math.PI / 180 } : {}),
        };
        connections.push(c);
        if (kind === 'elevator') {
            return c;
        }
        for (const n of [c.from, c.to]) {
            areas.push({
                id: n.id + ':landing',
                level: n.level,
                blockId,
                name: messageText('publicAreas.northAtrium.entranceLanding.name'),
                kind: 'public',
                outline: pad(n),
                height: .55,
                label: false,
                evidence
            });
        }
        return c;
    };
    const anchors = jrPublicAccessAnchors();
    const proof: Evidence = {
        source: 'jr',
        pages: [5, 6],
        urls: [jrUrl],
        detail: 'JR B1 North Gate plan: public escalators 75/76 and lift B connect the atrium/public ground side. Only topology and source references verified; metre positions and heights estimated.'
    };
    for (const bank of anchors.banks) {
        add('public-north-' + bank.reference, 'escalator', bank.b1, bank.ground, 'concourse', proof);
    }
    const northLift = add('public-north-lift-b', 'elevator', anchors.lift, anchors.lift, 'concourse', proof);
    areas.push({
        id: 'public-north-lift-ground-access',
        level: 'concourse',
        blockId: 'north-atrium-b1',
        name: messageText('publicAreas.northAtrium.entities.publicNorthLiftGroundAccess.name'),
        kind: 'public',
        label: false,
        outline: elevatorDoorApproach(northLift.to, northLift.doorFacingRad!, passageOutline(anchors.lift, anchors.liftGroundJoin, 5)),
        evidence: proof
    });
    add(
        'district-jr-metro-stairs',
        'stairs',
        anchors.metroStairs.b1,
        anchors.metroStairs.ground,
        'concourse',
        {
            source: 'district',
            pages: [1, 5, 6],
            urls: [
                jrUrl,
                'https://subway.osakametro.co.jp/station_guide/station/M16_%E6%A2%85%E7%94%B0_%E6%A7%8B%E5%86%85%E5%9B%B3.pdf'
            ],
            detail: 'JR Midosuji public exit and M16 central-west/JR entrance relation, cross-checked in operator diagrams. Landing geometry fitted; stairs do not certify an accessible transfer.'
        },
        'metro-interchange-b1'
    );
    // Preserve the existing public facility IDs/codes: from is JR ground, to is Metro B1.
    const metro = connections.find(c => c.id === 'district-jr-metro-stairs')!;
    [metro.from, metro.to] = [
        { ...metro.to, id: 'district-jr-metro-surface' },
        { ...metro.from, id: 'district-jr-metro-underground' }
    ];
    const gate = interfaces.find(p => p.gateId === 'umekita-gate')!;
    const normal = { x: (gate.outside.x - gate.inside.x) / 4, z: (gate.outside.z - gate.inside.z) / 4 };
    const at = (forward: number, side: number) => ({
        x: gate.outside.x + normal.x * forward - normal.z * side,
        z: gate.outside.z + normal.z * forward + normal.x * side
    });
    const umekitaProof: Evidence = {
        source: 'jr',
        pages: [8],
        urls: [jrUrl],
        detail: 'JR Umekita B1 public side shows unnumbered stairs/escalator and lift to above ground, separate from AD/AE and paid west link. Relative arrangement and dimensions estimated; no invented source equipment numbers.'
    };
    add('public-umekita-ground-escalator', 'escalator', at(8, -4), at(24, -4), 'district-ground', umekitaProof);
    add('public-umekita-ground-stairs', 'stairs', at(8, 0), at(24, 0), 'district-ground', umekitaProof);
    const groundLift = add('public-umekita-ground-lift', 'elevator', at(12, 6), at(12, 6), 'district-ground', umekitaProof);
    for (const [lift, stop] of [[northLift, northLift.from], [groundLift, groundLift.to]] as const) {
        areas.push({
            id: stop.id + ':landing',
            level: stop.level,
            blockId: lift.blockId,
            name: messageText('publicAreas.northAtrium.entranceLanding.name'),
            kind: 'public',
            outline: elevatorDoorApproach(stop, lift.doorFacingRad!),
            height: .55,
            label: false,
            evidence: lift.evidence
        });
    }
    return { connections, areas };
}
