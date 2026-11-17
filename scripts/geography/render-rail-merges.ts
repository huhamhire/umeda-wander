import { writeFileSync, mkdirSync } from 'node:fs';
import { createGeographicStations } from '../../src/infrastructure/district/geographic-stations.ts';

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
