import { passageOutline } from '../../../domain/map/geometry.ts';
import type { Evidence, FloorArea, VerticalConnection } from '../../../domain/map/model.ts';
import { messageText } from '../../i18n/index.ts';
import { sourceDeckPaths } from '../elevated-source.ts';

const id = 'public-south-hankyu-bridge-stairs';
const blockId = 'south-decks';
const upper = sourceDeckPaths(['bridge-north']).find(path => path.id === 'bridge-north:336421843')!.points[0]!;
const lower = { x: 622.39, z: 618.64 };
const evidence: Evidence = {
    source: 'district',
    pages: [],
    urls: ['https://www.openstreetmap.org/way/336421852', 'https://www.openstreetmap.org/way/385629423'],
    detail: 'The exterior stair shares the terminal node of the Umeda pedestrian bridge (梅田新歩道橋) north arm and meets the mapped footway at grade. Width and tread geometry are display fits.'
};

export const hankyuBridgeStairs: VerticalConnection = {
    id,
    blockId,
    kind: 'stairs',
    placement: 'exterior',
    width: 3.4,
    from: { ...lower, id: id + '-ground', level: 'district-ground' },
    to: { ...upper, id: id + '-deck', level: 'district-south-deck' },
    evidence,
};

const run = Math.hypot(lower.x - upper.x, lower.z - upper.z);
const dx = (lower.x - upper.x) / run;
const dz = (lower.z - upper.z) / run;

// Remove the default rounded cap on the downhill side. The top tread meets the straight deck edge.
export const hankyuBridgeStairNotch = {
    outline: passageOutline({ x: upper.x + dx * .12, z: upper.z + dz * .12 }, lower, 6.4)
};

export const hankyuBridgeGroundLanding: FloorArea = {
    id: hankyuBridgeStairs.from.id + ':landing',
    blockId,
    level: 'district-ground',
    name: messageText('publicAreas.deckAccess.landing.name'),
    kind: 'public',
    outline: passageOutline({ x: lower.x - dx, z: lower.z - dz }, { x: 625.1, z: 627.32 }, 3.4),
    label: false,
    evidence,
};
