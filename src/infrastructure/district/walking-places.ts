import type { WalkingPlace } from '../../application/navigation/walking-route.ts';
import type { Facility, FacilityKind, RouteNode } from '../../domain/map/model.ts';
import { messageText, type MessageKey } from '../i18n/index.ts';
import { edges, facilities, levels, nodes, stations } from './geographic-map.ts';

interface PlaceDefinition {
    node: string;
    access: WalkingPlace['access'];
    facility?: string;
    gateApproach?: true;
    caption?: MessageKey;
    kind?: FacilityKind;
}

/** Bind only authored graph endpoints and exact facility anchors. */
const definitions: PlaceDefinition[] = [
    { node: 'entry', access: 'outside', facility: 'entry' },
    { node: 'hall', access: 'outside', caption: 'ui.walking.concourse' },
    { node: 'gate-out', access: 'outside', facility: 'gate', gateApproach: true },
    { node: 'central-north-gate-out', access: 'outside', facility: 'gate-central-north', gateApproach: true },
    { node: 'west-entry', access: 'outside', facility: 'west-gate', gateApproach: true },
    { node: 'gate-in', access: 'inside', caption: 'ui.walking.insidePassage', kind: 'gate' },
    { node: 'lower', access: 'inside', facility: 'escalator' },
    { node: 'upper', access: 'inside', facility: 'connection-central-34-to' },
    { node: 'destination', access: 'inside', facility: 'platform' },
    { node: 'crost68-1', access: 'outside', facility: 'connection-crost-stairs-68-from' },
    { node: 'crost68-b1', access: 'outside', facility: 'connection-crost-stairs-68-to' },
    { node: 'hankyu-umeda-route-entry', access: 'outside', facility: 'hankyu-umeda-entry' },
    { node: 'hankyu-umeda-public-rise-lower', access: 'outside', facility: 'connection-hankyu-umeda-public-rise-from' },
    { node: 'hankyu-umeda-public-rise-upper', access: 'outside', facility: 'connection-hankyu-umeda-public-rise-to' },
    { node: 'hankyu-umeda-gate-out', access: 'outside', caption: 'ui.walking.outsidePassage', kind: 'gate' },
    { node: 'hankyu-umeda-central-1-lower', access: 'inside', facility: 'hankyu-umeda-escalator' },
    { node: 'hankyu-umeda-central-1-upper', access: 'inside', facility: 'connection-hankyu-umeda-central-bank-1-to' },
    { node: 'hankyu-umeda-destination', access: 'inside', facility: 'hankyu-umeda-kyoto-platform' },
    { node: 'metro-umeda-route-entry', access: 'outside', caption: 'ui.walking.concourse' },
    { node: 'metro-umeda-A-hall', access: 'inside', facility: 'connection-metro-umeda-rise-A-to' },
    { node: 'metro-umeda-A-transfer', access: 'inside', facility: 'connection-metro-umeda-rise-A-from' },
    { node: 'metro-umeda-A-middle', access: 'inside', facility: 'connection-metro-umeda-bank-A-to' },
    { node: 'metro-umeda-A-platform', access: 'inside', facility: 'metro-umeda-stairs' },
    { node: 'metro-umeda-destination', access: 'inside', caption: 'ui.walking.platform', kind: 'platform' },
    { node: 'hanshin-umeda-route-entry', access: 'outside', facility: 'hanshin-umeda-west-entry' },
    { node: 'hanshin-umeda-hanshin-umeda-platform-12-escalator-low', access: 'inside', facility: 'connection-hanshin-umeda-hanshin-umeda-platform-12-escalator-from' },
    { node: 'hanshin-umeda-hanshin-umeda-platform-12-escalator-high', access: 'inside', facility: 'connection-hanshin-umeda-hanshin-umeda-platform-12-escalator-to' },
    { node: 'hanshin-umeda-destination', access: 'inside', caption: 'ui.walking.platform', kind: 'platform' },
    { node: 'higashi-umeda-route-entry', access: 'outside', caption: 'ui.walking.concourse' },
    { node: 'higashi-umeda-south-escalator-low', access: 'inside', facility: 'connection-higashi-umeda-south-escalator-from' },
    { node: 'higashi-umeda-south-escalator-high', access: 'inside', facility: 'connection-higashi-umeda-south-escalator-to' },
    { node: 'higashi-umeda-destination', access: 'inside', caption: 'ui.walking.platform', kind: 'platform' },
    { node: 'nishi-umeda-route-entry', access: 'outside', caption: 'ui.walking.middleGateOutside', kind: 'gate' },
    { node: 'nishi-umeda-north-route-out', access: 'outside', caption: 'ui.walking.northGateOutside', kind: 'gate' },
    { node: 'nishi-umeda-south-route-out', access: 'outside', caption: 'ui.walking.southGateOutside', kind: 'gate' },
    { node: 'nishi-umeda-middle-stairs-low', access: 'inside', facility: 'connection-nishi-umeda-middle-stairs-from' },
    { node: 'nishi-umeda-middle-stairs-high', access: 'inside', facility: 'connection-nishi-umeda-middle-stairs-to' },
    { node: 'nishi-umeda-destination', access: 'inside', caption: 'ui.walking.platform', kind: 'platform' },
    { node: 'kitashinchi-route-entry', access: 'outside', caption: 'ui.walking.westGateOutside', kind: 'gate' },
    { node: 'kitashinchi-west-escalators-low', access: 'inside', facility: 'connection-kitashinchi-west-escalators-from' },
    { node: 'kitashinchi-west-escalators-high', access: 'inside', facility: 'connection-kitashinchi-west-escalators-to' },
    { node: 'kitashinchi-destination', access: 'inside', caption: 'ui.walking.platform', kind: 'platform' }
];

/** Verify that the graph enters this gate at its modeled center from the named approach. */
function approachesGate(node: RouteNode, facility: Facility): boolean {
    return edges.some(edge => {
        if (edge.kind !== 'gate' || edge.from !== node.id) {
            return false;
        }
        const inside = nodes.find(candidate => candidate.id === edge.to)!;
        const dx = inside.x - node.x;
        const dz = inside.z - node.z;
        const x = facility.x - node.x;
        const z = facility.z - node.z;
        const t = (x * dx + z * dz) / (dx * dx + dz * dz);
        return t > 0 && t < 1 && Math.hypot(x - t * dx, z - t * dz) < .1;
    });
}

/** Resolve place names and verify each anchor or explicitly modeled gate approach. */
export function walkingPlaces(): WalkingPlace[] {
    const linked = new Set(edges.flatMap(edge => [edge.from, edge.to]));
    return definitions.map(def => {
        const node = nodes.find(item => item.id === def.node);
        const owner = levels.find(level => level.id === node?.level)?.station;
        const station = stations.find(item => item.id === owner);
        const facility = facilities.find(item => item.id === def.facility);
        if (!node || !station || !linked.has(node.id) || def.facility && (!facility || facility.level !== node.level ||
            Math.abs((facility.elevationOffset ?? 0) - (node.elevationOffset ?? 0)) >= .1 ||
            (def.gateApproach
                ? facility.kind !== 'gate' || !approachesGate(node, facility)
                : Math.hypot(facility.x - node.x, facility.z - node.z) >= .1))) {
            throw new Error(`Invalid walking place: ${def.node}`);
        }
        return {
            id: node.id,
            level: node.level,
            station: station.id,
            access: def.access,
            name: facility?.name ?? `${station.name} · ${messageText(def.caption!)}`,
            kind: facility?.kind ?? def.kind,
            facilityId: facility?.id
        };
    });
}
