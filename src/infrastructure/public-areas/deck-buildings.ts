import {geographicBuildings} from '../buildings/index.ts';
import type {BuildingOccupancy} from '../../domain/map/public-area.ts';
import type {LevelId} from '../../domain/map/model.ts';
import {deckEvidence} from './elevated-source.ts';
/** Context occupancy, not walkable shops. The shell may hide while these outlines remain. */
export const deckBuildingOccupancies:{level:LevelId;definitions:BuildingOccupancy[]}[]=(['district-north-deck','district-south-deck'] as const).map(level=>({level,
 definitions:geographicBuildings.filter(b=>['daimaru','hankyu-dept','hanshin-dept','jp-tower'].includes(b.id)===(level==='district-south-deck')).map(b=>({
  id:b.id,name:b.name.split(' / ')[0]!,region:{outline:b.volumes[0]!.outline,holes:b.volumes[0]!.holes},
  evidence:{...deckEvidence,urls:[...deckEvidence.urls!,b.volumes[0]!.source],detail:deckEvidence.detail+' Building footprint/context occupancy only; no interior shop plan or inferred access.'},
 })),
}));
