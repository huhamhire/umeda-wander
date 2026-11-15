import * as jr from './jr-osaka-map.ts';
import {hankyuStation} from './hankyu-umeda-map.ts';
import {metroStation} from './metro-umeda-map.ts';
import type {Level,StationId} from '../domain/map/model.ts';
import {districtAreas,districtConnections,districtGuides} from './district-links.ts';
import {createRailApproaches} from './rail-approaches.ts';

export const stations=[{id:'jr-osaka' as const,name:'JR 大阪站'}, {id:hankyuStation.id,name:hankyuStation.name},{id:metroStation.id,name:metroStation.name}];
export const levels:Level[]=[...jr.levels.map((l,i)=>({...l,station:'jr-osaka' as StationId,stackIndex:i-2})),...hankyuStation.levels,...metroStation.levels];
export const facilities=[...jr.facilities,...hankyuStation.facilities,...metroStation.facilities];
export const nodes=[...jr.nodes,...hankyuStation.nodes,...metroStation.nodes];
export const edges=[...jr.edges,...hankyuStation.edges,...metroStation.edges];
const platforms=[...jr.platforms,...hankyuStation.layout.platforms,...metroStation.layout.platforms];
export const layout={areas:[...jr.areas,...hankyuStation.layout.areas,...metroStation.layout.areas,...districtAreas],platforms,connections:[...jr.connections,...hankyuStation.layout.connections,...metroStation.layout.connections,...districtConnections],railApproaches:createRailApproaches(platforms),guides:[...districtGuides,...(metroStation.layout.guides??[])]};
