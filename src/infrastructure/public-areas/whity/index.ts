import { messageText } from '../../i18n/index.ts';
import type { PublicBlockDefinition } from '../../../domain/map/public-area.ts';
import { box, districtUndergroundEvidence } from '../underground-source.ts';

export const whityBlocks: PublicBlockDefinition[] = [
    {
        id: 'hankyu-basements',
        name: messageText('publicAreas.whity.entities.hankyuBasements.name'),
        mask: box(560, -2000, 2000, 430),
        evidence: districtUndergroundEvidence
    },
    {
        id: 'whity-b1',
        name: messageText('publicAreas.whity.entities.whityB1.name'),
        mask: box(705, 430, 2000, 1050),
        evidence: districtUndergroundEvidence
    },
];
