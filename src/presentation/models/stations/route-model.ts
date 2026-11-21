import * as T from 'three';
import type { LevelId, RouteNode, VerticalConnection } from '../../../domain/map/model.ts';
import { routeEscalators, routePath, type RoutePathPoint } from '../../../application/navigation/route-path.ts';
import { equipmentBaseLift, escalatorStepCount } from '../../../application/connections/connection-lanes.ts';
import { ModelPrimitives } from '../model-primitives.ts';
import { colors } from '../../appearance/scene-palette.ts';

const routeOverlayLift = 1.3;
const escalatorArrowRadius = .32;

/** Share the route beam thickness with the playback marker's tip clearance. */
export function routeBeamRadius(from: RoutePathPoint, to: RoutePathPoint): number {
    return from.escalator || to.escalator ? .18 : .38;
}

/** Keep the full arrow above the treads as floor separation stretches their rise. */
export function routePointElevation(point: RoutePathPoint, levelY: (id: LevelId) => number): number {
    const elevation = (node: RouteNode) => levelY(node.level) + (node.elevationOffset ?? 0);
    const y = elevation(point);
    if (!point.escalator) {
        return y + routeOverlayLift;
    }
    const { from, to } = point.escalator;
    const rise = Math.abs(elevation(from) - elevation(to));
    const run = Math.hypot(from.x - to.x, from.z - to.z);
    const stepOverSlope = rise / (2 * escalatorStepCount);
    const arrowClearance = escalatorArrowRadius * Math.hypot(1, rise / Math.max(run, 1));
    return y + Math.max(routeOverlayLift, equipmentBaseLift + .2 + stepOverSlope + arrowClearance);
}

/** Own illustrative route meshes without adding edges or interpreting station layout. */
export class RouteModel {
    readonly group = new T.Group();
    private readonly nodeById: Map<string, RouteNode>;
    private readonly primitives = new ModelPrimitives();
    private readonly escalators: ReturnType<typeof routeEscalators>;

    /** Index the existing local route nodes; no cross-station paths are created here. */
    constructor(nodes: RouteNode[], connections: readonly VerticalConnection[] = []) {
        this.nodeById = new Map(nodes.map(node => [node.id, node]));
        this.escalators = routeEscalators(connections);
    }

    /** Use the same polyline for route meshes and playback. */
    path(ids: readonly string[]) {
        return routePath(ids.map(id => this.nodeById.get(id)!), this.escalators);
    }

    /**
     * Dispose existing route geometry and remove route objects.
     */
    private clearRoute(): void {
        this.group.traverse(obj => {
            if (obj instanceof T.Mesh) {
                obj.geometry.dispose();
            }
        });
        this.group.clear();
    }

    /**
     * Rebuild the illustrative route from selected nodes, clearing it when no route is selected.
     */
    update(
        ids: readonly string[] | null, levelY: (id: LevelId) => number, visible: (id: LevelId) => boolean, showEndpoints = true
    ): void {
        this.clearRoute();
        if (!ids?.length) {
            return;
        }
        const nodes = this.path(ids);
        const points = nodes.map(node => new T.Vector3(node.x, routePointElevation(node, levelY), node.z));
        for (let i = 0; i < points.length - 1; i++) {
            if (!visible(nodes[i]!.level) || !visible(nodes[i + 1]!.level)) {
                continue;
            }
            const a = points[i]!;
            const b = points[i + 1]!;
            if (a.distanceToSquared(b) < 1e-6) {
                continue;
            }
            const narrow = nodes[i]!.escalator !== undefined || nodes[i + 1]!.escalator !== undefined;
            this.primitives.beam(this.group, a, b, routeBeamRadius(nodes[i]!, nodes[i + 1]!), colors.route);
            const length = a.distanceTo(b);
            // Short bends need a continuous beam, not an arrow larger than the segment.
            if (length < 4) {
                continue;
            }
            const direction = b.clone().sub(a).normalize();
            const markers = Math.max(1, Math.floor(length / 18));
            for (let j = 0; j < markers; j++) {
                const arrow = new T.Mesh(
                    new T.ConeGeometry(narrow ? escalatorArrowRadius : 0.9, narrow ? 1.1 : 2.1, 3),
                    this.primitives.material(colors.route)
                );
                arrow.position.copy(a).lerp(b, (j + .5) / markers);
                arrow.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction);
                this.group.add(arrow);
            }
        }
        if (!showEndpoints) {
            return;
        }
        for (const index of new Set([0, points.length - 1])) {
            if (!visible(nodes[index]!.level)) {
                continue;
            }
            const marker = new T.Mesh(new T.SphereGeometry(0.9, 12, 8), this.primitives.material(colors.route));
            marker.position.copy(points[index]!);
            this.group.add(marker);
        }
    }
}
