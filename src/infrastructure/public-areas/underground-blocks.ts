import {northAtriumBlock} from './north-atrium/index.ts';
import {metroInterchangeBlock,metroPublicPatches} from './metro-interchange/index.ts';
import {whityBlocks} from './whity/index.ts';
import {southernBlocks} from './south-diamor/index.ts';
export const undergroundBlockDefinitions=[northAtriumBlock,metroInterchangeBlock,...whityBlocks,...southernBlocks];
export const undergroundPatches=metroPublicPatches;
