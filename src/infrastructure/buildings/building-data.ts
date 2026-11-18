import clipping from 'polygon-clipping';
import plan from '../../../data/geography/runtime-plan.json' with { type: 'json' };
import parts from '../../../data/geography/building-parts.json' with { type: 'json' };
import type { Point2 } from '../../domain/map/model.ts';

export interface BuildingVolume {
    name: string;
    outline: Point2[];
    holes: Point2[][];
    base: number;
    top: number;
    source: string;
    certainty: 'osm-height' | 'estimate' | 'plateau-lod2';
    note: string;
    references?: string[];
    facade?: 'bands' | 'vertical' | 'grid' | 'plain';
    support?: 'over-road' | 'over-atrium';
    surface?: 'podium' | 'tower';
}

export interface BuildingSign {
    text: string;
    center: Point2;
    y: number;
    width: number;
    height: number;
    angle: number;
}

export interface BuildingEntrance {
    center: Point2;
    angle: number;
    width: number;
    depth: number;
    height: number;
    note: string;
}

export interface BuildingGallery {
    name: string;
    outline: Point2[];
    innerOutline: Point2[];
    y: number;
    note: string;
    source: string;
}

export interface GeographicBuilding {
    id: string;
    name: string;
    volumes: BuildingVolume[];
    signs?: BuildingSign[];
    entrance?: BuildingEntrance;
    galleries?: BuildingGallery[];
    wheel?: FerrisWheel;
}

/** Procedural landmark dimensions; placement is a reference fit, not a surveyed asset. */
export interface FerrisWheel {
    center: Point2;
    centerHeight: number;
    radius: number;
    heading: number;
    depth: number;
    cabins: number;
    source: string;
}

/**
 * Project source longitude and latitude into the shared district metre frame, with east x and south z.
 */
const project = (p: number[]): Point2 => ({ x: (p[0]! - 135.491) * 111320 * Math.cos(34.708 * Math.PI / 180), z: (34.708 - p[1]!) * 111320 });
/**
 * Read an OSM building part or ground footprint by stable ID, preserving holes and provenance.
 */
export function footprint(id: string) {
    const part = parts.find(p => p.id === id);
    if (part) {
        return { outline: part.coordinates.map(project), holes: [] as Point2[][] };
    }
    const raw = plan.ground.find(f => f.id === (id.includes('/') ? id : 'way/' + id));
    if (!raw) {
        throw new Error('Missing building ' + id);
    }
    const f = raw as unknown as {
        geometry: {
            type: string;
            coordinates: number[][][];
        };
    };
    let rings: number[][][] | undefined;
    if (f.geometry.type === 'MultiPolygon') {
        const polygons = f.geometry.coordinates as unknown as number[][][][];
        if (polygons.length === 1) {
            rings = polygons[0];
        }
    }
    else if (f.geometry.type === 'Polygon') {
        rings = f.geometry.coordinates;
    }
    if (!rings) {
        throw new Error('Expected single building polygon ' + id);
    }
    return { outline: rings[0]!.map(project), holes: rings.slice(1).map(r => r.map(project)) };
}

/**
 * Attach display heights, provenance and estimation limits to an independent building volume.
 */
export function volume(
    id: string,
    name: string,
    base: number,
    top: number,
    certainty: BuildingVolume['certainty'] = 'estimate'
): BuildingVolume {
    return {
        name,
        ...footprint(id),
        base,
        top,
        source: 'https://www.openstreetmap.org/way/' + id,
        certainty,
        note: certainty === 'osm-height' ? 'Height tag in repository OSM snapshot; not independently surveyed.' : 'Height or part extent estimated from reference silhouettes; not surveyed.'
    };
}

/** Approximate upper parts are clipped to their own host envelope. */
export function insetPart(
    host: BuildingVolume,
    name: string,
    base: number,
    top: number,
    xMin = 0,
    xMax = 1,
    zMin = 0,
    zMax = 1
): BuildingVolume {
    const xs = host.outline.map(p => p.x);
    const zs = host.outline.map(p => p.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const rect = [
        { x: minX + (maxX - minX) * xMin, z: minZ + (maxZ - minZ) * zMin },
        { x: minX + (maxX - minX) * xMax, z: minZ + (maxZ - minZ) * zMin },
        { x: minX + (maxX - minX) * xMax, z: minZ + (maxZ - minZ) * zMax },
        { x: minX + (maxX - minX) * xMin, z: minZ + (maxZ - minZ) * zMax }
    ];
    const clipped = clipping.intersection(
        [host.outline.map(p => [p.x, p.z] as [
            number,
            number
        ])],
        [rect.map(p => [p.x, p.z] as [
            number,
            number
        ])]
    );
    if (!clipped[0]) {
        throw new Error('Empty tower ' + name);
    }
    return {
        ...host,
        name,
        base,
        top,
        certainty: 'estimate',
        note: 'Reference-derived upper silhouette clipped to host; height/setback estimated.',
        outline: clipped[0][0]!.map(([x, z]) => ({ x, z })),
        holes: []
    };
}

/** Reference silhouette in a building-aligned frame, rather than an east/north crop. */
export function alignedPart(
    host: BuildingVolume,
    name: string,
    base: number,
    top: number,
    angle: number,
    u0: number,
    u1: number,
    v0: number,
    v1: number
): BuildingVolume {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const local = host.outline.map(p => ({ x: p.x * c + p.z * s, z: -p.x * s + p.z * c }));
    const crop = insetPart({ ...host, outline: local }, name, base, top, u0, u1, v0, v1);
    return { ...crop, outline: crop.outline.map(p => ({ x: p.x * c - p.z * s, z: p.x * s + p.z * c })) };
}

/**
 * Sample normalized coordinates in the building’s rotated envelope instead of an axis-aligned map box.
 */
export function alignedPoint(outline: Point2[], angle: number, u: number, v: number): Point2 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const xs = outline.map(p => p.x * c + p.z * s);
    const zs = outline.map(p => -p.x * s + p.z * c);
    const x = Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * u;
    const z = Math.min(...zs) + (Math.max(...zs) - Math.min(...zs)) * v;
    return { x: x * c - z * s, z: x * s + z * c };
}
