import {geographicBuildings} from '../buildings/index.ts';
import type {BuildingOccupancy} from '../../domain/map/public-area.ts';
import type {LevelId} from '../../domain/map/model.ts';
import {deckEvidence} from './elevated-source.ts';
import inogate from '../../../data/geography/elevated/inogate.json' with {type: 'json'};
import {footprint} from '../buildings/building-data.ts';
import {inogateDeckEvidence} from './west-decks/inogate.ts';

/** Context occupancy, not walkable shops. The shell may hide while these outlines remain. */
export const deckBuildingOccupancies: {level: LevelId; definitions: BuildingOccupancy[]}[] =
  (['district-north-deck', 'district-south-deck'] as const).map(level => {
    const definitions: BuildingOccupancy[] = geographicBuildings
      .filter(b => ['daimaru', 'hankyu-dept', 'hanshin-dept', 'jp-tower'].includes(b.id) === (level === 'district-south-deck'))
      .map(b => ({
        id: b.id,
        name: b.name.split(' / ')[0]!,
        region: {outline: b.volumes[0]!.outline, holes: b.volumes[0]!.holes},
        evidence: {
          ...deckEvidence,
          urls: [...deckEvidence.urls!, b.volumes[0]!.source],
          detail: deckEvidence.detail + ' Building footprint/context occupancy only; no interior shop plan or inferred access.',
        },
      }));
    if (level === 'district-north-deck') {
      definitions.push(...inogate.hosts.map(host => ({
        id: host.id,
        name: host.name,
        region: footprint(host.way),
        evidence: {
          ...inogateDeckEvidence,
          urls: [...inogateDeckEvidence.urls!, 'https://www.openstreetmap.org/way/' + host.way],
        },
      })));
    }
    return {level, definitions};
  });
