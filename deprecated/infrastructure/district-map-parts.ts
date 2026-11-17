import type {StationLayout} from '../../src/domain/map/model.ts';
import {districtAreas,districtConnections,districtGuides} from './district-links.ts';
import {commercialBuildings,commercialPassages,commercialAreas,commercialConnections,commercialConcourses,commercialAtria} from './commercial-district.ts';
import {hanshinDistrictPassages} from './hanshin-district-links.ts';
import {higashiDistrictPassages} from './higashi-district-links.ts';
import {nishiDistrictPassages} from './nishi-district-links.ts';
import {westDistrictPassages,southDistrictAreas} from './west-district-links.ts';
import {hanshinCommercialPassages} from './hanshin-commercial-links.ts';
import {jpTowerAreas,jpTowerPassages,jpTowerConnections} from './jp-tower-links.ts';
import {southernUnderground} from './southern-underground.ts';

const underground=southernUnderground([...commercialPassages,...hanshinDistrictPassages,...higashiDistrictPassages,...nishiDistrictPassages,...westDistrictPassages,...hanshinCommercialPassages,...jpTowerPassages]);

/** Commercial/public spaces outside station interiors. */
export const districtMapParts:StationLayout={
  areas:[...districtAreas,...commercialAreas,...southDistrictAreas,...underground.areas,...jpTowerAreas],platforms:[],
  connections:[...districtConnections,...commercialConnections,...jpTowerConnections],guides:districtGuides,
  buildings:commercialBuildings,concourses:commercialConcourses,atria:commercialAtria,
  passages:underground.passages,
};
