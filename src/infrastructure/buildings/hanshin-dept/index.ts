import { messageText } from '../../i18n/index.ts';
import clipping from 'polygon-clipping';
import { volume, type GeographicBuilding } from '../building-data.ts';
import { softenPodium } from '../profile-data.ts';

const source = volume('502411898', messageText('buildings.hanshinDept.volumes.level502411898.name'), 0, 14);
const groundOutline = softenPodium(source.outline, 8);
const references = [
    'https://www.nihonsekkei.co.jp/projects/18825/',
    'https://office.hankyu-hanshin.co.jp/twin-south/outline/',
];
// The street-level L is not the envelope of the upper retail floors. Those
// bridge the road and form one continuous podium under the inset office tower.
// Only infill the narrow inner retreat. The former world-axis rectangle
// incorrectly pushed a large block through the curved street frontage.
const bridgeOutline = [
    { x: 672, z: 766 },
    { x: 705, z: 821 },
    { x: 716, z: 816 },
    { x: 683, z: 761 }
];
const upperRegion = clipping.union(
    [groundOutline.map(p => [p.x, p.z] as [
        number,
        number
    ])],
    [bridgeOutline.map(p => [p.x, p.z] as [
        number,
        number
    ])]
);
const podium = {
    ...source,
    outline: groundOutline,
    facade: 'vertical' as const,
    surface: 'podium' as const,
};
const upper = {
    ...source,
    name: messageText('buildings.hanshinDept.upper.name'),
    outline: upperRegion[0]![0]!.map(([x, z]) => ({ x, z })),
    holes: upperRegion[0]!.slice(1).map(r => r.map(([x, z]) => ({ x, z }))),
    base: 14,
    top: 52,
    facade: 'vertical' as const,
    surface: 'podium' as const,
    support: 'over-road' as const,
    references,
    note: 'Unified retail envelope across the road, not a second office shaft. Ground clearance, terrace setback and upper extent are reference fits, not surveyed or walkable floors.',
};
const office = {
    ...source,
    name: messageText('buildings.hanshinDept.office.name'),
    // Independent straight-sided office slab, not an intersection with the
    // rounded retail envelope: clipping that envelope produced an acute tip.
    outline: [[-48, -21], [48, -21], [48, 21], [-48, 21]].map(([u, v]) => {
        const angle = -31.65 * Math.PI / 180;
        return {
            x: 625 + u! * Math.cos(angle) - v! * Math.sin(angle),
            z: 769 + u! * Math.sin(angle) + v! * Math.cos(angle)
        };
    }),
    base: 52,
    top: 188.9,
    facade: 'grid' as const,
    surface: 'tower' as const,
    references,
    note: 'Single elongated office tower along the podium street frontage, aligned with the southwest–northeast wing. User oblique and overhead references correct the former east-only square crop. Extent and setbacks are illustrative; no historical PLATEAU Hanshin geometry is used.',
};
export const building: GeographicBuilding = {
    id: 'hanshin-dept',
    name: messageText('buildings.hanshinDept.entities.hanshinDept.name'),
    volumes: [podium, upper, office],
};
