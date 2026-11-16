import type {StationCalibration} from '../../domain/map/spatial-block.ts';
import {osmBuildingEnvelopes} from '../geography/osm-envelope.ts';
import type {OsmPlanFeature} from '../geography/osm-envelope.ts';
import {jrCalibrationSource} from '../stations/jr-osaka/calibration.ts';
import {hankyuCalibrationSource} from '../stations/hankyu-umeda/calibration.ts';
import {metroCalibration} from '../stations/metro-umeda/calibration.ts';
import {createGeographicStations} from './geographic-stations.ts';
import {platformPoint,platformOutline} from '../../domain/map/geometry.ts';
import {stationPublicInterfaces} from '../../application/station-public-interfaces.ts';
import type {StationId} from '../../domain/map/model.ts';
const references:Record<StationId,string[]>={
  'jr-osaka':['references/station_osaka.pdf','data/geography/umeda-osm.xml'],
  'hankyu-umeda':['references/umeda.svg','data/geography/umeda-osm.xml'],
  'metro-umeda':['references/M16_梅田_構内図_1.pdf','references/梅田周边地区通道.pdf'],
  'hanshin-umeda':['references/hanshin-umeda.pdf','references/梅田周边地区通道.pdf'],
  'higashi-umeda':['references/T20_東梅田_構内図.pdf','references/梅田周边地区通道.pdf'],
  'nishi-umeda':['references/Y11_西梅田_構内図.pdf','references/梅田周边地区通道.pdf'],
  'kitashinchi':['references/北新地.pdf','references/梅田周边地区通道.pdf'],
};

/** Phase-two pilot only. Assembly does not infer walkable links from overlapping plans. */
export function createPilotCalibrations(features:OsmPlanFeature[]):StationCalibration[] {
  return [jrCalibrationSource,hankyuCalibrationSource].map<StationCalibration>(c=>({station:c.station,
    status:'envelope-review' as const,envelopes:osmBuildingEnvelopes(features,c.buildingId),notes:c.notes}))
    .concat([metroCalibration]);
}

/** Rebuildable seven-station record; dimensions describe our fit, not surveys. */
export function createRuntimeCalibrations(){
  return createGeographicStations().map(station=>({
    station:station.id,name:station.name,units:'metres',axes:{x:'east',z:'south'},
    status:'schematic-calibrated',referenceFiles:references[station.id],residualMetres:null,
    residualNote:'No independent surveyed control points; a numeric fitting accuracy cannot be asserted.',
    sources:[...new Set([...station.facilities,...station.layout.areas,...station.layout.platforms].flatMap(v=>v.evidence.urls??[]))],
    platforms:station.layout.platforms.map(p=>({id:p.id,length:p.length,width:p.width,
      negativeEnd:platformPoint(p,-p.length/2,0),positiveEnd:platformPoint(p,p.length/2,0),outline:platformOutline(p),
      planBow:p.planBow??null,source:p.evidence.source??'jr'})),
    levels:station.levels.map(l=>({id:l.id,y:l.y,stackIndex:l.stackIndex})),
    interfaces:stationPublicInterfaces(station),
    notes:['Internal topology follows operator diagrams; plan extents, device spacing and vertical heights remain estimates.',
      'External B1 and 2F regional contour assembly belongs to phases three and four; gate contact does not create route edges.'],
  }));
}
