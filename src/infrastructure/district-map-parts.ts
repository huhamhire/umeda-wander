import type {StationLayout} from '../domain/map/model.ts';
import {districtAreas,districtConnections,districtGuides} from './district-links.ts';
import {commercialBuildings,commercialPassages,commercialAreas,commercialConnections,commercialConcourses,commercialAtria} from './commercial-district.ts';
import {hanshinDistrictPassages} from './hanshin-district-links.ts';
import {higashiDistrictPassages} from './higashi-district-links.ts';
import {nishiDistrictPassages} from './nishi-district-links.ts';
import {westDistrictPassages,southDistrictAreas} from './west-district-links.ts';

/** Commercial/public spaces outside station interiors. */
export const districtMapParts:StationLayout={
  areas:[...districtAreas,...commercialAreas,...southDistrictAreas],platforms:[],
  connections:[...districtConnections,...commercialConnections],guides:districtGuides,
  buildings:commercialBuildings,concourses:commercialConcourses,atria:commercialAtria,
  passages:[...commercialPassages,...hanshinDistrictPassages,...higashiDistrictPassages,...nishiDistrictPassages,...westDistrictPassages],
};
