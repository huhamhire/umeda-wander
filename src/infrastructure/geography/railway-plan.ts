import { messageText } from '../i18n/index.ts';
import { toGeographicPlan } from '../../domain/map/spatial-block.ts';
import { geographicFrame } from './frame.ts';
import type { OsmPlanFeature } from './osm-envelope.ts';

/** Separate physical rail reference; never converted to a pedestrian route. */
export function surfaceRailwayPlan(features: OsmPlanFeature[]) {
    return features.filter(f => f.tags.railway === 'rail' && Number(f.tags.layer ?? 0) >= 0 &&
        (!f.tags.tunnel || f.tags.tunnel === 'no' || f.tags.tunnel === 'building_passage'))
        .map(f => ({
            id: `osm-rail-${f.id}`,
            source: `https://www.openstreetmap.org/way/${f.id}`,
            name: f.tags.name ?? messageText('railways.labels.generic'),
            operator: f.tags.operator ?? '',
            points: f.coordinates.map(p => toGeographicPlan({ lon: p[0]!, lat: p[1]! }, geographicFrame)),
            // Approximate track-bed width; not measured land ownership or clearance.
            bedWidth: 4.2
        }));
}
