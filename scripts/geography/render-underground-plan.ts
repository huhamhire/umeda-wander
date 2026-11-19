import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { stationReservations, excludedConnections } from '../../data/geography/underground/network.ts';
import { envelope } from './underground-geometry.ts';
import type { MultiPolygon } from 'polygon-clipping';
import polygonClipping from 'polygon-clipping';
import { kitashinchiInterface } from '../../data/geography/underground/station-interfaces.ts';
import { sourceProjection } from './reference-projection.ts';

const origin = { lon: 135.491, lat: 34.708 };
const eastScale = 111320 * Math.cos(origin.lat * Math.PI / 180);
const width = .011 * eastScale;
const height = .011 * 111320;
/**
 * Escape XML-special characters in external names before writing offline SVG.
 */
const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
/**
 * Convert plan rings into an offline SVG path without discarding boundaries.
 */
const path = (g: MultiPolygon) => g.map(p => p.map(r => 'M' + r.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('L') + 'Z').join('')).join('');
const reference = sourceProjection();
const spaces = reference.parts;
const stationParts = stationReservations.map(p => p.id === 'kitashinchi' ? {
    ...p,
    sections: [],
    polygons: [[reference.projectRing(kitashinchiInterface.footprint)]],
    label: reference.project(kitashinchiInterface.label),
    note: kitashinchiInterface.note
} : p);
const publicGeometry = polygonClipping.union(...spaces.map(envelope) as [
    MultiPolygon,
    ...MultiPolygon[]
]);
const shared = polygonClipping.intersection(
    publicGeometry,
    [[reference.projectRing(kitashinchiInterface.publicBand)]],
    [[reference.projectRing(kitashinchiInterface.footprint)]]
);
const features: object[] = [];
const shapes: string[] = [];
const labels: string[] = [];
const boxes: {
    x: number;
    y: number;
    w: number;
    h: number;
}[] = [];
/**
 * Place an offline-plan label while avoiding previously occupied text bounds.
 */
