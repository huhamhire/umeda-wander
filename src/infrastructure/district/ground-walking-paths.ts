import context from '../../../data/geography/display-context.json' with { type: 'json' };
import { projectDistrictPoint } from '../../domain/map/geography.ts';
import { geographicFrame } from '../geography/frame.ts';
import { geographicPlan } from './geographic-map.ts';

interface GroundFeature {
    id: string;
    properties: Record<string, string | undefined>;
    geometry: { type: string; coordinates: unknown };
}

/** Retain the source geometry of public pedestrian ways displayed at ground level. */
export function groundWalkingPaths() {
    const retained = new Set(context.surfaces.filter(surface => surface.kind === 'road').map(surface => surface.id));
    const pedestrian = new Set(['footway', 'pedestrian', 'path', 'living_street']);
    const denied = new Set(['private', 'no', 'customers', 'destination', 'permit']);
    const features = geographicPlan.ground as GroundFeature[];
    return features.filter(({ id, geometry, properties: tags }) =>
        geometry.type === 'LineString' && retained.has(id) &&
        (pedestrian.has(tags.highway ?? '') || tags.foot === 'designated') &&
        !denied.has(tags.access ?? '') && !denied.has(tags.foot ?? '') &&
        (!tags.layer || tags.layer === '0') && (!tags.level || tags.level === '0') &&
        (!tags.bridge || tags.bridge === 'no') && (!tags.tunnel || tags.tunnel === 'no') && tags.indoor !== 'yes'
    ).map(({ properties: tags, geometry }) => {
        const points = (geometry.coordinates as [number, number][]).map(([lon, lat]) =>
            projectDistrictPoint({ lon, lat }, geographicFrame.origin, 90, 1, { x: 0, z: 0 })
        );
        if (tags['oneway:foot'] === '-1') {
            points.reverse();
        }
        return { points, oneWay: tags['oneway:foot'] === 'yes' || tags['oneway:foot'] === '-1' };
    });
}
