import type { SpatialEnvelope } from '../../domain/map/spatial-block.ts';
import { toGeographicPlan } from '../../domain/map/spatial-block.ts';
import { geographicFrame } from './frame.ts';

export interface OsmPlanFeature {
    id: string;
    kind?: string;
    version: string;
    tags: Record<string, string>;
    coordinates: number[][];
    outerRings?: number[][][];
    holes?: number[][][];
    polygons?: number[][][][];
}

/** Snapshot supplied by build/CLI; no filesystem or remote fetch in runtime data. */
export function osmBuildingEnvelopes(features: OsmPlanFeature[], id: string): SpatialEnvelope[] {
    const f = features.find(feature => feature.id === id && feature.tags.building);
    if (!f) {
        throw new Error(`Missing OSM building ${id}`);
    }
    if (!f.polygons && (f.outerRings?.length ?? 0) > 1) {
        throw new Error(`Unassigned OSM polygon holes: ${id}`);
    }
    // Each multipolygon component owns its holes; never merge separate buildings.
    const polygons = f.polygons ?? [(f.outerRings ?? [f.coordinates]).concat(f.holes ?? [])];
    const project = (ring: number[][]) => ring.map(p => {
        if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
            throw new Error(`Invalid OSM coordinate: ${id}`);
        }
        return toGeographicPlan({ lon: p[0]!, lat: p[1]! }, geographicFrame);
    });
    return polygons.map((rings, i) => ({
        id: `osm-${id}-${i}`,
        role: 'building',
        outline: project(rings[0]!),
        holes: rings.slice(1).map(project),
        source: `https://www.openstreetmap.org/${f.kind ?? 'way'}/${id}`,
        certainty: 'source-geometry'
    }));
}
