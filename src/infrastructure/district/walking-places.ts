import type { WalkingPlace } from '../../application/navigation/walking-route.ts';
import type { FacilityKind } from '../../domain/map/model.ts';
import { messageText, type MessageKey } from '../i18n/index.ts';
import { edges, facilities, levels, nodes } from './geographic-map.ts';

interface PlaceDefinition {
    node: string;
    access: WalkingPlace['access'];
    facility?: string;
    caption?: MessageKey;
    kind?: FacilityKind;
}

/** Bind only authored graph endpoints and exact facility anchors. */
const definitions: PlaceDefinition[] = [
    { node: 'entry', access: 'outside', facility: 'entry' },
    { node: 'hall', access: 'outside', caption: 'ui.walking.concourse' },
    { node: 'gate-out', access: 'outside', caption: 'ui.walking.outsidePassage', kind: 'gate' },
    { node: 'gate-in', access: 'inside', caption: 'ui.walking.insidePassage', kind: 'gate' },
    { node: 'lower', access: 'inside', facility: 'escalator' },
    { node: 'destination', access: 'inside', facility: 'platform' },
    { node: 'hankyu-umeda-route-entry', access: 'outside', facility: 'hankyu-umeda-entry' },
    { node: 'hankyu-umeda-public-rise-upper', access: 'outside', facility: 'connection-hankyu-umeda-public-rise-to' },
    { node: 'hankyu-umeda-gate-out', access: 'outside', caption: 'ui.walking.outsidePassage', kind: 'gate' },
    { node: 'hankyu-umeda-destination', access: 'inside', facility: 'hankyu-umeda-kyoto-platform' },
    { node: 'metro-umeda-route-entry', access: 'outside', caption: 'ui.walking.concourse' },
    { node: 'metro-umeda-destination', access: 'inside', caption: 'ui.walking.platform', kind: 'platform' },
    { node: 'hanshin-umeda-route-entry', access: 'outside', facility: 'hanshin-umeda-west-entry' },
    { node: 'hanshin-umeda-destination', access: 'inside', caption: 'ui.walking.platform', kind: 'platform' },
    { node: 'higashi-umeda-route-entry', access: 'outside', caption: 'ui.walking.concourse' },
    { node: 'higashi-umeda-destination', access: 'inside', caption: 'ui.walking.platform', kind: 'platform' },
    { node: 'nishi-umeda-route-entry', access: 'outside', caption: 'ui.walking.middleGateOutside', kind: 'gate' },
    { node: 'nishi-umeda-north-route-out', access: 'outside', caption: 'ui.walking.northGateOutside', kind: 'gate' },
    { node: 'nishi-umeda-south-route-out', access: 'outside', caption: 'ui.walking.southGateOutside', kind: 'gate' },
    { node: 'nishi-umeda-destination', access: 'inside', caption: 'ui.walking.platform', kind: 'platform' },
    { node: 'kitashinchi-route-entry', access: 'outside', caption: 'ui.walking.westGateOutside', kind: 'gate' },
    { node: 'kitashinchi-destination', access: 'inside', caption: 'ui.walking.platform', kind: 'platform' }
];

/** Resolve localized place names and verify the authored graph and optional facility references. */
export function walkingPlaces(): WalkingPlace[] {
    const linked = new Set(edges.flatMap(edge => [edge.from, edge.to]));
    return definitions.map(def => {
        const node = nodes.find(item => item.id === def.node);
        const station = levels.find(level => level.id === node?.level)?.station;
        const facility = facilities.find(item => item.id === def.facility);
        if (!node || !station || !linked.has(node.id) || def.facility && (!facility || facility.level !== node.level ||
            Math.hypot(facility.x - node.x, facility.z - node.z) >= .1)) {
            throw new Error(`Invalid walking place: ${def.node}`);
        }
        return {
            id: node.id,
            level: node.level,
            station,
            access: def.access,
            name: facility?.name ?? messageText(def.caption!),
            kind: facility?.kind ?? def.kind,
            facilityId: facility?.id
        };
    });
}
