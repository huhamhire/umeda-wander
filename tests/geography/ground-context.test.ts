import { test } from 'node:test';
import assert from 'node:assert/strict';
import clipping from 'polygon-clipping';
import * as T from 'three';
import context from '../../data/geography/display-context.json' with { type: 'json' };
import plan from '../../data/geography/runtime-plan.json' with { type: 'json' };
import { planAtriumOpenings } from '../../src/application/connections/atrium-openings.ts';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { grandFrontPlazaAccess, layout, levels, undergroundPublicAreas } from '../../src/infrastructure/district/geographic-map.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { buildingScopeOutline } from '../../src/infrastructure/buildings/building-data.ts';
import { inogateHosts } from '../../src/infrastructure/public-areas/west-decks/inogate.ts';
import { platformOutline } from '../../src/domain/map/geometry.ts';
import type { PlanRegion } from '../../src/domain/map/model.ts';
import { buildGeographicContext, groundBuildingLabelPlacements } from '../../src/presentation/models/public-areas/geographic-context.ts';
import { basementOccupancies } from '../../src/infrastructure/public-areas/basement-buildings.ts';

const geometry = (region: PlanRegion): clipping.Polygon => [region.outline, ...region.holes ?? []].map(r => r.map(p => [p.x, p.z]));
const area = (g: clipping.MultiPolygon) => g.reduce(
    (sum, p) => sum + p.reduce(
        (sum, r, i) => sum + (i ? -1 : 1) * Math.abs(r.reduce(
            (sum, a, j) => {
                const b = r[(j + 1) % r.length]!;
                return sum + a[0] * b[1] - a[1] * b[0];
            },
            0
        )) / 2,
        0
    ),
    0
);
const scope = context.scope as clipping.MultiPolygon;

test('the western building scope keeps its plaza without promoting the historical footway to a current ground route', () => {
    const square = layout.areas.find(area => area.id === 'umeda-sky-wonder-square')!;
    assert.ok(area(clipping.difference(geometry(square), scope)) < .01);
    assert.ok(plan.ground.some(feature => feature.id === 'way/306860236'));
    assert.ok(!context.surfaces.some(surface => surface.id === 'way/306860236'));
});

/** Release the complete terrain fixture after all opening samples have been checked. */
function disposeGround(groups: T.Group[]): void {
    for (const group of groups) {
        group.traverse(object => {
            if (object instanceof T.Mesh) {
                object.geometry.dispose();
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                materials.forEach(material => material.dispose());
            }
        });
    }
}

test(
    'display pruning keeps underground, platforms and destination contexts under an opaque ground mask',
    () => {
        const regions = [
            ...undergroundPublicAreas,
            ...basementOccupancies.map(b => b.region),
            ...layout.platforms.map(p => ({ outline: platformOutline(p) })),
            ...layout.areas.filter(a => a.railings),
            ...layout.areas.filter(a => a.id.startsWith('hankyu-concourse-north-ground-')),
            ...geographicBuildings.map(b => ({ outline: b.shell ? buildingScopeOutline(b) : b.volumes[0]!.outline })),
            ...inogateHosts.map(host => host.region),
        ];
        for (const region of regions) {
            assert.ok(
                area(clipping.difference(geometry(region), scope)) < .01,
                'display crop removed a station, public network or core building'
            );
        }
    }
);
test(
    'retained ground features stay inside scope and unrelated anonymous building tiles are absent',
    () => {
        const hosts = new Set(context.surfaces.filter(s => s.kind === 'building').map(s => s.id));
        assert.ok(hosts.size < 30 && hosts.size > 10, 'unexpected broad building context or missing related hosts');
        assert.ok(context.surfaces.length < plan.ground.length * .6, 'outer road/occupancy clutter was not reduced');
        assert.ok(
            ['way/1147394005', 'way/1147394027', 'way/179071473'].every(id => hosts.has(id)),
            'Inogate, South Tower or the garage lost its ground context'
        );
        const sourceIds = new Set(plan.ground.map(f => f.id));
        for (const surface of context.surfaces) {
            assert.ok(sourceIds.has(surface.id), 'display crop invented an OSM feature');
            // The offline union normalizes intersections to 1 mm; allow its tiny edge slivers.
            assert.ok(
                area(clipping.difference(surface.geometry as clipping.MultiPolygon, scope)) < .02,
                'surface escapes display mask'
            );
        }
    }
);
test(
    'trimmed ground and retained paving preserve real access openings',
    t => {
        const center = { x: 400, z: 600 };
        const opening = [
            { x: center.x - 2, z: center.z - 2 },
            { x: center.x + 2, z: center.z - 2 },
            { x: center.x + 2, z: center.z + 2 },
            { x: center.x - 2, z: center.z + 2 },
        ];
        const context = buildGeographicContext([opening]);
        t.after(() => disposeGround(Object.values(context)));
        for (const child of context.buildings.children) {
            assert(child instanceof T.Mesh);
            child.geometry.computeBoundingBox();
            assert(child.geometry.boundingBox!.max.y <= 0);
        }
        context.roads.updateMatrixWorld(true);
        const ray = new T.Raycaster(new T.Vector3(center.x, 5, center.z), new T.Vector3(0, -1, 0), 0, 10);
        assert.equal(
            ray.intersectObject(context.roads, true).length,
            0,
            'ground skin or road paving sealed the access hole'
        );
    }
);

