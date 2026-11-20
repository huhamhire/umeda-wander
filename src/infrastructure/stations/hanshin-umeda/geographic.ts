import { axisPlacement } from '../../../domain/map/axis-calibration.ts';
import { createStation } from './index.ts';
import { joinedPassageOutlines, passageOutline } from '../../../domain/map/geometry.ts';
import type { Point2, StationMap } from '../../../domain/map/model.ts';
import { elevatorDoorApproach } from '../../../application/connections/connection-openings.ts';
import { cityLiftMap, exitPhoto, f23EscalatorTracks, f23Stair, southLiftDeckApproach, southLiftHallApproach, southLiftPoint } from './south-exit.ts';
// Manual endpoint fit to the reviewed road / underground plan, not surveyed coordinates.
export const hanshinAxis = {
    negativeEnd: { x: 612, z: 718 },
    positiveEnd: { x: 483, z: 794 },
    localCenter: 0,
    localLength: 92,
    acrossScale: 0.9
};
/**
 * Create the Hanshin (阪神) map and align paid boundaries, platform widths and public interfaces.
 */
export function createGeographicHanshin() {
    const station = createStation(axisPlacement(hanshinAxis), true);
    for (const platform of station.layout.platforms) {
        platform.width *= hanshinAxis.acrossScale;
    }
    // The main exit continues east along the terminal axis, not north across it.
    // Move the gate west first so the double escalator / wide stair bank has its own apron.
    const placement = axisPlacement(hanshinAxis);
    const point = (x: number, z: number) => ({
        x: placement.origin.x + Math.cos(placement.angle) * x * placement.planScale.along - Math.sin(placement.angle) * z * placement.planScale.across,
        z: placement.origin.z + Math.sin(placement.angle) * x * placement.planScale.along + Math.cos(placement.angle) * z * placement.planScale.across
    });
    const rectangle = (x: number, z: number, w: number, d: number) => [
        point(x - w / 2, z - d / 2), point(x + w / 2, z - d / 2),
        point(x + w / 2, z + d / 2), point(x - w / 2, z + d / 2)
    ];
    station.layout.areas.find(a => a.id === 'hanshin-umeda-east-paid')!.outline = rectangle(-50, -2, 8, 50);
    station.layout.areas.find(a => a.id === 'hanshin-umeda-east-public')!.outline = rectangle(-69, -12, 30, 26);
    Object.assign(station.facilities.find(f => f.id === 'hanshin-umeda-east-gate')!, point(-54, -10));
    const target = point(-79, -10);
    for (const c of station.layout.connections.filter(c => c.id.includes('east-public-'))) {
        Object.assign(c.from, point(-69, -10));
        Object.assign(c.to, target);
        Object.assign(station.nodes.find(n => n.id === c.from.id)!, c.from);
        Object.assign(station.nodes.find(n => n.id === c.to.id)!, target);
    }
    const landing = station.layout.areas.find(a => a.id === 'hanshin-umeda-east-upper-public')!;
    landing.outline = rectangle(-79, -10, 8, 18);
    calibrateSouthExit(station);
    return station;
}

