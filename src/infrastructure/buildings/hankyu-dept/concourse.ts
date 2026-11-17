import type {AtriumVoid, BuildingOpening, CommercialConcourse, Evidence, FloorArea} from '../../../domain/map/model.ts';
import {passageOutline} from '../../../domain/map/geometry.ts';

const evidence: Evidence = {
  source: 'district',
  pages: [],
  urls: [
    'https://www.hankyu.co.jp/company/news/pdf/ER201209194N1.pdf',
    'https://website.hankyu-dept.co.jp/honten/about/',
  ],
  detail: 'Official public north–south and east–west concourses, with the department store and Grand Building kept separate. Cream arches, warm display windows and paving follow the earlier authored model/user photo. Metre-scale axes fitted to the current OSM building seam; widths and heights illustrative, not surveyed. No shop aisles or navigation edges.',
};

// These axes follow the shared east facade of the department store and the
// separate Grand Building. Old display coordinates are deliberately not reused.
function concourse(input: Pick<CommercialConcourse, 'id' | 'name' | 'axis' | 'width' | 'height'>): CommercialConcourse {
  return {
    ...input,
    level: 'district-ground',
    outline: passageOutline(...input.axis, input.width),
    evidence,
  };
}

export const hankyuConcourses: CommercialConcourse[] = [
  concourse({
    id: 'hankyu-north-south-concourse',
    name: '阪急百货 · 1F 南北公共通廊',
    axis: [{x: 722, z: 542}, {x: 723, z: 606}],
    width: 12,
    height: 12,
  }),
  concourse({
    id: 'hankyu-east-west-concourse',
    name: '阪急百货 · 1F 东西公共通廊',
    axis: [{x: 633, z: 549}, {x: 764, z: 545}],
    width: 10,
    height: 3.3,
  }),
];

export const hankyuConcourseAreas: FloorArea[] = hankyuConcourses.map(hall => ({
  id: hall.id,
  name: hall.name,
  level: hall.level,
  kind: 'public',
  blockId: 'building:hankyu-concourse',
  outline: hall.outline,
  label: false,
  evidence,
}));

export const hankyuConcourseOpenings: BuildingOpening[] = hankyuConcourses.flatMap(hall =>
  ['hankyu-dept', 'hankyu-grand'].map(buildingId => ({
    buildingId,
    outline: hall.outline,
    base: 0,
    top: hall.height + .4,
    evidence,
  })),
);

// Only the tall hall is a void through 2F; the east–west passage has a deck above.
export const hankyuConcourseAtria: AtriumVoid[] = [{
  id: 'hankyu-concourse-void',
  name: '阪急南北通廊 · 挑高空间',
  openings: [
    {level: 'district-south-deck', outline: hankyuConcourses[0]!.outline},
    {level: 'district-north-deck', outline: hankyuConcourses[0]!.outline},
  ],
  evidence,
}];
