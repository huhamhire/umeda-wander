import { messageText } from './i18n/index.ts';
import type { Platform, RailApproach } from '../domain/map/model.ts';
import { platformRail } from '../domain/map/rail-geometry.ts';
import { railApproachDraft } from './rail-approach-draft.ts';
import { rotatePoint } from '../domain/map/geometry.ts';

/**
 * Build shared-tangent paired approaches from island platforms, omitting the buffered terminal end.
 */
export function createIslandRailApproaches(platforms: Platform[], distances?: {
    lead: number;
    tail: number;
}): RailApproach[] {
    const { approaches, make, node, segment } = railApproachDraft();
    // Island tracks converge to independent parallel running roads. Y11 ends at
    // the north buffers; only its southern end continues. Kitashinchi runs through.
    for (const [level, id, station, name, color, side, endX] of [
        [
            'y11-platform',
            'y11-south',
            'nishi-umeda',
            messageText('railways.yotsubashi.south'),
            0x328bb7,
            -1,
            118
        ],
        [
            'kitashinchi-platform',
            'kitashinchi-west',
            'kitashinchi',
            messageText('railways.tozai.west'),
            0xd28faf,
            -1,
            125
        ],
        [
            'kitashinchi-platform',
            'kitashinchi-east',
            'kitashinchi',
            messageText('railways.tozai.east'),
            0xd28faf,
            1,
            125
        ],
    ] as const) {
        const p = platforms.find(p => p.level === level);
        if (!p) {
            continue;
        }
        const at = (along: number, across: number) => {
            const q = rotatePoint({ x: along, z: across }, { x: 0, z: 0 }, p.rotationRad);
            return { x: q.x + p.x, z: q.z + p.z };
        };
        const outlet = distances ? p.length / 2 + distances.lead : 85;
        const endDistance = distances ? outlet + distances.tail : endX;
        const a = make(id, station, name, color, at(side * endDistance, 0), level);
        a.evidence = {
            ...p.evidence,
            detail: `${p.evidence.detail}; short running-pair continuation along the supplied district road/rail axis. Turnouts and gradients not surveyed.`
        };
        const direction = { x: Math.cos(p.rotationRad) * side, z: Math.sin(p.rotationRad) * side };
        for (const [index, track] of p.tracks.entries()) {
            const rail = platformRail(p, index);
            const start = node(a, `track-${track}`, side === -1 ? rail.start : rail.end, 'platform-end');
            const across = rail.side * 2.2;
            const out = node(a, `out-${track}`, at(side * outlet, across), 'outlet');
            segment(
                a,
                `lead-${track}`,
                start,
                out,
                { x: start.point.x + direction.x * 11, z: start.point.z + direction.z * 11 },
                { x: out.point.x - direction.x * 11, z: out.point.z - direction.z * 11 },
                p.id,
                track
            );
            const end = node(a, `end-${track}`, at(side * endDistance, across), 'end');
            const run = (endDistance - outlet) / 3;
            segment(
                a,
                `tail-${track}`,
                out,
                end,
                { x: out.point.x + direction.x * run, z: out.point.z + direction.z * run },
                { x: end.point.x - direction.x * run, z: end.point.z - direction.z * run }
            );
        }
    }
    return approaches;
}