/** Locate F23 and its public lift from the OSM axes, keeping the route graph independent. */
function calibrateSouthExit(station: StationMap): void {
    const stair = station.layout.connections.find(c => c.id.endsWith('south-ground-stairs'))!;
    const escalator = station.layout.connections.find(c => c.id.endsWith('south-ground-escalator'))!;
    const mid = (a: Point2, b: Point2): Point2 => ({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
    const [first, second] = f23EscalatorTracks;
    const heading = Math.atan2(f23Stair.to.z - f23Stair.from.z, f23Stair.to.x - f23Stair.from.x);
    const offset = (p: Point2, along: number, across = 0): Point2 => ({
        x: p.x + Math.cos(heading) * along - Math.sin(heading) * across,
        z: p.z + Math.sin(heading) * along + Math.cos(heading) * across
    });
    // Keep mapped flight lengths and widen the cross-section slightly to separate the modeled rails.
    Object.assign(stair.from, offset(f23Stair.from, 0, -.9));
    Object.assign(stair.to, offset(f23Stair.to, 0, -.9));
    stair.width = 3.2;
    stair.evidence.urls!.push(f23Stair.way, exitPhoto);
    stair.evidence.detail += ' F23 stair axis follows OSM. The photo shows a broad stair beside two escalators; width and intermediate landing are fitted.';
    Object.assign(escalator.from, offset(mid(first.from, second.from), 0, .6));
    Object.assign(escalator.to, offset(mid(first.to, second.to), 0, .6));
    escalator.width = 1.65;
    escalator.lanes = 2;
    escalator.laneSpacing = 1.7;
    escalator.evidence.urls!.push(first.way, second.way, exitPhoto);
    escalator.evidence.detail += ' Two covered parallel flights follow the mapped bank axis. Lane spacing is widened for the model.';
    const lower = station.layout.connections.find(c => c.id.endsWith('south-lift-b2-b1'))!;
    const middle = station.layout.connections.find(c => c.id.endsWith('south-lift-b1-ground'))!;
    const upper = station.layout.connections.find(c => c.id.endsWith('south-lift-ground-deck'))!;
    const deckJoin = southLiftDeckApproach[1]!;
    const deckFacing = Math.atan2(deckJoin.z - southLiftPoint.z, deckJoin.x - southLiftPoint.x);
    const hallFacing = deckFacing + Math.PI;
    middle.reverseLowerDoor = true;
    for (const lift of [lower, middle, upper]) {
        Object.assign(lift.from, southLiftPoint);
        Object.assign(lift.to, southLiftPoint);
        lift.doorFacingRad = lift === lower ? hallFacing : deckFacing;
        lift.evidence.urls!.push(cityLiftMap, 'https://www.openstreetmap.org/node/5691997475');
        lift.evidence.detail = 'Osaka City lift 21 serves the East Gate B2, B1, ground and deck. Shaft follows the mapped lift point; door orientation is fitted.';
    }
    const b1Landing = station.layout.areas.find(a => a.id === 'hanshin-umeda-south-b1-landing')!;
    station.layout.areas.push({
        ...b1Landing,
        id: 'hanshin-umeda-south-b1-lift-door-approach',
        outline: elevatorDoorApproach(middle.from, hallFacing),
        label: false,
        evidence: middle.evidence
    });
    // The mapped B1 footway reaches the lower escalator mouths. Include the adjacent stair landing.
    const hallSections = joinedPassageOutlines(southLiftHallApproach, 5.8);
    const hallOutline = [
        hallSections[0]![0]!,
        ...hallSections.map(section => section[1]!),
        ...hallSections.map(section => section[2]!).reverse(),
        hallSections[0]![3]!
    ];
    station.layout.areas.push({
        ...b1Landing,
        id: 'hanshin-umeda-f23-b1-approach',
        outline: hallOutline,
        label: false,
        evidence: {
            ...stair.evidence,
            urls: [...stair.evidence.urls!, 'https://www.openstreetmap.org/way/1329514168'],
            detail: 'Lower stair and escalator apron fitted around the mapped B1 footway to lift 21; corridor width is estimated.'
        }
    });
    station.layout.areas.push({
        ...b1Landing,
        id: 'hanshin-umeda-south-b2-lift-door-approach',
        level: lower.from.level,
        outline: elevatorDoorApproach(lower.from, hallFacing),
        label: false,
        evidence: lower.evidence
    });
    for (const [key, stop, heading] of [
        ['ground', middle.to, deckFacing],
        ['deck', upper.to, deckFacing]
    ] as const) {
        const area = station.layout.areas.find(a => a.id === 'hanshin-umeda-south-' + key)!;
        area.outline = elevatorDoorApproach(stop, heading);
        area.evidence = upper.evidence;
        area.railings = key === 'deck';
    }
    const high = mid(stair.to, escalator.to);
    const low = mid(stair.from, escalator.from);
    station.layout.areas.push({
        ...b1Landing,
        id: 'hanshin-umeda-f23-b1-landing',
        outline: passageOutline(offset(low, -3), offset(low, .5), 8),
        label: false,
        evidence: stair.evidence
    });
    station.layout.areas.push({
        ...b1Landing,
        id: 'hanshin-umeda-f23-ground-landing',
        level: stair.to.level,
        outline: passageOutline(offset(high, -.5), offset(high, 3.5), 8),
        label: false,
        evidence: stair.evidence
    });
    station.layout.canopies = [{
        id: 'hanshin-umeda-f23-canopy',
        level: stair.to.level,
        points: [offset(low, -.5), offset(high, 1.5)],
        width: 8,
        clearHeight: 3.3,
        glazed: true,
        evidence: {
            ...escalator.evidence,
            detail: 'The March 2025 photograph confirms a steel-framed glazed canopy over F23. Roof extent, supports and height are fitted.'
        }
    }];
}
