import metadata from '../../../data/geography/osm-export-metadata.json' with { type: 'json' };
import plan from '../../../data/geography/runtime-plan.json' with { type: 'json' };
import buildingParts from '../../../data/geography/building-parts.json' with { type: 'json' };
import elevatedWays from '../../../data/geography/elevated/ways.json' with { type: 'json' };
import { osmRunningLines } from './runtime-rails.ts';
import { elevatedWidthEstimates } from '../public-areas/elevated-source.ts';

/** Export the OSM subset and attribution, excluding geometry derived from indoor reference plans. */
export function geographicOsmData() {
    return {
        title: metadata.title,
        attribution: '© OpenStreetMap contributors',
        licence: 'https://opendatacommons.org/licenses/odbl/1-0/',
        frame: {
            origin: { lon: 135.491, lat: 34.708 },
            units: 'metres',
            x: 'east',
            z: 'south'
        },
        ground: plan.ground,
        widthEstimates: plan.widths,
        buildingParts,
        runningLines: osmRunningLines,
        elevatedAxes: elevatedWays,
        elevatedWidthEstimates,
        reconstruction: metadata.reconstruction
    };
}
