import { axisPlacement } from '../../../domain/map/axis-calibration.ts';
import { createStation } from './index.ts';
import { passageOutline, pointInPolygon } from '../../../domain/map/geometry.ts';
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
    // Retain compact lift landings beside the bridge instead of station-scaled square plazas.
    const lift = station.layout.connections.find(c => c.id.endsWith('south-lift-ground-deck'))!;
    const dx = 666 - lift.to.x;
    const dz = 731 - lift.to.z;
    const moved = station.layout.connections.filter(c => c.id.includes('south-lift-'));
    const nodeIds = new Set(moved.flatMap(c => [c.from.id, c.to.id]));
    for (const node of station.nodes.filter(n => nodeIds.has(n.id))) {
        node.x += dx;
        node.z += dz;
    }
    for (const c of moved) {
        // Connection endpoints are separate records from the station node registry.
        c.from = { ...c.from, ...station.nodes.find(n => n.id === c.from.id)! };
        c.to = { ...c.to, ...station.nodes.find(n => n.id === c.to.id)! };
    }
    for (const facility of station.facilities.filter(f => moved.some(c => c.id === f.connectionId))) {
        facility.x += dx;
        facility.z += dz;
    }
    const b1Landing = station.layout.areas.find(a => a.id === 'hanshin-umeda-south-b1-landing')!;
    // Keep the stair-side B1 apron in place when moving only the external lift.
    const angle = Math.atan2(76, -129);
    for (const id of ['hanshin-umeda-south-ground', 'hanshin-umeda-south-deck']) {
        const area = station.layout.areas.find(a => a.id === id)!;
        const point = lift.to;
        area.outline = passageOutline(
            { x: point.x - Math.cos(angle) * 3.2, z: point.z - Math.sin(angle) * 3.2 },
            { x: point.x + Math.cos(angle) * 3.2, z: point.z + Math.sin(angle) * 3.2 },
            id.endsWith('south-ground') ? 12 : 6
        );
    }
    for (const connection of station.layout.connections.filter(c => c.id.includes('south-ground-') || c.id.includes('south-lift-'))) {
        for (const node of [connection.from, connection.to]) {
            if (station.layout.areas.some(a => a.level === node.level && pointInPolygon(node, a.outline))) {
                continue;
            }
            station.layout.areas.push({
                ...b1Landing,
                id: node.id + ':compact-landing',
                level: node.level,
                outline: passageOutline({ x: node.x - 2, z: node.z }, { x: node.x + 2, z: node.z }, 4),
                label: false,
                evidence: connection.evidence
            });
        }
    }
    return station;
}
