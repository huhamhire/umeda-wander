import { mkdirSync, writeFileSync } from 'node:fs';
import clipping from 'polygon-clipping';
import { layout, levels, undergroundBlocks, undergroundPublicAreas, publicInterfaceBindings, publicInterfaces, publicAccess, basements, geographicPlan } from '../../src/infrastructure/district/geographic-map.ts';
import { undergroundPatches } from '../../src/infrastructure/public-areas/underground-blocks.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import { areaColor } from '../../src/presentation/appearance/area-palette.ts';
import { sourceProjection } from './reference-projection.ts';
import type { PlanRegion, Point2 } from '../../src/domain/map/model.ts';
import { basementOccupancies } from '../../src/infrastructure/public-areas/basement-buildings.ts';
import { basementBoundaryGaps } from './basement-contact-audit.ts';

/**
 * Convert the outer ring and real holes into polygon-clipping input without dropping ring order.
 */
const geometry = (a: PlanRegion) => [a.outline, ...a.holes ?? []].map(r => r.map(p => [p.x, p.z] as [
    number,
    number
]));
const flat = undergroundPublicAreas.filter(a => !a.elevationOffset);
const components = clipping.union(geometry(flat[0]!), ...flat.slice(1).map(geometry));
/**
 * Test the outer boundary while excluding holes.
 */
const contains = (polygon: clipping.Polygon, p: Point2) => pointInPolygon(p, polygon[0]!.map(([x, z]) => ({ x, z }))) && !polygon.slice(1).some(r => pointInPolygon(p, r.map(([x, z]) => ({ x, z }))));
/**
 * Convert plan rings into an offline SVG path without discarding boundaries.
 */
const path = (r: Point2[]) => 'M' + r.map(p => `${p.x.toFixed(2)},${p.z.toFixed(2)}`).join('L') + 'Z';
/**
 * Join outer and inner rings into an SVG path using even-odd filling.
 */
const shape = (a: PlanRegion) => [a.outline, ...a.holes ?? []].map(path).join('');
/**
 * Escape XML-special characters in external names before writing offline SVG.
 */
const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const shapes: string[] = [];
/**
 * Project source longitude and latitude into the shared district metre frame, with east x and south z.
 */
const project = ([lon, lat]: number[]): Point2 => ({ x: (lon! - 135.491) * 111320 * Math.cos(34.708 * Math.PI / 180), z: (34.708 - lat!) * 111320 });
for (const raw of geographicPlan.ground) {
    const f = raw as unknown as {
        id: string;
        properties: Record<string, string>;
        geometry: {
            type: string;
            coordinates: unknown;
        };
    };
    if (f.geometry.type === 'LineString') {
        const points = (f.geometry.coordinates as number[][]).map(project);
        const width = geographicPlan.widths.find(w => String(w.id) === f.id.split('/')[1])?.metres ?? 4;
        shapes.push(`<path d="M${points.map(p => `${p.x},${p.z}`).join('L')}" fill="none" stroke="#d5dbd6" stroke-width="${width}"/>`);
    }
    else {
        const polygons = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates as number[][][][] : [f.geometry.coordinates as number[][][]];
        for (const polygon of polygons) {
            shapes.push(`<path d="${polygon.map(r => path(r.map(project))).join('')}" fill="#e7e9df" stroke="#d4d9cd" stroke-width=".3" fill-rule="evenodd"/>`);
        }
    }
}
for (const a of basements.areas) {
    shapes.push(`<path d="${shape(a)}" fill="#${areaColor(a, true).toString(16).padStart(6, '0')}" stroke="#a7b1a3" stroke-width=".4" fill-rule="evenodd"><title>${esc(a.name)}</title></path>`);
    if (a.label && a.labelAnchor) {
        shapes.push(`<text transform="translate(${a.labelAnchor.x} ${a.labelAnchor.z}) rotate(${(a.labelAngleRad ?? 0) * 180 / Math.PI})" text-anchor="middle" fill="#50615a" font-size="5" textLength="${a.labelWidth}" lengthAdjust="spacingAndGlyphs">${esc(a.name)}</text>`);
    }
}
for (const a of undergroundPublicAreas) {
    shapes.push(`<path d="${shape(a)}" fill="#dfc68b" stroke="#b49c69" stroke-width=".4" fill-rule="evenodd"><title>${esc(a.blockId ?? a.id)}</title></path>`);
}
for (const a of layout.areas.filter(a => !a.blockId && a.kind !== 'public' && levels.find(l => l.id === a.level)?.y === -8)) {
    shapes.push(`<path d="${shape(a)}" fill="#abc4b3" stroke="#537b69" stroke-width=".7" fill-rule="evenodd"/>`);
}
for (const patch of undergroundPatches) {
    shapes.push(`<path d="${shape(patch.region)}" fill="none" stroke="#ad604b" stroke-dasharray="2 1" stroke-width=".8"/>`);
}
for (const p of publicInterfaces.filter(p => p.elevation === -8)) {
    shapes.push(`<path d="M${p.boundary[0].x},${p.boundary[0].z}L${p.boundary[1].x},${p.boundary[1].z}" stroke="#a94e43" stroke-width="2"/><circle cx="${p.outside.x}" cy="${p.outside.z}" r="1.7" fill="#a94e43"><title>${esc(p.id)}</title></circle>`);
}
for (const c of publicAccess.connections) {
    shapes.push(`<path d="M${c.from.x},${c.from.z}L${c.to.x},${c.to.z}" stroke="#305d82" stroke-width="1.4"/><circle cx="${c.from.x}" cy="${c.from.z}" r="2" fill="#305d82"><title>${esc(c.id)}</title></circle>`);
}

