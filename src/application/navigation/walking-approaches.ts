import clipping, { type Polygon } from 'polygon-clipping';
import type { Facility, FloorArea, FloorOpening, Platform, Point2, RouteNode } from '../../domain/map/model.ts';
import { passageOutline, platformOutline, pointInPolygon } from '../../domain/map/geometry.ts';
import type { WalkingApproach, WalkingPlace } from './walking-route.ts';

type WalkingSurface = Pick<FloorArea, 'outline' | 'holes' | 'level' | 'elevationOffset'>;

/** Limit schematic approaches to the immediate surroundings of the facility in map metres. */
const nearbyApproachLimit = 50;

/** Convert one modeled walkable surface, including its cutouts, to a clipping polygon. */
function polygon(surface: Pick<WalkingSurface, 'outline' | 'holes'>): Polygon {
    return [surface.outline, ...surface.holes ?? []].map(ring => ring.map(({ x, z }) => [x, z]));
}

/** Confirm that a point is on usable floor rather than in a floor opening. */
function contains(surface: Pick<WalkingSurface, 'outline' | 'holes'>, point: Point2): boolean {
    return pointInPolygon(point, surface.outline) && !surface.holes?.some(hole => pointInPolygon(point, hole));
}

/**
 * Find named graph approaches on the same modeled floor face and gate side.
 * The unobstructed local strip ranks alternatives only and is never added to the graph.
 */
export function walkingApproaches(
    facilities: readonly Facility[],
    places: readonly WalkingPlace[],
    nodes: readonly RouteNode[],
    areas: readonly FloorArea[],
    platforms: readonly Platform[],
    openings: readonly FloorOpening[]
): [string, WalkingApproach[]][] {
    const exact = new Set(places.map(place => place.facilityId));
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const platformSurfaces = platforms.map(platform => ({
        id: platform.id,
        level: platform.level,
        outline: platformOutline(platform)
    }));
    const entries: [string, WalkingApproach[]][] = [];
    for (const facility of facilities) {
        // A gate without a verified approach does not establish which side can be used.
        if (exact.has(facility.id) || facility.kind === 'gate') {
            continue;
        }
        const samePlane = (surface: Pick<WalkingSurface, 'level' | 'elevationOffset'>) => surface.level === facility.level &&
            (surface.elevationOffset ?? 0) === (facility.elevationOffset ?? 0);
        const floorAreas = areas.filter(samePlane);
        const paid = [...floorAreas.filter(area => area.kind === 'paid'), ...platformSurfaces.filter(samePlane)];
        const publicFloors = floorAreas.filter(area => area.kind === 'public');
        const onPaidSide = paid.some(surface => contains(surface, facility));
        const surfaces = (onPaidSide ? paid : publicFloors).filter(surface => contains(surface, facility));
        if (!surfaces.length) {
            continue;
        }
        const blockers = [
            ...floorAreas.filter(area => area.kind === 'commercial' || area.kind === 'service'),
            ...openings.filter(opening => opening.level === facility.level),
            ...onPaidSide ? [] : paid
        ];
        const candidates: WalkingApproach[] = [];
        for (const place of places) {
            const anchor = nodeById.get(place.id);
            if (!anchor || place.level !== facility.level || !samePlane(anchor) || (place.access === 'inside') !== onPaidSide) {
                continue;
            }
            const distance = Math.hypot(facility.x - anchor.x, facility.z - anchor.z);
            if (distance > nearbyApproachLimit) {
                continue;
            }
            const strip = distance > 0 ? polygon({ outline: passageOutline(facility, anchor, .35) }) : undefined;
            const clear = surfaces.some(surface => contains(surface, anchor) &&
                (!strip || clipping.difference(strip, polygon(surface)).length === 0));
            if (clear && !blockers.some(block => strip ? clipping.intersection(strip, polygon(block)).length > 0 : contains(block, facility))) {
                candidates.push({ id: place.id, distance });
            }
        }
        if (candidates.length) {
            entries.push([facility.id, candidates.sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))]);
        }
    }
    return entries;
}
