import type {Platform,RailApproach} from '../../src/domain/map/model.ts';
import {createJrRailApproaches} from './jr-osaka-rail-approaches.ts';
import {createHankyuRailApproaches} from './hankyu-rail-approaches.ts';
import {createHanshinRailApproaches} from './hanshin-rail-approaches.ts';
import {createMidosujiRailApproaches} from './midosuji-rail-approaches.ts';
import {createIslandRailApproaches} from '../../src/infrastructure/island-rail-approaches.ts';

/** Build only alignments belonging to the supplied independent station layout. */
export function createRailApproaches(platforms:Platform[]):RailApproach[]{
  const has=(level:Platform['level'])=>platforms.some(p=>p.level===level);
  return [
    ...(has('platform')?createJrRailApproaches(platforms):[]),
    ...(has('hankyu-platform')?createHankyuRailApproaches(platforms):[]),
    ...(has('hanshin-platform')?createHanshinRailApproaches(platforms):[]),
    ...(has('metro-platform')?createMidosujiRailApproaches(platforms):[]),
    ...createIslandRailApproaches(platforms),
  ];
}
