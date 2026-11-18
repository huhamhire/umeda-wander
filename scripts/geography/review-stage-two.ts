import { mkdirSync, writeFileSync } from 'node:fs';
import clipping from 'polygon-clipping';
import { createRuntimeCalibrations } from './station-calibration.ts';
import { createGeographicStations } from '../../src/infrastructure/district/geographic-stations.ts';
import { layout, publicInterfaces, publicInterfaceBindings, geographicPlan } from '../../src/infrastructure/district/geographic-map.ts';
import { platformOutline, pointInPolygon } from '../../src/domain/map/geometry.ts';
import type { Point2 } from '../../src/domain/map/model.ts';

/**
 * Convert plan rings into an offline SVG path without discarding boundaries.
 */
const path = (r: Point2[]) => 'M' + r.map(p => `${p.x.toFixed(2)},${p.z.toFixed(2)}`).join('L') + 'Z';
/**
 * Convert plan points into the coordinate ring expected by polygon-clipping.
 */
const ring = (r: Point2[]) => r.map(p => [p.x, p.z] as [
    number,
    number
]);
/**
 * Escape XML-special characters in external names before writing offline SVG.
 */
const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const stations = createGeographicStations();
const panels: string[] = [];
const filter = process.argv.find(v => v.startsWith('--station='))?.split('=')[1];
for (const [i, station] of stations.filter(s => !filter || s.id === filter).entries()) {
    const points = [
        ...station.layout.areas.flatMap(a => a.outline),
        ...station.layout.platforms.flatMap(platformOutline)
    ];
    const minX = Math.min(...points.map(p => p.x)) - 12;
    const minZ = Math.min(...points.map(p => p.z)) - 12;
    const width = Math.max(...points.map(p => p.x)) - minX + 12;
    const height = Math.max(...points.map(p => p.z)) - minZ + 12;
    const scale = Math.min(540 / width, 440 / height);
    const shapes: string[] = [];
    for (const a of layout.areas.filter(a => a.level === 'district-underground')) {
        shapes.push(`<path d="${[a.outline, ...a.holes ?? []].map(path).join('')}" fill="#dfc68b" fill-rule="evenodd" stroke="#ac925e" stroke-width=".4"/>`);
    }
    for (const a of station.layout.areas.filter(a => a.kind !== 'public' || station.levels.find(l => l.id === a.level)!.y !== -8)) {
        shapes.push(`<path d="${[a.outline, ...a.holes ?? []].map(path).join('')}" fill="${a.kind === 'paid' ? '#a7bfb0' : '#e7e3d7'}" fill-opacity=".65" fill-rule="evenodd" stroke="#6d8c80" stroke-width=".5"><title>${escape(a.id)}</title></path>`);
    }
    for (const p of station.layout.platforms) {
        shapes.push(`<path d="${path(platformOutline(p))}" fill="#9ebfca" stroke="#648796" stroke-width=".5" fill-opacity=".8"/>`);
    }
    for (const c of station.layout.connections) {
        shapes.push(`<path d="M${c.from.x},${c.from.z}L${c.to.x},${c.to.z}" fill="none" stroke="#396e5b" stroke-width="1.6"/><circle cx="${c.from.x}" cy="${c.from.z}" r="1.5" fill="#396e5b"><title>${escape(c.id)}</title></circle>`);
    }
    for (const p of publicInterfaces.filter(p => p.station === station.id)) {
        shapes.push(`<path d="M${p.boundary[0].x},${p.boundary[0].z}L${p.boundary[1].x},${p.boundary[1].z}" stroke="#ae6153" stroke-width="2.5"/><circle cx="${p.outside.x}" cy="${p.outside.z}" r="2" fill="#ae6153"><title>${escape(p.id)}</title></circle>`);
    }
    panels.push(`<g transform="translate(${i % 2 * 600},${Math.floor(i / 2) * 540})"><text x="24" y="30">${station.name}</text><svg x="20" y="50" width="560" height="460" viewBox="${minX} ${minZ} ${540 / scale} ${440 / scale}">${shapes.join('')}</svg></g>`);
}
const bindings = publicInterfaceBindings.map(binding => {
    const face = layout.areas.find(a => a.id === binding.surfaceId)!;
    const touchesRegionalReference = clipping.intersection(
        [[ring(face.outline), ...(face.holes ?? []).map(ring)]],
        geographicPlan.underground as clipping.MultiPolygon
    ).length > 0;
    return { ...binding, touchesRegionalReference };
});
const output = 'build/geography';
mkdirSync(output, { recursive: true });
writeFileSync(
    output + '/stage-two-stations.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${Math.ceil(panels.length / 2) * 540}"><rect width="100%" height="100%" fill="#f4f2e7"/><g fill="#31524d" font-family="Microsoft YaHei,sans-serif" font-size="20">${panels.join('')}</g></svg>`
);
writeFileSync(
    output + '/stage-two-calibration.json',
    JSON.stringify(
        {
            calibrations: createRuntimeCalibrations(),
            bindings,
            phaseThreeLocalOnly: bindings.filter(b => !b.touchesRegionalReference).map(b => b.interfaceId),
            publicB1GateCount: bindings.length,
            publicFloorOwner: 'district-underground',
            unsupportedGateInterfaces: publicInterfaces.filter(p => p.elevation === -8 && !layout.areas.some(a => a.level === 'district-underground' && pointInPolygon(p.outside, a.outline))).map(p => p.id),
            validationScope: 'Offline plan and automated geometry. Browser/WebGL/touch checks not performed.'
        },
        null,
        2
    )
);
console.log('Wrote stage-two-stations.svg and stage-two-calibration.json');
