import { messageText } from '../../i18n/index.ts';
import type { PublicBlockDefinition } from '../../../domain/map/public-area.ts';
import { box, districtUndergroundEvidence } from '../underground-source.ts';

/** Covers LUCUA, Umekita public approach and Yodobashi; masks only divide ownership. */
export const northAtriumBlock: PublicBlockDefinition = {
    id: 'north-atrium-b1',
    name: messageText('publicAreas.northAtrium.entities.northAtriumB1.name'),
    mask: box(-2000, -2000, 560, 650),
    evidence: {
        ...districtUndergroundEvidence,
        urls: [
            ...districtUndergroundEvidence.urls!,
            'https://www.westjr.co.jp/global/en/timetable/pdf/station_osaka.pdf'
        ],
        detail: districtUndergroundEvidence.detail + ' JR p6 confirms public routing along north of LUCUA 1100; separate from paid B2 west walkway.'
    }
};
