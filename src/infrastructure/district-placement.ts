import {projectDistrictPoint} from '../domain/map/geography.ts';
import {surfaceBearingDeg} from './station-orientation.ts';

// Public OSM snapshot 2026-11-14, cross-checked against Osaka City's district map.
// Station interiors remain diagrammatic; this scale controls relative placement only.
export const districtFrame={origin:{lat:34.7022133,lon:135.4955732},anchor:{x:-20,z:0},metersPerUnit:2.5,bearingDeg:surfaceBearingDeg};
export const districtAnchors={jrNorthEastDeck:{x:59,z:-44}} as const;
const locate=(lat:number,lon:number,bearingDeg:number,offset:{along?:number;east?:number;south?:number}={})=>{
  const referenceOrigin=projectDistrictPoint({lat,lon},districtFrame.origin,districtFrame.bearingDeg,districtFrame.metersPerUnit,districtFrame.anchor);
  const angle=(bearingDeg-districtFrame.bearingDeg)*Math.PI/180;
  // Schematic interiors are oversized: retain the geographic anchor separately
  // from the display clearance, which must not be interpreted as surveyed metres.
  const eastAngle=districtFrame.bearingDeg*Math.PI/180;
  const displayOffset={x:Math.cos(angle)*(offset.along??0)+Math.sin(eastAngle)*(offset.east??0)-Math.cos(eastAngle)*(offset.south??0),
    z:Math.sin(angle)*(offset.along??0)+Math.cos(eastAngle)*(offset.east??0)+Math.sin(eastAngle)*(offset.south??0)};
  return {geo:{lat,lon},bearingDeg,referenceOrigin,displayOffset,
    origin:{x:referenceOrigin.x+displayOffset.x,z:referenceOrigin.z+displayOffset.z},angle};
};
export const districtPlacements={
  // OSM station nodes 3544516031 and 7811929025. +X points toward the northern end.
  hankyu:{...locate(34.7054194,135.4983721,-10.64,{along:8,east:30}),planScale:0.65},
  // Area overview places M16 south of the JR east throat, along the road west of Hankyu.
  // Keep the measured heading/east clearance; move only the schematic north/south fit.
  metro:locate(34.7034131,135.4975879,-15.64,{along:-34,east:30}),
  // HS01 OSM node 3632936957 and westbound rail bearing; south fit clears the
  // expanded Daimaru/JR illustration and keeps the B2 terminal west of M16.
  hanshin:{...locate(34.7014097,135.4971469,-121,{along:12,east:12,south:53}),planScale:{along:0.74,across:0.82}},
  // OSM station 5411378288; nearby Tanimachi track tangents are -16.5/-16.9°.
  higashi:locate(34.7005946,135.4998176,-16.7,{east:30}),
};
