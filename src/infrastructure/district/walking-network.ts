import clipping, { type Polygon } from 'polygon-clipping';
import { Earcut } from 'three/src/extras/Earcut.js';
import { planAtriumOpenings } from '../../application/connections/atrium-openings.ts';
import { planFloorOpenings } from '../../application/connections/connection-openings.ts';
import { walkingApproaches } from '../../application/navigation/walking-approaches.ts';
import { closestPolygonPoint, passageOutline, platformOutline, pointInPolygon } from '../../domain/map/geometry.ts';
import type { LevelId, PlanRegion, Point2, RouteEdge, RouteNode } from '../../domain/map/model.ts';
import { shapeWalkingLeg, walkableChord } from '../../domain/navigation/shape-walking-leg.ts';
import { edges, facilities, layout, levels, nodes, publicInterfaces } from './geographic-map.ts';
import { groundWalkingPaths } from './ground-walking-paths.ts';
import { walkingPlaces } from './walking-places.ts';

type Triangle = { id: string; outline: Point2[]; region: PlanRegion };
type Face = { level: LevelId; offset: number; polygons: Polygon[]; triangles: Triangle[]; restricted: Polygon[] };
type VisibilityWalk = { face: Face; id: string; anchors: RouteNode[] };

/** Place visibility anchors just inside the boundary, including beside openings in narrow platforms. */
function walkableCorners(region: PlanRegion): Point2[] {
    return [region.outline, ...region.holes ?? []].flatMap(ring => ring.flatMap((point, index) => {
        const previous = ring.at(index - 1)!;
        const next = ring[(index + 1) % ring.length]!;
        const turn = (point.x - previous.x) * (next.z - point.z) - (point.z - previous.z) * (next.x - point.x);
        if (turn >= -1e-8) {
            return [];
        }
        const before = Math.hypot(point.x - previous.x, point.z - previous.z);
        const after = Math.hypot(next.x - point.x, next.z - point.z);
        if (before < 1e-8 || after < 1e-8) {
            return [];
        }
        // The clipping rings keep walkable space on their left, including around holes.
        const anchor = {
            x: point.x - .04 * ((point.z - previous.z) / before + (next.z - point.z) / after),
            z: point.z + .04 * ((point.x - previous.x) / before + (next.x - point.x) / after)
        };
        return pointInPolygon(anchor, region.outline) && !region.holes?.some(hole => pointInPolygon(anchor, hole)) ? [anchor] : [];
    }));
}

/** Convert a modeled floor face to the polygon clipping representation. */
function polygon(outline: Point2[], holes: Point2[][] = []): Polygon {
    return [outline, ...holes].map(ring => ring.map(({ x, z }) => [x, z]));
}

/** Determine which side of an uncut floor boundary owns a node. */
function contains(polygon: Polygon, point: Point2): boolean {
    const [outer, ...holes] = polygon;
    const containsRing = (ring: Polygon[number]) => pointInPolygon(point, ring.map(([x, z]) => ({ x, z })));
    return containsRing(outer!) && !holes.some(containsRing);
}

/** Mesh edges are bidirectional, so both traversal orders share one key. */
const meshEdgeKey = (from: string, to: string) => from < to ? from + '\0' + to : to + '\0' + from;

