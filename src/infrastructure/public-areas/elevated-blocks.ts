import type { StationMap } from '../../domain/map/model.ts';
import { northDecks } from './north-decks/index.ts';
import { southDecks } from './south-decks/index.ts';
import { westDecks } from './west-decks/index.ts';
import { inogateDecks } from './west-decks/inogate.ts';

/**
 * Assemble the north, south, west and Inogate (イノゲート大阪) public deck blocks and portals.
 */
export function createElevatedBlocks(stations: StationMap[]) {
    const south = southDecks(stations);
    const inogate = inogateDecks();
    const parts = [northDecks(stations), south, westDecks(), inogate];
    return {
        blocks: parts.flatMap(p => p.blocks),
        portals: parts.flatMap(p => p.portals),
        buildingOpenings: [...south.buildingOpenings, ...inogate.buildingOpenings],
        inogateCanopy: inogate.canopy
    };
}
