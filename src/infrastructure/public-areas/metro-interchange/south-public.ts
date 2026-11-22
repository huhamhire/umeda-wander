import clipping from 'polygon-clipping';
import type { Evidence, FloorArea } from '../../../domain/map/model.ts';
import { joinedPassageOutlines } from '../../../domain/map/geometry.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { metroPlanOutline } from '../../stations/metro-umeda/geographic.ts';
import { messageText } from '../../i18n/index.ts';

const blockId = 'metro-interchange-b1';
const operatorPlan = 'https://subway.osakametro.co.jp/station_guide/station/M16_%E6%A2%85%E7%94%B0_%E6%A7%8B%E5%86%85%E5%9B%B3_1.pdf';

/** Remove the misplaced source-PDF branch before joining the mapped public walks and stair approach. */
export function calibrateMetroSouthPublicOutline(network: clipping.MultiPolygon): clipping.MultiPolygon {
    const outline = metroPlanOutline([[-17, -86], [-17, -13.5], [-55, -13.5], [-55, -50], [-27, -86]]);
    return clipping.difference(network, [outline.map((p): clipping.Pair => [p.x, p.z])]);
}

/** Reuse OSM B1 nodes at the JR branch, exit 18 landing, and their documented public junctions. */
export function metroSouthPublicApproaches(): FloorArea[] {
    const branches = [
        {
            id: 'jr-central-approach',
            points: [[135.4961261, 34.7020757], [135.4969704, 34.7025023], [135.4974613, 34.7025872], [135.4974478, 34.7029444]],
            width: 6,
            ways: ['1010195576'],
            detail: 'The mapped B1 JR Osaka Station (JR大阪駅) branch approaches the central gates away from the south paid wall.'
        },
        {
            id: 'exit-18-approach',
            points: [[135.4977362, 34.7020506], [135.4978497, 34.7018842], [135.4981815, 34.7020391]],
            width: 5,
            ways: ['1338274268', '1010195556'],
            detail: 'Exit 18 (18号出入口) joins the south public passage at a shared OSM node. The branch runs away from the station wall.'
        }
    ];
    return branches.flatMap(({ id, points, width, ways, detail }) => {
        const evidence: Evidence = {
            source: 'metro',
            pages: [1],
            urls: [operatorPlan, ...ways.map(way => 'https://www.openstreetmap.org/way/' + way)],
            detail: detail + ' Centreline retained and width fitted.'
        };
        const axis = points.map(([lon, lat]) => toGeographicPlan({ lon: lon!, lat: lat! }, geographicFrame));
        return joinedPassageOutlines(axis, width).map((outline, i) => ({
            id: 'm16-' + id + '-' + i,
            blockId,
            level: 'district-underground',
            name: messageText('publicAreas.metroInterchange.entities.metroInterchangeB1.name'),
            kind: 'public',
            outline,
            label: false,
            evidence,
        }));
    });
}
