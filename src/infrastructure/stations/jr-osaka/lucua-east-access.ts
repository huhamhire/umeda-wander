import type { Evidence, Point2, RouteNode, StationMap, VerticalConnection } from '../../../domain/map/model.ts';
import { messageText } from '../../i18n/index.ts';
import { jrAxisPoint } from './ground-frame.ts';

const evidence: Evidence = {
    source: 'jr',
    pages: [2, 3],
    detail: 'JR floor plans, the Osaka Station City (大阪ステーションシティ) 2F/3F plans and the supplied close-up place the stairs at the east edge of LUCUA (ルクア). Landing dimensions and pitch are approximate.'
};

/** Join the North Gate Building (ノースゲートビルディング) gallery to the 2F Carillon Plaza (カリヨン広場) forecourt. */
export function applyLucuaEastAccess(station: StationMap): void {
    const gallery = messageText('stations.jrOsaka.areas.lucuaTracksideGallery.name');
    const eastLanding = messageText('stations.jrOsaka.areas.lucuaEastLanding.name');
    const upper: RouteNode = { id: 'carillon-66-upper', level: 'bridge', ...jrAxisPoint(126, -42.2) };
    const upperTurn: RouteNode = { id: 'carillon-66-turn-south', level: 'platform', elevationOffset: 4, ...jrAxisPoint(132.6, -42.2) };
    const lowerTurn: RouteNode = { id: 'carillon-66-turn-north', level: 'platform', elevationOffset: 4, ...jrAxisPoint(132.6, -47.8) };
    const lower: RouteNode = { id: 'carillon-66-lower', level: 'platform', ...jrAxisPoint(126, -47.8) };
    station.layout.areas.push(
        {
            id: 'lucua-trackside-gallery',
            level: 'bridge',
            name: gallery,
            kind: 'public',
            railings: true,
            // Share the bridge-north seam, then follow the outer face above the rear of platform 11.
            outline: projectOutline([
                [22, -41.6], [76.25, -41.6], [76.25, -40.2], [121.3, -39.6],
                [121.6, -45], [126, -45], [126, -32.8], [22, -32.8]
            ]),
            evidence
        },
        {
            id: 'lucua-carillon-landing',
            level: 'platform',
            name: eastLanding,
            kind: 'public',
            railings: true,
            // The southern edge continues the JR 2F public floor. The far side meets the north deck.
            outline: projectOutline([[121.7, -56], [152.5, -56], [155, -67], [145, -72], [128, -72], [121.7, -64]]),
            evidence
        },
        {
            id: 'lucua-carillon-stair-turn',
            level: 'platform',
            elevationOffset: 4,
            name: eastLanding,
            kind: 'public',
            height: .4,
            label: false,
            outline: projectOutline([[132.05, -49.55], [135.7, -49.55], [135.7, -40.45], [132.05, -40.45]]),
            evidence
        }
    );
    const flights: VerticalConnection[] = [
        { id: 'carillon-66-upper-flight', kind: 'stairs', from: upperTurn, to: upper, width: 3, placement: 'exterior', evidence },
        { id: 'carillon-66-lower-flight', kind: 'stairs', from: lower, to: lowerTurn, width: 3, placement: 'exterior', evidence }
    ];
    station.layout.connections.push(...flights);
    station.nodes.push(upper, upperTurn, lowerTurn, lower);
}

/** Project the frontage boundaries drawn in the shared railway metre frame. */
function projectOutline(points: [number, number][]): Point2[] {
    return points.map(([along, across]) => jrAxisPoint(along, across));
}