/** Build a routing mesh inside modeled floors and attach existing gates and equipment. */
export function createWalkingNetwork() {
    const graphNodes = new Map(nodes.map(node => [node.id, node]));
    const graphEdges = [...edges];
    const meshRegions = new Map<string, PlanRegion>();
    const nodeRegions = new Map<string, PlanRegion>();
    const elevation = (node: Pick<RouteNode, 'level' | 'elevationOffset'>) =>
        levels.find(level => level.id === node.level)!.y + (node.elevationOffset ?? 0);
    const plane = (node: Pick<RouteNode, 'level' | 'elevationOffset'>, paid: boolean) =>
        paid ? 'paid:' + node.level + ':' + (node.elevationOffset ?? 0) : 'public:' + elevation(node);
    const faces = new Map<string, Face>();
    const visibilityWalks = new Map<PlanRegion, VisibilityWalk>();
    const visibilityPlanes = new Set([
        ...layout.platforms.map(platform => plane(platform, true)),
        ...layout.areas.filter(area => area.id === 'bridge-paid').map(area => plane(area, true))
    ]);
    const blockers = new Map<number, { shape: Polygon; connectionId?: string }[]>();
    const openings = [...planFloorOpenings(layout.connections, levels, layout.platforms), ...planAtriumOpenings(layout.atria ?? [])];
    const elevatorSegmentsByStop = new Map<string, Set<string>>();
    for (const connection of layout.connections) {
        if (connection.kind !== 'elevator') {
            continue;
        }
        for (const stop of [connection.from, connection.to]) {
            const segments = elevatorSegmentsByStop.get(stop.id) ?? new Set<string>();
            segments.add(connection.id);
            elevatorSegmentsByStop.set(stop.id, segments);
        }
    }
    /** Add one eligible floor to its physical plane, keeping paid areas in their own station level. */
    const floor = (node: Pick<RouteNode, 'level' | 'elevationOffset'>, paid: boolean, shape: Polygon) => {
        const key = plane(node, paid);
        const face = faces.get(key) ?? { level: node.level, offset: node.elevationOffset ?? 0, polygons: [], triangles: [], restricted: [] };
        face.polygons.push(shape);
        faces.set(key, face);
    };
    for (const area of layout.areas) {
        const shape = polygon(area.outline, area.holes);
        if (area.kind === 'public' || area.kind === 'paid') {
            floor(area, area.kind === 'paid', shape);
        } else {
            const y = elevation(area);
            blockers.set(y, [...blockers.get(y) ?? [], { shape }]);
        }
    }
    for (const platform of layout.platforms) {
        floor(platform, true, polygon(platformOutline(platform)));
    }
    for (const opening of openings) {
        const y = elevation(opening);
        blockers.set(y, [...blockers.get(y) ?? [], { shape: polygon(opening.outline), connectionId: opening.connectionId }]);
    }
    /** Insert a graph node at a physical walkable elevation. */
    const addNode = (id: string, face: Face, point: Point2) => {
        const node = { ...point, id, level: face.level, elevationOffset: face.offset };
        graphNodes.set(id, node);
        return node;
    };
    /** Add one schematic walk segment with cost equal to its modeled length. */
    const walk = (from: string, to: string, region?: PlanRegion) => {
        const a = graphNodes.get(from)!;
        const b = graphNodes.get(to)!;
        graphEdges.push({ from, to, kind: 'walk', cost: Math.hypot(a.x - b.x, a.z - b.z) });
        if (region && a.level === b.level) {
            meshRegions.set(meshEdgeKey(from, to), region);
        }
    };
    for (const [key, face] of faces) {
        const y = elevation({ level: face.level, elevationOffset: face.offset });
        const paid = key.startsWith('paid:');
        const paidShapes = paid ? [] : [...faces].flatMap(([otherKey, other]) =>
            otherKey.startsWith('paid:') && elevation({ level: other.level, elevationOffset: other.offset }) === y ? other.polygons : []);
        face.restricted = paidShapes;
        const cuts = blockers.get(y)?.map(blocker => blocker.shape) ?? [];
        const regions = clipping.difference(clipping.union(...face.polygons as [Polygon, ...Polygon[]]), ...cuts, ...paidShapes);
        for (const [index, region] of regions.entries()) {
            const [outline, ...voids] = region.map(ring => ring.slice(0, -1).map(([x, z]) => ({ x, z })));
            const walkable = { outline: outline!, holes: voids };
            if (visibilityPlanes.has(key)) {
                visibilityWalks.set(walkable, { face, id: `walk:corner:${key}:${index}`, anchors: [] });
            }
            const coordinates: number[] = [];
            const holes: number[] = [];
            for (const [ringIndex, ring] of region.entries()) {
                if (ringIndex) {
                    holes.push(coordinates.length / 2);
                }
                coordinates.push(...ring.slice(0, -1).flat());
            }
            const indices = Earcut.triangulate(coordinates, holes, 2);
            const shared = new Map<string, string>();
            for (let i = 0; i < indices.length; i += 3) {
                const corners = indices.slice(i, i + 3);
                const outline = corners.map(n => ({ x: coordinates[2 * n]!, z: coordinates[2 * n + 1]! }));
                const id = `walk:${key}:${index}:${i}`;
                addNode(id, face, {
                    x: outline.reduce((sum, point) => sum + point.x, 0) / 3,
                    z: outline.reduce((sum, point) => sum + point.z, 0) / 3
                });
                face.triangles.push({ id, outline, region: walkable });
                for (const [n, first] of corners.entries()) {
                    const second = corners[(n + 1) % 3]!;
                    const seam = [Math.min(first, second), Math.max(first, second)].join(':');
                    const previous = shared.get(seam);
                    if (previous) {
                        const joint = id + ':' + n;
                        addNode(joint, face, {
                            x: (coordinates[first * 2]! + coordinates[second * 2]!) / 2,
                            z: (coordinates[first * 2 + 1]! + coordinates[second * 2 + 1]!) / 2
                        });
                        walk(previous, joint, walkable);
                        walk(joint, id, walkable);
                    } else {
                        shared.set(seam, id);
                    }
                }
            }
        }
    }

    /** Attach endpoints inside a triangle, allowing fitted equipment landings to reach the edge of their slab opening. */
    const attach = (node: RouteNode, paid: boolean, equipmentId?: string): boolean => {
        const face = faces.get(plane(node, paid));
        const exact = face?.triangles.find(triangle => pointInPolygon(node, triangle.outline));
        if (exact) {
            nodeRegions.set(node.id, exact.region);
            visibilityWalks.get(exact.region)?.anchors.push(node);
            walk(node.id, exact.id, exact.region);
            return true;
        }
        if (!face || !equipmentId || !face.polygons.some(shape => contains(shape, node))) {
            return false;
        }
        let best: { triangle: Triangle; point: Point2 } | undefined;
        let distance = 2.5;
        for (const triangle of face.triangles) {
            const point = closestPolygonPoint(node, triangle.outline);
            const gap = Math.hypot(node.x - point.x, node.z - point.z);
            if (gap < distance) {
                distance = gap;
                best = { triangle, point };
            }
        }
        if (!best) {
            return false;
        }
        const strip = polygon(passageOutline(node, best.point, .02));
        const obstacles = blockers.get(elevation(node)) ?? [];
        // At a shared elevator stop, both segments cut the same shaft at this landing.
        const elevatorSegments = elevatorSegmentsByStop.get(node.id);
        if (face.restricted.some(shape => clipping.intersection(strip, shape).length > 0) ||
            obstacles.some(({ shape, connectionId }) => {
                const owner = connectionId?.split(':')[0];
                return owner !== equipmentId && !(owner && elevatorSegments?.has(owner)) &&
                    clipping.intersection(strip, shape).length > 0;
            })) {
            return false;
        }
        const landing = addNode('walk:landing:' + node.id, face, best.point);
        visibilityWalks.get(best.triangle.region)?.anchors.push(landing);
        walk(node.id, landing.id);
        walk(landing.id, best.triangle.id, best.triangle.region);
        return true;
    };
    /** Classify the endpoint from the uncut paid footprint so openings cannot change gate side. */
    const onPaidFloor = (node: RouteNode) => faces.get(plane(node, true))?.polygons.some(shape => contains(shape, node)) ?? false;
    const groundLevel = 'district-ground';
    const groundFace = faces.get(plane({ level: groundLevel }, false));
    if (groundFace) {
        const obstructions = [...groundFace.restricted, ...(blockers.get(0) ?? []).map(blocker => blocker.shape)].map(shape => {
            const xs = shape[0]!.map(([x]) => x);
            const zs = shape[0]!.map(([, z]) => z);
            return { shape, west: Math.min(...xs), east: Math.max(...xs), north: Math.min(...zs), south: Math.max(...zs) };
        });
        /** Attach each shared ground vertex to the modeled public mesh at most once. */
        const streetNode = (point: Point2) => {
            // Shared source vertices join, but two intersecting ways without a common vertex do not.
            const id = `walk:street:${point.x}:${point.z}`;
            if (!graphNodes.has(id)) {
                const node = { ...point, id, level: groundLevel } as const;
                graphNodes.set(id, node);
                attach(node, false);
            }
            return id;
        };
        for (const path of groundWalkingPaths()) {
            for (const [index, to] of path.points.entries()) {
                const from = path.points[index - 1];
                if (!from) {
                    continue;
                }
                const cost = Math.hypot(to.x - from.x, to.z - from.z);
                if (cost === 0) {
                    continue;
                }
                const west = Math.min(from.x, to.x) - .01;
                const east = Math.max(from.x, to.x) + .01;
                const north = Math.min(from.z, to.z) - .01;
                const south = Math.max(from.z, to.z) + .01;
                const nearby = obstructions.filter(b => b.east >= west && b.west <= east && b.south >= north && b.north <= south);
                if (nearby.length) {
                    const strip = polygon(passageOutline(from, to, .02));
                    if (nearby.some(b => clipping.intersection(strip, b.shape).length)) {
                        continue;
                    }
                }
                graphEdges.push({
                    from: streetNode(from), to: streetNode(to),
                    kind: 'walk', cost, street: true, directed: path.oneWay
                });
            }
        }
    }
    const places = walkingPlaces();
    const gateEdges = edges.filter(edge => edge.kind === 'gate');
    const gateSides = new Map<string, boolean>();
    for (const edge of gateEdges) {
        for (const id of [edge.from, edge.to]) {
            const place = places.find(place => place.id === id);
            gateSides.set(id, place ? place.access === 'inside' : onPaidFloor(graphNodes.get(id)!));
        }
    }
    for (const id of new Set(edges.flatMap(edge => [edge.from, edge.to]))) {
        const node = graphNodes.get(id)!;
        attach(node, gateSides.get(id) ?? onPaidFloor(node));
    }
    for (const connection of layout.connections) {
        for (const node of [connection.from, connection.to]) {
            if (!graphNodes.has(node.id)) {
                graphNodes.set(node.id, node);
            }
        }
        const paid = onPaidFloor(connection.from);
        if (paid !== onPaidFloor(connection.to)) {
            continue;
        }
        const from = attach(connection.from, paid, connection.id);
        const to = attach(connection.to, paid, connection.id);
        const { id: a } = connection.from;
        const { id: b } = connection.to;
        const directed = connection.kind === 'escalator' && connection.travelDirection;
        if (from && to && (connection.kind !== 'escalator' || directed) &&
            !edges.some(e => (e.from === a && e.to === b) || (e.from === b && e.to === a))) {
            const reverse = directed === 'to-from';
            graphEdges.push({
                from: reverse ? b : a, to: reverse ? a : b, kind: connection.kind,
                ...(directed ? { directed: true } : {}),
                cost: Math.hypot(connection.from.x - connection.to.x, connection.from.z - connection.to.z,
                    elevation(connection.from) - elevation(connection.to))
            });
        }
    }
    const approaches = new Map(walkingApproaches(facilities, places, nodes, layout.areas, layout.platforms, openings));
    const exactFacilities = new Set(places.map(place => place.facilityId));
    const platforms = new Map(layout.platforms.map(platform => [platform.id, platform]));
    for (const port of publicInterfaces) {
        const center = { x: (port.inside.x + port.outside.x) / 2, z: (port.inside.z + port.outside.z) / 2 };
        const existing = gateEdges.find(edge => {
            const a = graphNodes.get(edge.from)!;
            const b = graphNodes.get(edge.to)!;
            return a.level === port.level && b.level === port.level &&
                Math.hypot(center.x - (a.x + b.x) / 2, center.z - (a.z + b.z) / 2) < 4;
        });
        if (existing) {
            if (!exactFacilities.has(port.gateId)) {
                const outside = gateSides.get(existing.from) ? existing.to : existing.from;
                approaches.set(port.gateId, [{ id: outside, distance: 0 }]);
            }
            continue;
        }
        const offset = port.elevation - elevation({ level: port.level });
        const outside = { ...port.outside, id: 'walk:gate:out:' + port.id, level: port.level, elevationOffset: offset };
        const inside = { ...port.inside, id: 'walk:gate:in:' + port.id, level: port.level, elevationOffset: offset };
        graphNodes.set(outside.id, outside);
        graphNodes.set(inside.id, inside);
        if (attach(outside, false)) {
            approaches.set(port.gateId, [{ id: outside.id, distance: 0 }]);
            if (attach(inside, true)) {
                graphEdges.push({ from: outside.id, to: inside.id, kind: 'gate', cost: 4 });
            }
        }
    }
    for (const facility of facilities) {
        if (exactFacilities.has(facility.id) || facility.kind === 'gate') {
            continue;
        }
        const { x, z, level, elevationOffset } = facility;
        const node = { x, z, level, elevationOffset, id: 'walk:facility:' + facility.id };
        graphNodes.set(node.id, node);
        if (attach(node, onPaidFloor(node), facility.connectionId)) {
            approaches.set(facility.id, [{ id: node.id, distance: 0 }]);
            continue;
        }
        const platform = facility.kind === 'platform' && facility.platformId && platforms.get(facility.platformId);
        if (platform) {
            const outline = platformOutline(platform);
            const face = faces.get(plane(node, true));
            const onPlatform = face?.triangles.filter(triangle => pointInPolygon(graphNodes.get(triangle.id)!, outline)) ?? [];
            // The label may be above a lift or stairwell. Use an actual point on the same platform.
            const nearest = onPlatform.sort((a, b) => {
                const first = graphNodes.get(a.id)!;
                const second = graphNodes.get(b.id)!;
                return Math.hypot(first.x - x, first.z - z) - Math.hypot(second.x - x, second.z - z);
            })[0];
            if (nearest) {
                approaches.set(facility.id, [{ id: nearest.id, distance: 0 }]);
                visibilityWalks.get(nearest.region)?.anchors.push(graphNodes.get(nearest.id)!);
            }
        }
    }
    // Long, thin platform triangles can route past the destination just to go around a stairwell.
    for (const [region, { face, id, anchors }] of visibilityWalks) {
        if (anchors.length < 2) {
            continue;
        }
        const points = [...new Map(anchors.map(node => [node.id, node])).values(),
            ...walkableCorners(region).map((point, index) => addNode(id + ':' + index, face, point))];
        for (const [i, from] of points.entries()) {
            for (let j = i + 1; j < points.length; j++) {
                const to = points[j]!;
                if (walkableChord(from, to, region)) {
                    walk(from.id, to.id, region);
                }
            }
        }
    }
    // A two-way indoor edge may share a shortcut only when the entire authored segment is inside the same face.
    for (const edge of edges) {
        if (edge.kind !== 'walk' || edge.directed || edge.street) {
            continue;
        }
        const region = nodeRegions.get(edge.from);
        const from = graphNodes.get(edge.from)!;
        const to = graphNodes.get(edge.to)!;
        if (region && region === nodeRegions.get(edge.to) && from.level === to.level && walkableChord(from, to, region)) {
            meshRegions.set(meshEdgeKey(edge.from, edge.to), region);
        }
    }
    return {
        nodes: [...graphNodes.values()], edges: graphEdges, places, approaches: [...approaches],
        shapeLeg: (leg: readonly string[]) => shapeWalkingLeg(leg, graphNodes, (from, to) => meshRegions.get(meshEdgeKey(from, to)))
    };
}
