import type {StationMap} from '../../domain/map/model.ts';
import {northDecks} from './north-decks/index.ts';
import {southDecks} from './south-decks/index.ts';
import {westDecks} from './west-decks/index.ts';
export function createElevatedBlocks(stations:StationMap[]){
 const parts=[northDecks(stations),southDecks(stations),westDecks()];
 return {blocks:parts.flatMap(p=>p.blocks),portals:parts.flatMap(p=>p.portals)};
}
