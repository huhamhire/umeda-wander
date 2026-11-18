import { platformOutline, platformPoint } from '../../src/domain/map/geometry.ts';
import { readFileSync, writeFileSync } from 'node:fs';
import { createGeographicStations } from '../../src/infrastructure/district/geographic-stations.ts';
import type { Point2 } from '../../src/domain/map/model.ts';
import { surfaceRailwayPlan } from './railway-plan.ts';

const underground = process.argv.includes('--underground');
const stations = createGeographicStations();
for (const station of stations) {
    station.layout.areas = station.layout.areas.filter(a => !(a.kind === 'public' && station.levels.find(l => l.id === a.level)?.y === -8));
}
const output = underground ? 'underground-station-interiors' : 'station-interiors';
/**
 * Convert plan rings into an offline SVG path without discarding boundaries.
 */
const path = (p: Point2[]) => 'M' + p.map(v => `${v.x.toFixed(2)},${v.z.toFixed(2)}`).join('L') + 'Z';
/**
 * Escape XML-special characters in external names before writing offline SVG.
 */
const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const parts: string[] = [];
const rails = surfaceRailwayPlan(JSON.parse(readFileSync('data/geography/railways/features.json', 'utf8')));
const railParts = rails.map(r => {
    const d = 'M' + r.points.map(p => `${p.x},${p.z}`).join('L');
    return `<path d="${d}" fill="none" stroke="#b8b9af" stroke-width="${r.bedWidth}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#777f79" stroke-width=".65"><title>${escape(r.name)} · ${r.id}</title></path>`;
});
for (const s of stations) {
    const shown = new Set(s.levels.filter(l => !underground || l.y < 0).map(l => l.id));
    for (const rail of (s.layout.railApproaches ?? []).filter(r => shown.has(r.level))) {
        const nodes = new Map(rail.nodes.map(n => [n.id, n.point]));
        for (const segment of rail.segments) {
            const a = nodes.get(segment.from)!;
            const b = nodes.get(segment.to)!;
            parts.push(`<path d="M${a.x},${a.z}C${segment.control1.x},${segment.control1.z} ${segment.control2.x},${segment.control2.z} ${b.x},${b.z}" fill="none" stroke="${s.id === 'kitashinchi' ? '#b886a5' : '#328bb7'}" stroke-width="1.1" stroke-dasharray="4 2"><title>${escape(rail.name)} · ${s.levels.find(l => l.id === rail.level)!.y}</title></path>`);
        }
    }
    for (const a of s.layout.areas.filter(a => shown.has(a.level))) {
        parts.push(`<path d="${[a.outline, ...a.holes ?? []].map(path).join('')}" fill="${a.kind === 'paid' ? '#a9c0ad' : '#e5d4b0'}" fill-rule="evenodd" fill-opacity=".2" stroke="#a18b66" stroke-width=".5" stroke-dasharray="3 2"/>`);
    }
    for (const p of s.layout.platforms.filter(p => shown.has(p.level))) {
        const ring = platformOutline(p);
        parts.push(`<path d="${path(ring)}" fill="#a6c7ce" stroke="#417989" stroke-width=".7"/>`);
        if (p.planBow) {
            for (const side of [-1, 1]) {
                for (const offset of [p.width / 2, p.width / 2 + 1.65]) {
                    const line = Array.from({ length: 49 }, (_, i) => platformPoint(p, -p.length / 2 + p.length * i / 48, side * offset));
                    parts.push(`<path d="M${line.map(v => `${v.x},${v.z}`).join('L')}" fill="none" stroke="${offset === p.width / 2 ? '#417989' : '#777f79'}" stroke-width=".65"/>`);
                }
            }
        }
    }
    for (const c of s.layout.connections.filter(c => shown.has(c.from.level) && shown.has(c.to.level))) {
        parts.push(`<path d="M${c.from.x},${c.from.z}L${c.to.x},${c.to.z}" stroke="${c.kind === 'stairs' ? '#8a8473' : '#4b7964'}" stroke-width="1.8"/><circle cx="${c.from.x}" cy="${c.from.z}" r="1.6" fill="#4b7964"><title>${escape(c.id)}</title></circle>`);
    }
    for (const f of s.facilities.filter(f => f.kind === 'gate' && shown.has(f.level))) {
        parts.push(`<circle cx="${f.x}" cy="${f.z}" r="3" fill="#b46c60"><title>${escape(f.name)}</title></circle>`);
    }
}
const base = readFileSync(underground ? 'build/geography/underground-plan.svg' : 'build/geography/ground-plan.svg', 'utf8');
writeFileSync(
    'build/geography/' + output + '.svg',
    base.replace('梅田 · 地下公共网络参考投影', '阶段二 · 地下车站与公共网络对照').replace('梅田 · 建筑与道路平面布局', '阶段二 · 七站内部平面校准')
        .replace(
            '第一阶段校对稿 · 北向上 · 米制投影 · 道路宽度含估计值',
            '蓝：站台　虚线：各层站厅　绿：垂直设施　红：改札　位置为拟合 / 梅北为独立校准子区'
        )
        .replace(
            '</svg>',
            `<g clip-path="url(#extent)">${underground ? '' : railParts.join('')}${parts.join('')}</g></svg>`
        )
);
writeFileSync('build/geography/station-interiors.json', JSON.stringify(stations, null, 2));
writeFileSync('build/geography/surface-railways.json', JSON.stringify(rails, null, 2));
console.log(stations.map(s => ({ station: s.id, platforms: s.layout.platforms.length, connections: s.layout.connections.length })));
