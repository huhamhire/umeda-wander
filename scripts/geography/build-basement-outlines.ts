import {readFileSync, writeFileSync} from 'node:fs';
import {compoundPolygons, sourceProjection} from './reference-projection.ts';
import type {Point} from '../../data/geography/underground/network.ts';

const source = JSON.parse(readFileSync('data/geography/underground/basement-source.json', 'utf8')) as {
  source: string;
  sha256: string;
  page: number;
  note: string;
  buildings: {id: string; name: string; drawingIndex: number; boundaryKind: string; rings: Point[][]}[];
};
const publicSource = JSON.parse(readFileSync('data/geography/underground/pdf-outline.json', 'utf8')) as {sha256: string};
if (source.sha256 !== publicSource.sha256) {
  throw new Error('Basement and public excavation must use the same reference version');
}
const projection = sourceProjection();
const result = {
  source: source.source,
  sha256: source.sha256,
  page: source.page,
  coordinateFrame: 'Same metre frame and road-controlled projection as the public B1 network',
  note: source.note,
  buildings: source.buildings.map(building => ({
    id: building.id,
    name: building.name,
    drawingIndex: building.drawingIndex,
    boundaryKind: building.boundaryKind,
    regions: compoundPolygons(building.rings).map(polygon => {
      const [outline, ...holes] = polygon.map(ring => projection.projectRing(ring).map(([x, z]) => ({x, z})));
      return {outline, holes};
    }),
  })),
};
writeFileSync('data/geography/underground/basement-outlines.json', JSON.stringify(result));
console.log('Projected ' + result.buildings.length + ' B1 occupancies; source public faces untouched.');
