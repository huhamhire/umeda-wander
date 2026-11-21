import { writeFileSync } from 'node:fs';
import context from '../../data/geography/display-context.json' with { type: 'json' };
import { layout } from '../../src/infrastructure/district/geographic-map.ts';
import { areaColor } from '../../src/presentation/appearance/area-palette.ts';

/**
 * Convert plan rings into an offline SVG path without discarding boundaries.
 */
const path = (polygon: number[][][]) => polygon.map(r => 'M' + r.map(([x, z]) => `${x},${z}`).join('L') + 'Z').join('');
const shapes: string[] = context.scope.map(p => `<path d="${path(p)}" fill="#e8e7dc"/>`);
for (const s of context.surfaces) {
    const color = s.kind === 'building' ? '#d6ddce' : s.kind === 'road' ? '#b9c2be' : '#e6dfc5';
    shapes.push(...s.geometry.map(p => `<path d="${path(p)}" fill="${color}" fill-rule="evenodd"/>`));
}
for (const a of layout.areas.filter(a => a.railings || a.blockId === 'building:hankyu-concourse')) {
    shapes.push(`<path d="${path([a.outline, ...a.holes ?? []].map(r => r.map(p => [p.x, p.z])))}" fill="#${areaColor(a).toString(16)}" stroke="#8e917e" stroke-width=".3" fill-rule="evenodd"/>`);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="-130 -70 1250 1550"><rect x="-300" y="-200" width="1800" height="2000" fill="#f4f2e7"/>${shapes.join('')}<text x="-90" y="1425" font-family="Microsoft YaHei" font-size="16" fill="#49645a">展示范围：地下网络及核心站体／连廊；道路与建筑占位已收拢 · © OpenStreetMap contributors</text></svg>`;
writeFileSync('build/geography/display-context.svg', svg);
console.log('Wrote clipped context and current 2F colors');
