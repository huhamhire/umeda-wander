import type { Point2, RouteEdge, RouteNode } from '../../../domain/map/model.ts';

interface CorridorPoint extends Point2 {
    id: string;
}

const southJunction: CorridorPoint = { id: 'walking-b1-nishi-south-junction', x: 433, z: 1055 };

/** Explicit public corridors checked against operator plans and Osaka City's transfer sheets. */
const corridors: { from: string; through: CorridorPoint[]; to: string }[] = [
    {
        // Crost (クロスト) links Central Court (中央コンコース) with the Hanshin (阪神) west approach.
        from: 'crost68-b1',
        through: [
            { id: 'walking-b1-crost-west-turn', x: 403, z: 729 },
            { id: 'walking-b1-hanshin-north-approach', x: 435, z: 795 },
            { id: 'walking-b1-hanshin-north-turn', x: 437, z: 797 },
            { id: 'walking-b1-hanshin-west-plaza', x: 449, z: 787 }
        ],
        to: 'hanshin-umeda-route-entry'
    },
    {
        // Hanshin (阪神) West Gate passage to the north concourse of Nishi-Umeda (西梅田).
        from: 'hanshin-umeda-route-entry',
        through: [
            { id: 'walking-b1-hanshin-west-approach', x: 450, z: 818 },
            { id: 'walking-b1-hanshin-west-turn', x: 436, z: 832 },
            { id: 'walking-b1-nishi-north-plaza', x: 431, z: 852 },
            { id: 'walking-b1-nishi-north-approach', x: 441, z: 870 }
        ],
        to: 'nishi-umeda-north-route-out'
    },
    {
        from: 'nishi-umeda-north-route-out',
        through: [{ id: 'walking-b1-nishi-east-concourse', x: 439, z: 912 }],
        to: 'nishi-umeda-route-entry'
    },
    {
        // Osaka City route G reaches Kitashinchi (北新地) from the south public concourse.
        from: 'nishi-umeda-route-entry',
        through: [
            southJunction,
            { id: 'walking-b1-kitashinchi-west-link', x: 455, z: 1059 }
        ],
        to: 'kitashinchi-route-entry'
    },
    {
        from: southJunction.id,
        through: [],
        to: 'nishi-umeda-south-route-out'
    }
];

/** Attach the reviewed southern transfer paths, including the stair from JR Osaka Station (大阪駅). */
export function southernWalkingRoutes(stationNodes: readonly RouteNode[]) {
    const nodes: RouteNode[] = corridors.flatMap(corridor => corridor.through.map(point => ({
        ...point,
        level: 'district-underground'
    })));
    const byId = new Map([...stationNodes, ...nodes].map(node => [node.id, node]));
    /** Set the edge cost from its fitted length, including the display rise on the Crost stair. */
    const segment = (from: string, to: string, rise = 0): RouteEdge => {
        const start = byId.get(from)!;
        const end = byId.get(to)!;
        return { from, to, kind: rise ? 'stairs' : 'walk', cost: Math.hypot(end.x - start.x, end.z - start.z, rise) };
    };
    const edges: RouteEdge[] = corridors.flatMap(corridor => {
        const path = [corridor.from, ...corridor.through.map(point => point.id), corridor.to];
        return path.slice(1).map((id, i) => segment(path[i]!, id));
    });
    edges.push(
        segment('entry', 'crost68-1'),
        segment('hall', 'crost68-1'),
        segment('gate-out', 'crost68-1'),
        segment('crost68-1', 'crost68-b1', 8)
    );
    return { nodes, edges };
}
