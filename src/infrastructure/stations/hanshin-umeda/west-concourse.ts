import type { Point2, StationMap } from '../../../domain/map/model.ts';

/** Fit the B1 west paid island and the documented routes on both sides of Hanshin (阪神). */
export function calibrateHanshinWestConcourse(station: StationMap, point: (x: number, z: number) => Point2): void {
    const { layout, facilities, nodes, edges } = station;
    const districtGuide = 'https://umeda-connect.jp/common/pdf/map_tw.pdf';
    const floorShapes: { id: string; points: [number, number][]; detail: string }[] = [
        {
            id: 'hall-paid',
            points: [
                [19.5, -22], [28, -22], [39, -20.5], [48, -17], [61.5, -17], [61.5, 4],
                [50, 6], [45, 10], [42, 17], [34, 17], [29, 14], [21, 14], [19.5, 4]
            ],
            detail: 'Fitted western paid outline between the two district-plan gate markers. The north shoulder and southern edge are fitted around the B2 equipment landings.'
        },
        {
            id: 'west-public',
            points: [[61, -28], [74, -28], [76, -17], [76, 31], [60, 31], [60, 20], [61, 5]],
            detail: 'The west gate forecourt joins the north bypass and the southwest approach. Widths and local height are fitted.'
        },
        {
            id: 'north-public',
            points: [
                [10, 8], [19, 3.5], [21, 13.7], [29, 13.7], [34, 16.7], [42, 16.7],
                [45, 9.7], [50, 5.7], [64, 3.7], [66, 26], [48, 24], [34, 24], [18, 25], [10, 29]
            ],
            detail: 'Continuous public passage on the JR side follows the route shown outside both gates. Outline and clear width are fitted.'
        },
        {
            id: 'department-public',
            points: [
                [7, -28], [20, -32], [38, -36], [57, -39], [65, -39],
                [66, -23], [59, -23], [45, -25], [36, -26], [24, -26], [15, -24], [7, -16]
            ],
            detail: 'Public bypass on the department-store side reaches the Diamor Osaka (ディアモール大阪) branch without crossing the paid concourse. Local grade changes are folded into B1.'
        },
        {
            id: 'central-public',
            points: [[-18, -32], [16, -32], [20, -19], [20, 12], [15, 30], [-18, 32]],
            detail: 'The department-store gate opens onto the B1 cross-passage, clear of the paid hall. Boundaries are fitted to the reference network.'
        }
    ];
    for (const shape of floorShapes) {
        const floor = layout.areas.find(a => a.id === 'hanshin-umeda-' + shape.id)!;
        floor.outline = shape.points.map(([x, z]) => point(x, z));
        floor.evidence = {
            ...floor.evidence,
            urls: [...floor.evidence.urls!, districtGuide],
            detail: shape.detail
        };
    }
    for (const [id, x, z] of [
        ['west-gate', 61.5, -7], ['department-gate', 19.5, -6.7],
        ['west-lockers', 65, -17], ['department-lockers', 15, -22], ['west-entry', 68, -7]
    ] as const) {
        const facility = facilities.find(f => f.id === 'hanshin-umeda-' + id)!;
        Object.assign(facility, point(x, z));
        facility.evidence.urls!.push(districtGuide);
    }
    const routeIds = new Set<string>();
    for (const [id, x] of [['route-entry', 68], ['route-gate-out', 64], ['route-gate-in', 58]] as const) {
        const node = nodes.find(n => n.id === 'hanshin-umeda-' + id)!;
        Object.assign(node, point(x, -7));
        routeIds.add(node.id);
    }
    // Refresh the existing west gate edges from their calibrated endpoints.
    for (const edge of edges.filter(e => routeIds.has(e.from) || routeIds.has(e.to))) {
        const from = nodes.find(n => n.id === edge.from)!;
        const to = nodes.find(n => n.id === edge.to)!;
        edge.cost = Math.max(1, Math.hypot(to.x - from.x, to.z - from.z));
    }
}