/**
 * Create an underground review canvas with the supplied view box and shared legend.
 */
const panel = (name: string, box: string, w = 1200, h = 1500) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${box}"><rect x="-2000" y="-2000" width="6000" height="6000" fill="#f5f3e9"/><g font-family="Microsoft YaHei,sans-serif">${shapes.join('')}</g><title>${esc(name)}</title></svg>`;
const output = 'build/geography';
mkdirSync(output, { recursive: true });
writeFileSync(output + '/stage-three-underground.svg', panel('阶段三地下公共区平面', '200 150 850 1100'));
writeFileSync(output + '/stage-three-north.svg', panel('北侧地下接口及公共设备', '240 380 500 300', 1500, 900));
writeFileSync(output + '/stage-three-south.svg', panel('南侧地下公共区及建筑占用', '300 660 650 510', 1300, 1020));
const projection = sourceProjection();
const pendingBuildings = basementOccupancies.filter(building => basements.contacts.some(c => c.buildingId === building.id && c.status === 'needs-review'));
const basementGaps = basementBoundaryGaps(pendingBuildings, undergroundPublicAreas);
const report = {
    scope: 'Offline planar geometry only; no route certification, surveyed heights, WebGL or touch verification.',
    blocks: undergroundBlocks.map(b => ({ id: b.id, faces: b.areas.length, holes: b.areas.reduce((n, a) => n + (a.holes?.length ?? 0), 0) })),
    components: components.map((p, i) => ({ index: i, holes: p.length - 1 })),
    interfaces: publicInterfaceBindings.map(b => ({
        ...b,
        component: components.findIndex(c => contains(c, publicInterfaces.find(p => p.id === b.interfaceId)!.outside))
    })),
    sourceControls: projection.roadControls.map(c => ({
        name: c.name,
        reference: c.reference,
        projected: projection.project(c.reference),
        component: components.findIndex(p => {
            const [x, z] = projection.project(c.reference);
            return contains(p, { x, z });
        })
    })),
    authoredPatches: undergroundPatches,
    publicEquipment: publicAccess.connections,
    basementContacts: basements.contacts,
    basementGaps,
    unconfirmed: 'Building contact means geometric adjacency/overlap of host envelopes only, not a verified door. PDF derivative permission and individual underground heights remain pending.',
};
writeFileSync(output + '/stage-three-audit.json', JSON.stringify(report, null, 2));
const gapMarks = basementGaps.flatMap(gap => {
    if (gap.kind !== 'boundary-gap' || !gap.buildingPoint || !gap.publicPoint) {
        return [];
    }
    const { buildingPoint: a, publicPoint: b } = gap;
    return [`<path d="M${a.x},${a.z}L${b.x},${b.z}" stroke="#ad604e" stroke-width="1" stroke-dasharray="1 1"/><circle cx="${a.x}" cy="${a.z}" r="2" fill="#ad604e"><title>${esc(gap.buildingId)}: ${gap.gapMetres?.toFixed(2)} m diagnostic gap, NOT a passage</title></circle>`];
});
shapes.push(...gapMarks);
writeFileSync(
    output + '/stage-three-basement-review.svg',
    panel('占位边界差距核查：虚线是诊断距离，不是通道', '200 720 650 340', 1500, 785)
);
console.log(JSON.stringify({
    blocks: report.blocks.length,
    publicFaces: undergroundPublicAreas.length,
    components: components.length,
    b1Gates: report.interfaces.length,
    gateComponents: [...new Set(report.interfaces.map(i => i.component))],
    basementBuildings: report.basementContacts.length,
    needsContactReview: report.basementContacts.filter(c => c.status === 'needs-review').map(c => c.buildingId),
    publicEquipment: report.publicEquipment.length
}));
