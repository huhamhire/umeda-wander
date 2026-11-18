import type { StationMap } from '../../domain/map/model.ts';
import { northDecks } from './north-decks/index.ts';
import { southDecks } from './south-decks/index.ts';
import { westDecks } from './west-decks/index.ts';
import { inogateDecks } from './west-decks/inogate.ts';

/**
 * Assemble the north, south, west and Inogate (イノゲート大阪) public deck blocks and portals.
 */
export function createElevatedBlocks(stations: StationMap[]) {
    const parts = [northDecks(stations), southDecks(stations), westDecks(), inogateDecks()];
    return { blocks: parts.flatMap(p => p.blocks), portals: parts.flatMap(p => p.portals) };
}
