import { jrAxisPoint } from '../../stations/jr-osaka/ground-frame.ts';
import type { BuildingVolume } from '../building-data.ts';

type LocalPoint = [along: number, across: number];

const plateau = 'https://www.geospatial.jp/ckan/dataset/plateau-27100-osaka-shi-2025';
const dimensions = 'https://www.westjr.co.jp/company/ir/library/fact/pdf/2011/fact09.pdf';
const atrium = 'https://osakastationcity.com/green/atrium/';

/** Fit a readable band to the LOD2 roof envelope of the North Gate Building (ノースゲートビルディング). */
function part(
    host: BuildingVolume,
    outline: LocalPoint[],
    base: number,
    top: number,
    surface: 'podium' | 'tower' = 'podium'
): BuildingVolume {
    return {
        ...host,
        outline: outline.map(([along, across]) => jrAxisPoint(along, across)),
        holes: [],
        base,
        top,
        surface,
        facade: surface === 'tower' ? 'grid' : 'bands',
        references: [plateau, dimensions, atrium],
        note: 'Simplified from 2017 PLATEAU LOD2 roof bands (bldg_a7a0f325-c271-44db-bced-7d3066780c65). The ground fit, atrium soffit and facade are schematic.'
    };
}

/** Build a step with edges parallel to the JR station frame. */
function band(
    host: BuildingVolume,
    along: [number, number],
    across: [number, number],
    base: number,
    top: number,
    surface?: 'podium' | 'tower'
): BuildingVolume {
    const [west, east] = along;
    const [north, south] = across;
    return part(host, [[west, north], [east, north], [east, south], [west, south]], base, top, surface);
}

/** Shape the lower east wing and its terraces, leaving the north atrium open at ground level. */
export function eastWing(host: BuildingVolume): BuildingVolume[] {
    return [
        part(host, [[25, -103], [36, -103], [36, -72.7], [112, -72.7], [123, -64.9], [123, -37.5], [13, -37.5], [13, -69], [25, -69]], 0, 56.3),
        part(host, [[25, -103], [36, -103], [36, -72.7], [110, -72.7], [123, -64.9], [123, -37.5], [13, -37.5], [13, -65], [25, -65]], 56.3, 67.3),
        band(host, [25, 33], [-103, -72.7], 67.3, 72.2),
        band(host, [13, 112], [-65, -37.5], 67.3, 77),
        band(host, [112, 123], [-64.9, -37.5], 67.3, 69)
    ];
}

/** Form the west office tower, stepped low roof, and raised lintel over the main atrium opening. */
export function westWing(host: BuildingVolume, tower: BuildingVolume): BuildingVolume[] {
    return [
        part(host, [[-128, -104], [-27, -104], [-27, -47], [13, -47], [13, -37.5], [-128, -37.5]], 0, 56.3),
        { ...band(host, [-28, 26], [-102.4, -65], 45, 49.9), support: 'over-atrium' },
        band(host, [-128, -90], [-103, -41], 56.3, 62.6),
        band(host, [-90, -27], [-89.4, -37.5], 56.3, 61),
        band(host, [-90, -27], [-74, -37.5], 61, 67.3),
        { ...band(host, [-27, 13], [-65.5, -37.5], 61, 67.3), support: 'over-atrium' },
        band(host, [-33, -27], [-103, -89.4], 56.3, 72.2),
        band(host, [-90, -47], [-69, -37.5], 67.3, 74.9),
        band(host, [-47, 13], [-65.5, -37.5], 67.3, 77),
        band(tower, [-128, -90], [-103, -41], 62.6, 150, 'tower'),
        band(tower, [-121, -98], [-86, -56], 150, 152.6, 'tower')
    ];
}
