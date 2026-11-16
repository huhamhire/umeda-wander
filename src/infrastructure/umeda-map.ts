import {composeStationMaps} from '../application/compose-station-maps.ts';
import {stationMaps} from './station-maps.ts';
import {districtMapParts} from './district-map-parts.ts';
import {completeFacilityDirectory} from './facility-directory.ts';

const composed=composeStationMaps(stationMaps,districtMapParts);
export const {stations,levels,nodes,edges}=composed;
export const layout=composed.layout;
export const facilities=completeFacilityDirectory(composed.sourceFacilities,layout.connections,layout.platforms,levels);
