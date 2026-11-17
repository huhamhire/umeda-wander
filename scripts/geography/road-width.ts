/** Asphalt-only schematic widths, per OSM way/carriageway, not right-of-way widths. */
export function roadWidth(tags: Record<string, string>) {
    const explicit = Number(tags.width?.replace(/\s*m$/, ''));
    if (Number.isFinite(explicit) && explicit > 0) {
        return { metres: explicit, basis: 'osm-width' };
    }
    const highway = tags.highway ?? '';
    const pedestrian: Record<string, number> = {
        footway: 2,
        path: 1.8,
        cycleway: 2.5,
        pedestrian: 5,
        living_street: 5
    };
    if (pedestrian[highway]) {
        return { metres: pedestrian[highway]!, basis: 'walking-estimate' };
    }
    // User satellite overview: major corridors broad, north commercial side street narrow.
    // Values are visual estimates, not measured lane dimensions.
    const laneWidths: Record<string, number> = {
        '御堂筋': 3.1,
        '国道176号': 3.1,
        '曽根崎通': 3.1,
        '四つ橋筋': 3.05,
        '市道南北線': 2.9,
        '大阪市道九条梅田線': 3.0
    };
    const lanes = Number(tags.lanes);
    if (Number.isInteger(lanes) && lanes > 0 && lanes <= 12) {
        const lane = laneWidths[tags.name ?? ''] ?? (highway.endsWith('_link') ? 3 : 3.0);
        return { metres: Number((lanes * lane + 1).toFixed(1)), basis: 'lanes-estimate' };
    }
    const defaults: Record<string, number> = {
        motorway: 10,
        trunk: 14,
        primary: 14,
        secondary: 11,
        tertiary: 8,
        unclassified: 5,
        residential: 5.5,
        service: 3.5,
        motorway_link: 4.5,
        trunk_link: 4.5,
        primary_link: 4.5,
        secondary_link: 4,
        tertiary_link: 4
    };
    const base = defaults[highway] ?? 4;
    return {
        metres: tags.oneway === 'yes' && !highway.endsWith('_link') ? Math.min(base, 7) : base,
        basis: 'class-estimate'
    };
}
