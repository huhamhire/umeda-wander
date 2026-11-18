import { writeFileSync, mkdirSync } from 'node:fs';
import { createGeographicStations } from '../../src/infrastructure/district/geographic-stations.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { sampleRailSegment } from '../../src/domain/map/rail-geometry.ts';
import { platformOutline } from '../../src/domain/map/geometry.ts';
import type { Point2 } from '../../src/domain/map/model.ts';

const stations = createGeographicStations();
const panels: string[] = [];
for (const [index, [stationId, level, side]] of ([
    ['jr-osaka', 'platform', 1],
    ['jr-osaka', 'underground-platform', 1],
    ['jr-osaka', 'platform', -1],
    ['hankyu-umeda', 'hankyu-platform', 1],
    ['kitashinchi', 'kitashinchi-platform', -1]
] as const).entries()) {
    const station = stations.find(s => s.id === stationId)!;
    const rails = station.layout.railApproaches!.filter(a => a.level === level && a.id.endsWith('-' + side) && (side === -1 || !a.id.endsWith('--1')));
    const platform = station.layout.platforms.find(p => p.level === level)!;
    const c = Math.cos(platform.rotationRad) * side;
    const s = Math.sin(platform.rotationRad) * side;
    const roots = rails.flatMap(a => a.nodes.filter(n => n.kind === 'platform-end'));
    const origin = roots.reduce(
        (sum, n) => ({ x: sum.x + n.point.x / roots.length, z: sum.z + n.point.z / roots.length }),
        { x: 0, z: 0 }
    );
    const project = (p: {
        x: number;
        z: number;
    }) => ({ x: (p.x - origin.x) * c + (p.z - origin.z) * s, z: -(p.x - origin.x) * s + (p.z - origin.z) * c });
    const all = rails.flatMap(a => a.nodes.map(n => project(n.point)));
    const minX = Math.min(...all.map(p => p.x)) - 10;
    const maxX = Math.max(...all.map(p => p.x)) + 10;
    const minZ = Math.min(...all.map(p => p.z)) - 10;
    const maxZ = Math.max(...all.map(p => p.z)) + 10;
    const scale = Math.min(920 / (maxX - minX), 150 / (maxZ - minZ));
    const at = (p: {
        x: number;
        z: number;
    }) => {
        const q = project(p);
        return `${(35 + (q.x - minX) * scale).toFixed(2)},${(55 + (q.z - minZ) * scale).toFixed(2)}`;
    };
    const paths = rails.flatMap(a => a.segments.map(seg => {
        const from = a.nodes.find(n => n.id === seg.from)!.point;
        const to = a.nodes.find(n => n.id === seg.to)!.point;
        return `<path d="M${at(from)}C${at(seg.control1)} ${at(seg.control2)} ${at(to)}" fill="none" stroke="${a.id.includes('loop') ? '#b1774f' : '#547b77'}" stroke-width="1.7"/>`;
    }));
    panels.push(`<g transform="translate(0,${index * 240})"><text x="25" y="25">${station.name} · ${level} · ${side === 1 ? '正端' : '负端'}并线</text>${paths.join('')}</g>`);
}
mkdirSync('build/geography', { recursive: true });
writeFileSync(
    'build/geography/rail-merges.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1200"><rect width="1000" height="1200" fill="#f7f5eb"/><g font-family="Microsoft YaHei,sans-serif" font-size="17" fill="#35554e">${panels.join('')}</g></svg>`
);

/** Compare authored runtime rails with the actual station halls and source building hosts in one north-up frame. */
function renderDistrictRailContext(): void {
    const shapes: string[] = [];
    const points = (ring: Point2[]) => ring.map(p => `${p.x},${p.z}`).join(' ');
    const jr = stations.find(s => s.id === 'jr-osaka')!;
    const hankyu = stations.find(s => s.id === 'hankyu-umeda')!;
    for (const area of hankyu.layout.areas) {
        shapes.push(`<polygon points="${points(area.outline)}" fill="#e4dcdb" stroke="#ac9a9c" stroke-width=".6"/>`);
    }
    for (const b of geographicBuildings.filter(b => !['grand-front-north', 'jp-tower', 'hanshin-dept'].includes(b.id))) {
        const outline = b.volumes[0]!.outline;
        shapes.push(`<polygon points="${points(outline)}" fill="#e2e4db" fill-opacity=".6" stroke="#a8b6ab" stroke-width=".8"/>`);
    }
    for (const station of [jr, hankyu]) {
        for (const platform of station.layout.platforms.filter(p => p.level === 'platform' || p.level === 'hankyu-platform')) {
            shapes.push(`<polygon points="${points(platformOutline(platform))}" fill="#c7dce0" stroke="#a1bcc2" stroke-width=".6"/>`);
        }
    }
    for (const approach of jr.layout.railApproaches!.filter(a => a.level === 'platform')) {
        for (const segment of approach.segments) {
            const path = sampleRailSegment(approach, segment, 80).map(sample => sample.point);
            shapes.push(`<polyline points="${points(path)}" fill="none" stroke="${approach.id.includes('loop') ? '#bb8941' : '#527f78'}" stroke-width="1.1"/>`);
        }
        const text = approach.name.replaceAll('&', '&amp;');
        shapes.push(`<text x="${approach.labelPoint.x}" y="${approach.labelPoint.z + 15}" font-size="10">${text}</text>`);
    }
    shapes.push('<text x="630" y="405">阪急站厅及附属楼</text>');
    shapes.push('<text x="818" y="416">HEP FIVE</text>');
    shapes.push('<text x="805" y="552">HEP NAVIO</text>');
    shapes.push('<text x="654" y="604">阪急百货</text>');
    shapes.push('<text x="373" y="583">JR 11 番线</text>');
    shapes.push('<path d="M40 245V190L35 201M40 190L45 201" fill="none" stroke="#527f78"/><text x="33" y="184">N</text>');
    writeFileSync(
        'build/geography/rail-district.svg',
        `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="876" viewBox="0 170 1000 730"><rect x="0" y="170" width="1000" height="730" fill="#f7f5eb"/><g font-family="Microsoft YaHei,sans-serif" font-size="12" fill="#35554e">${shapes.join('')}</g></svg>`
    );
}

renderDistrictRailContext();
