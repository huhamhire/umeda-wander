import {readFileSync,writeFileSync} from 'node:fs';
import {sourceProjection} from './reference-projection.ts';
import {envelope} from './underground-geometry.ts';
import clipping from 'polygon-clipping';
const ground=JSON.parse(readFileSync('build/geography/ground-plan.geojson','utf8'));
const widths=JSON.parse(readFileSync('build/geography/road-width-audit.json','utf8'));
const underground=clipping.union(...sourceProjection().parts.map(envelope) as [ReturnType<typeof envelope>,...ReturnType<typeof envelope>[]]);
writeFileSync('data/geography/runtime-plan.json',JSON.stringify({ground:ground.features,widths,underground}));
