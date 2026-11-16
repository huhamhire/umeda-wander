import {createRailApproaches} from './rail-approaches.ts';
import type {StationMap} from '../domain/map/model.ts';
import {jrStation} from './stations/jr-osaka/index.ts';
import {hankyuStation} from './stations/hankyu-umeda/index.ts';
import {metroStation} from './stations/metro-umeda/index.ts';
import {hanshinStation} from './stations/hanshin-umeda/index.ts';
import {higashiStation} from './stations/higashi-umeda/index.ts';
import {nishiStation} from './stations/nishi-umeda/index.ts';
import {kitashinchiStation} from './stations/kitashinchi/index.ts';

/** Register a station once; all aggregate collections use this same inventory. */
export const stationMaps:StationMap[]=[jrStation,hankyuStation,metroStation,hanshinStation,higashiStation,nishiStation,kitashinchiStation].map(station=>({...station,layout:{...station.layout,railApproaches:createRailApproaches(station.layout.platforms)}}));
