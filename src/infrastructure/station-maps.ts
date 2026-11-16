import {createRailApproaches} from './rail-approaches.ts';
import type {StationMap} from '../domain/map/model.ts';
import {jrStation} from './jr-osaka-station.ts';
import {hankyuStation} from './hankyu-umeda-map.ts';
import {metroStation} from './metro-umeda-map.ts';
import {hanshinStation} from './hanshin-umeda-map.ts';
import {higashiStation} from './higashi-umeda-map.ts';
import {nishiStation} from './nishi-umeda-map.ts';
import {kitashinchiStation} from './kitashinchi-map.ts';

/** Register a station once; all aggregate collections use this same inventory. */
export const stationMaps:StationMap[]=[jrStation,hankyuStation,metroStation,hanshinStation,higashiStation,nishiStation,kitashinchiStation].map(station=>({...station,layout:{...station.layout,railApproaches:createRailApproaches(station.layout.platforms)}}));