test('the nine named southern footprints fit ground labels around equipment openings', () => {
    const openingRings = [
        ...planFloorOpenings(layout.connections, levels, layout.platforms),
        ...planAtriumOpenings(layout.atria)
    ].filter(o => levels.find(l => l.id === o.level)?.y === 0).map(o => o.outline);
    const labels = groundBuildingLabelPlacements(openingRings);
    assert.deepEqual(labels.map(l => l.id).sort(), [
        'relation/6803731', 'way/135624700', 'way/162158019', 'way/162158020', 'way/162158150',
        'way/162158151', 'way/162158153', 'way/70561756', 'way/70561758'
    ]);
    const openings = openingRings.map(outline => geometry({ outline }));
    const openingUnion = clipping.union(openings[0]!, ...openings.slice(1));
    for (const label of labels) {
        assert.ok(label.name.trim() && label.width >= 20, label.id + ' has an unreadable label');
        const c = Math.cos(label.angle);
        const s = Math.sin(label.angle);
        const half = label.width / 2;
        const corners: clipping.Pair[] = [[-half, -half * .375], [half, -half * .375], [half, half * .375], [-half, half * .375]];
        const text: clipping.Polygon = [corners.map(([x, z]) => [
            label.anchor.x + x * c - z * s, label.anchor.z + x * s + z * c
        ])];
        const footprint = context.surfaces.find(surface => surface.id === label.id)!.geometry as clipping.MultiPolygon;
        assert.equal(area(clipping.difference(text, footprint)), 0, label.id + ' name crosses the footprint boundary');
        assert.equal(area(clipping.intersection(text, openingUnion)), 0, label.id + ' name covers an opening');
    }
});

test('the assembled ground leaves the Grand Front and HERBIS plaza openings clear', t => {
    const openings = [
        ...planFloorOpenings(layout.connections, levels, layout.platforms),
        ...planAtriumOpenings(layout.atria)
    ].filter(opening => levels.find(level => level.id === opening.level)!.y === 0);
    const context = buildGeographicContext(openings.map(opening => opening.outline));
    const groups = Object.values(context);
    t.after(() => disposeGround(groups));
    groups.forEach(group => group.updateMatrixWorld(true));

    for (const { id } of grandFrontPlazaAccess.connections) {
        const opening = openings.find(o => o.connectionId === id && o.level === 'district-ground');
        assert(opening, id + ' is missing its ground opening');
        const p = opening.outline.reduce(
            (p, q) => ({ x: p.x + q.x / opening.outline.length, z: p.z + q.z / opening.outline.length }),
            { x: 0, z: 0 }
        );
        const ray = new T.Raycaster(new T.Vector3(p.x, 3, p.z), new T.Vector3(0, -1, 0), 0, 8);
        assert.equal(ray.intersectObject(context.roads, true).length, 0, id + ' ground reseals the opening');
    }

    const plaza = openings.find(o => o.connectionId === 'herbis-ent-sunken-entrance');
    assert.equal(plaza?.level, 'district-ground', 'HERBIS ENT is missing its ground opening');
    const ray = new T.Raycaster(new T.Vector3(395, 3, 865), new T.Vector3(0, -1, 0), 0, 7);
    assert.equal(ray.intersectObjects(groups, true).length, 0, 'The 1F surface reseals the HERBIS ENT plaza');
    ray.ray.origin.set(394.427, 3, 860.492);
    assert(ray.intersectObjects(groups, true).length, 'The HERBIS ENT upper footway loses its pavement');
});
