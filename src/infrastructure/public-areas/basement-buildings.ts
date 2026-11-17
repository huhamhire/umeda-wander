import { messageText } from '../i18n/index.ts';
import { footprint } from '../buildings/building-data.ts';
import type { BasementOccupancy } from '../../domain/map/public-area.ts';
import { districtUndergroundEvidence } from './underground-source.ts';
import { referenceBasements } from './south-diamor/basement-outlines.ts';

/** Host envelopes only; underground leasing/interior plans are not represented. */
const buildings = [
    ['lucua-1100', 'LUCUA 1100', '1313244350'],
    ['lucua', 'LUCUA', '1313244351'],
    ['yodobashi', 'Yodobashi / LINKS UMEDA', '788888925'],
    ['daimaru', messageText('publicAreas.basementBuildings.items.daimaru.name'), '161450829'],
    ['hankyu-dept', messageText('publicAreas.basementBuildings.items.hankyuDept.name'), '588689735'],
    ['hankyu-grand', messageText('publicAreas.basementBuildings.items.hankyuGrand.name'), '162157689'],
    ['hanshin-dept', messageText('publicAreas.basementBuildings.items.hanshinDept.name'), '502411898'],
    ['jp-tower', 'JP Tower／KITTE', '1146510724'],
    ['osaka-ekimae-1', messageText('publicAreas.basementBuildings.items.osakaEkimae1.name'), '70561756'],
    ['osaka-ekimae-2', messageText('publicAreas.basementBuildings.items.osakaEkimae2.name'), '70561758'],
    ['osaka-ekimae-3', messageText('publicAreas.basementBuildings.items.osakaEkimae3.name'), 'relation/6803731'],
    ['osaka-ekimae-4', messageText('publicAreas.basementBuildings.items.osakaEkimae4.name'), '135624700'],
    ['umeda-dt', messageText('publicAreas.basementBuildings.items.umedaDt.name'), '162158019'],
    ['daiichi-life', messageText('publicAreas.basementBuildings.items.daiichiLife.name'), '162158153'],
    ['e-ma', 'E-ma', '162158020'],
    ['hilton-east', 'Hilton Plaza East', '162158151'],
    ['hilton-west', 'Hilton Plaza West', '162158150'],
] as const;
export const basementOccupancies: BasementOccupancy[] = buildings.map(([id, name, way]) => {
    const reference = referenceBasements.find(b => b.id === id);
    return {
        id,
        name,
        region: reference?.region ?? footprint(way),
        evidence: {
            ...(reference?.evidence ?? districtUndergroundEvidence),
            urls: [
                ...districtUndergroundEvidence.urls!,
                'https://www.openstreetmap.org/' + (way.includes('/') ? way : 'way/' + way),
            ],
            detail: reference?.evidence.detail ?? districtUndergroundEvidence.detail
                + ' Named host building in district underground map; OSM host outline clipped by public faces and paid station interiors.'
                + ' Filled area is occupancy only, not confirmed walkable basement or a shop plan.',
        },
    };
});
basementOccupancies.push(...referenceBasements.filter(b => !basementOccupancies.some(existing => existing.id === b.id)));
