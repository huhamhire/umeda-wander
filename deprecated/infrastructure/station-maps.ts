import {createRailApproaches} from './rail-approaches.ts';
import type {StationMap} from '../../src/domain/map/model.ts';
import {jrStation} from '../../src/infrastructure/stations/jr-osaka/index.ts';
import {hankyuStation} from '../../src/infrastructure/stations/hankyu-umeda/index.ts';
import {metroStation} from '../../src/infrastructure/stations/metro-umeda/index.ts';
import {hanshinStation} from '../../src/infrastructure/stations/hanshin-umeda/index.ts';
import {higashiStation} from '../../src/infrastructure/stations/higashi-umeda/index.ts';
import {nishiStation} from '../../src/infrastructure/stations/nishi-umeda/index.ts';
import {kitashinchiStation} from '../../src/infrastructure/stations/kitashinchi/index.ts';

/** Register a station once; all aggregate collections use this same inventory. */
export const stationMaps:StationMap[]=[jrStation,hankyuStation,metroStation,hanshinStation,higashiStation,nishiStation,kitashinchiStation].map(station=>({...station,layout:{...station.layout,railApproaches:createRailApproaches(station.layout.platforms)}}));