function label(text: string, x: number, y: number) {
    const w = Array.from(text).reduce((s, c) => s + (c.charCodeAt(0) > 255 ? 10 : 6), 0);
    for (const dy of [
        0,
        -16,
        16,
        -32,
        32
    ]) {
        const box = {
            x: x - w / 2,
            y: y + dy - 11,
            w,
            h: 14
        };
        if (boxes.some(b => box.x < b.x + b.w && box.x + w > b.x && box.y < b.y + b.h && box.y + 14 > b.y)) {
            continue;
        }
        boxes.push(box);
        labels.push(`<text x="${x}" y="${y + dy}" text-anchor="middle">${esc(text)}</text>`);
        return;
    }
}
for (const part of [...spaces, ...stationParts]) {
    const reservation = part.evidence === 'station-reservation';
    const geometry = envelope(part);
    const fill = reservation ? 'none' : '#e5c481';
    shapes.push(`<path d="${path(geometry)}" fill="${fill}" stroke="${reservation ? '#78879b' : '#ab915c'}" stroke-width="0.8" ${reservation ? 'stroke-dasharray="4 3"' : ''} fill-rule="evenodd"><title>${esc(part.name + '：' + part.note)}</title></path>`);
    if (reservation) {
        label(part.name, ...part.label);
    }
    features.push({
        type: 'Feature',
        id: part.id,
        properties: {
            name: part.name,
            block: part.block,
            kind: reservation ? 'station-reservation' : 'public-envelope',
            level: null,
            levelEvidence: part.evidence,
            geometryEvidence: part.polygons ? 'pdf-vector-fill-regional-fit' : 'manual-fit-to-ground-baseline',
            source: part.source,
            page: part.page,
            note: part.note
        },
        geometry: {
            type: 'MultiPolygon',
            coordinates: geometry.map(p => p.map(r => r.map(([x, y]) => [origin.lon + x / eastScale, origin.lat - y / 111320])))
        }
    });
}
// Shared public floor is highlighted on the same footprint, never cut out as station void.
shapes.push(`<path d="${path(shared)}" fill="#87b9ae" stroke="none"><title>北新地 B1 闸外公共空间衔接示意</title></path>`);
features.push({
    type: 'Feature',
    id: 'kitashinchi-shared-public',
    properties: {
        kind: 'shared-public-interface',
        station: 'kitashinchi',
        level: 'B1',
        source: kitashinchiInterface.source,
        page: 1,
        geometryEvidence: 'district-outline-intersection-with-approximate-station-band',
        note: kitashinchiInterface.note
    },
    geometry: {
        type: 'MultiPolygon',
        coordinates: shared.map(p => p.map(r => r.map(([x, y]) => [origin.lon + x / eastScale, origin.lat - y / 111320])))
    }
});
const ground = readFileSync('build/geography/ground-plan.svg', 'utf8');
const match = ground.match(/<g clip-path="url\(#extent\)">([\s\S]*?)<\/g>/);
if (!match) {
    throw new Error('Generate ground-plan.svg first');
}
const background = match[1]!.replace(/<text\b[\s\S]*?<\/text>/g, '');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1810" viewBox="-30 -85 ${width + 60} ${height + 150}">
<style>text{font-family:'Microsoft YaHei',sans-serif;fill:#314c50;font-size:10px} .labels text{paint-order:stroke;stroke:#fffdf7;stroke-width:3px;stroke-linejoin:round}</style>
<rect x="-30" y="-85" width="${width + 60}" height="${height + 150}" fill="#faf8f0"/>
<text x="0" y="-54" style="font-size:23px">梅田 · 地下公共网络参考投影</text>
<text x="0" y="-31">B1 空间设计底稿 · 北向上 · 黄色区域为 PDF 原始矢量轮廓 · 地理配准为示意</text>
<text x="0" y="-12">暖黄：地下公共空间　　青绿：北新地 B1 闸外衔接　　虚边：车站待调整包络</text>
<defs><clipPath id="extent"><rect width="${width}" height="${height}"/></clipPath></defs>
<g clip-path="url(#extent)"><g opacity="0.22">${background}</g>${shapes.join('')}<g class="labels">${labels.join('')}</g></g>
<text x="${width - 20}" y="20" style="font-size:18px">N ↑</text>
<path d="M10 ${height + 12}h100m-100 -4v8m100 -8v8" stroke="#314c50"/>
<text x="10" y="${height + 30}">100 m · JR 中央通路属 1F，未生成南北地下直通；运行时站体与跨层设施见公共网核查图</text>
<text x="10" y="${height + 45}">位置底图 © OpenStreetMap contributors / ODbL 1.0 · 连接参考：用户提供 UMEDA CONNECT 地下图、JR 构内图</text>
<text x="10" y="${height + 59}">资料几何整理的再发布授权待核实 · 本图用于项目内部设计核对，不用于现场导航</text></svg>`;
mkdirSync('build/geography', { recursive: true });
writeFileSync('build/geography/underground-plan.svg', svg);
writeFileSync(
    'build/geography/underground-plan.geojson',
    JSON.stringify({ type: 'FeatureCollection', features }, null, 2)
);
writeFileSync(
    'build/geography/underground-reference-fit.json',
    JSON.stringify(
        {
            controls: reference.controls,
            northControls: reference.northControls,
            roadControls: reference.roadControls,
            note: 'Building centroid fit is approximate; residuals are not accuracy guarantees for other points.'
        },
        null,
        2
    )
);
writeFileSync(
    'build/geography/underground-report.json',
    JSON.stringify(
        {
            publicEnvelopes: spaces.length,
            localAnchors: reference.roadControls.length,
            sharedStationInterfaces: 1,
            undergroundLevelUnresolved: spaces.filter(p => p.evidence === 'underground-level-unresolved').length,
            stationReservations: stationReservations.length,
            excludedConnections,
            coordinateFrame: {
                origin,
                units: 'metres',
                x: 'east',
                y: 'south'
            },
            limitations: [
                'PDF vector fills use regional fit and explicitly matched road/building anchors; no survey accuracy.',
                'Station reservation outlines may overlap; do not subtract source geometry before station alignment.',
                'No runtime H5 integration or routing graph.'
            ]
        },
        null,
        2
    )
);
console.log(`Generated ${spaces.length} public envelopes and ${stationReservations.length} station reservations.`);
