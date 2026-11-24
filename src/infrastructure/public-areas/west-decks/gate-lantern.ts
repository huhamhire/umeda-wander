import { messageText } from '../../i18n/index.ts';
import { passageOutline } from '../../../domain/map/geometry.ts';
import type { AtriumVoid, Evidence, FloorArea, Point2, StairSpiral, VerticalConnection } from '../../../domain/map/model.ts';
import type { DeckPath, DeckPortal } from '../../../domain/map/public-deck.ts';
import { sourceDeckPaths } from '../elevated-source.ts';

const blockId = 'north-atrium-b1';
const center = { x: 167, z: 591 };
const spiral: StairSpiral = {
    center,
    radius: 8.8,
    startRad: 2.82,
    sweepRad: -4.67,
    canopy: { clearance: 4.1, mastRadius: .75 }
};
const width = 2.8;

export const gateLanternEvidence: Evidence = {
    source: 'district',
    pages: [],
    urls: [
        'https://www.nikken.jp/ja/dbook/nj202503/pageindices/index6.html',
        'https://www.nikken.jp/ja/dbook/nj202503/pageindices/index16.html',
        'https://umekita.com/floor/south/?floor=B1F'
    ],
    detail: 'Gate Lantern (ゲートランタン) site plan and section show the B1 approaches, park and 2F deck. ' +
        'The roughly 20 m stair diameter is from the designer. The axis, mouths, sweep and display elevations are illustrative fits. ' +
        'Reference-derived geometry permission pending.'
};

/** Sample an open court ring in the district east/south metre frame. */
function ring(radius: number): Point2[] {
    return Array.from({ length: 40 }, (_, index) => {
        const angle = index * 2 * Math.PI / 40;
        return { x: center.x + radius * Math.cos(angle), z: center.z + radius * Math.sin(angle) };
    });
}

/** Match both spiral landings to the radial stair shape and the shared public slabs. */
function stairStop(angle: number): Point2 {
    return { x: center.x + spiral.radius * Math.cos(angle), z: center.z + spiral.radius * Math.sin(angle) };
}

const upperStop = stairStop(spiral.startRad + spiral.sweepRad);

/** Join the upper landing to the existing park deck at its sourced southern end. */
export function gateLanternDeck(join: Point2): DeckPath {
    return {
        id: 'gate-lantern-upper-landing',
        name: messageText('publicAreas.westDecks.entities.gateLantern.name'),
        points: [join, upperStop],
        width: 5,
        evidence: gateLanternEvidence
    };
}

/** Join the mapped bridge to the recessed Gate Tower (ゲートタワー) podium mouth. */
export function gateLanternSouthBuilding(): { path: DeckPath; portal: DeckPortal } {
    const source = sourceDeckPaths(['gate-lantern-south-building'])[0]!;
    const [end, next] = source.points;
    const angle = Math.atan2(end!.z - next!.z, end!.x - next!.x);
    // The display podium recess for the Sunken Garden (サンクンガーデン) moves the wall inward.
    const recess = 5.6;
    const point = { x: end!.x + Math.cos(angle) * recess, z: end!.z + Math.sin(angle) * recess };
    const threshold = { x: point.x + Math.cos(angle) * 1.5, z: point.z + Math.sin(angle) * 1.5 };
    return {
        path: { ...source, points: [threshold, ...source.points] },
        portal: {
            id: 'gate-lantern-south-building-2f',
            target: 'grand-green-south-gate',
            blockId: 'west-decks',
            level: 'district-north-deck',
            point,
            width: source.width,
            angle,
            openingHalfDepth: 2.5,
            evidence: source.evidence
        }
    };
}

/** Fit the Gate Lantern (ゲートランタン) section as a B1 concourse, open court and separate stair flights. */
export function createGateLantern() {
    const name = messageText('publicAreas.westDecks.entities.gateLantern.name');
    const b1 = 'district-underground' as const;
    const ground = 'district-ground' as const;
    // The display-fit station hall is wider than the source plan. Go around its public north side.
    const underground = [
        { x: 213, z: 555 }, { x: 197, z: 548 }, { x: 186, z: 551 },
        { x: 178, z: 569 }, { x: 170, z: 586 }
    ];
    const areas: FloorArea[] = [
        ...underground.slice(1).map((point, index) => ({
            id: 'gate-lantern-b1-approach-' + index,
            name,
            kind: 'public' as const,
            level: b1,
            blockId,
            outline: passageOutline(underground[index]!, point, 8),
            evidence: gateLanternEvidence
        })),
        {
            id: 'gate-lantern-b1-court',
            name,
            kind: 'public',
            level: b1,
            blockId,
            outline: ring(11.6),
            evidence: gateLanternEvidence
        },
        {
            id: 'gate-lantern-south-building-b1-mouth',
            name,
            kind: 'public',
            level: b1,
            blockId,
            outline: passageOutline({ x: 161, z: 594 }, { x: 144, z: 605 }, 8),
            evidence: gateLanternEvidence
        },
        {
            id: 'gate-lantern-ground-court',
            name,
            kind: 'public',
            level: ground,
            blockId,
            outline: ring(14),
            label: true,
            evidence: gateLanternEvidence
        }
    ];
    const escalator: VerticalConnection = {
        id: 'gate-lantern-escalator',
        kind: 'escalator',
        from: { id: 'gate-lantern-escalator-b1', level: b1, x: 165, z: 600 },
        to: { id: 'gate-lantern-escalator-ground', level: ground, x: 177, z: 589 },
        width: 2.4,
        blockId,
        evidence: gateLanternEvidence
    };
    const stairs: VerticalConnection = {
        id: 'gate-lantern-spiral',
        kind: 'stairs',
        from: { id: 'gate-lantern-spiral-ground', level: ground, ...stairStop(spiral.startRad) },
        to: { id: 'gate-lantern-spiral-deck', level: 'district-north-deck', ...upperStop },
        width,
        spiral,
        placement: 'exterior',
        blockId: 'west-decks',
        evidence: gateLanternEvidence
    };
    const atrium: AtriumVoid = {
        id: 'gate-lantern-court',
        name,
        openings: [{ level: ground, outline: ring(7.2) }],
        evidence: gateLanternEvidence
    };
    return { areas, escalator, stairs, atrium };
}
