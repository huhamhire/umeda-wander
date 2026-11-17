import { messageText } from '../../i18n/index.ts';
import type { PublicBlockDefinition } from '../../../domain/map/public-area.ts';
import { box, districtUndergroundEvidence } from '../underground-source.ts';

/** Ordered ownership windows only. Public shape comes entirely from the reviewed reference network. */
export const southernBlocks: PublicBlockDefinition[] = [
    {
        id: 'crost-b1',
        name: messageText('publicAreas.southDiamor.entities.crostB1.name'),
        mask: box(-2000, 650, 705, 780),
        evidence: districtUndergroundEvidence
    },
    {
        id: 'hanshin-west-b1',
        name: messageText('publicAreas.southDiamor.entities.hanshinWestB1.name'),
        mask: box(-2000, 780, 705, 900),
        evidence: districtUndergroundEvidence
    },
    {
        id: 'diamor-b1',
        name: messageText('publicAreas.southDiamor.entities.diamorB1.name'),
        mask: box(-2000, 900, 2000, 1050),
        evidence: districtUndergroundEvidence
    },
    {
        id: 'kitashinchi-public-b1',
        name: messageText('publicAreas.southDiamor.entities.kitashinchiPublicB1.name'),
        mask: box(350, 1050, 960, 1150),
        evidence: districtUndergroundEvidence
    },
    {
        id: 'outer-underground',
        name: messageText('publicAreas.southDiamor.entities.outerUnderground.name'),
        evidence: districtUndergroundEvidence
    },
];
