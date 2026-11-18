import assert from 'node:assert/strict';
import { test } from 'node:test';
import clipping from 'polygon-clipping';
import * as T from 'three';
import ways from '../../data/geography/elevated/ways.json' with { type: 'json' };
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { deckBoundarySegments } from '../../src/application/public-areas/deck-boundaries.ts';
import { displayElevation } from '../../src/application/exploration/display-elevation.ts';
import { explorationElevation } from '../../src/application/exploration/exploration-level.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import type { FloorArea, PlanRegion, Point2 } from '../../src/domain/map/model.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { deckAccess, deckBuildingAreas, edges, elevated, elevatedAreas, exteriorOpenings, layout, levels } from '../../src/infrastructure/district/geographic-map.ts';
import { createGeographicStations } from '../../src/infrastructure/district/geographic-stations.ts';
import { pendingDecks } from '../../src/infrastructure/public-areas/elevated-source.ts';
import { buildFloorGeometry } from '../../src/presentation/models/floor-geometry.ts';
import { buildGeographicBuilding } from '../../src/presentation/models/buildings/geographic-building-model.ts';

const geometry = (a: PlanRegion) => [a.outline, ...a.holes ?? []].map(r => r.map(p => [p.x, p.z] as [
    number,
    number
]));
const contains = (a: PlanRegion, p: Point2) => pointInPolygon(p, a.outline) && !a.holes?.some(h => pointInPolygon(p, h));
const size = (g: clipping.MultiPolygon) => g.reduce(
    (s, p) => s + p.reduce(
        (s, r, i) => s + (i ? -1 : 1) * Math.abs(r.reduce(
            (n, a, i) => {
                const b = r[(i + 1) % r.length]!;
                return n + a[0] * b[1] - a[1] * b[0];
            },
            0
        )) / 2,
        0
    ),
    0
);
test(
    'elevated blocks retain OSM axes and add the separately evidenced Inogate bridge',
    () => {
        assert.equal(ways.ways.length, 34);
        assert.ok(ways.ways.every(w => w.tags.highway === 'footway'));
        assert.equal(elevated.blocks.length, 4);
        assert.ok(elevated.blocks.every(b => b.paths.length && b.evidence.source === 'district'));
        assert.equal(pendingDecks.length, 0);
        assert.ok(elevated.blocks.flatMap(b => b.paths).some(p => p.id === 'inogate-grand-green-bridge'));
        assert.deepEqual(
            edges,
            createGeographicStations().flatMap(s => s.edges),
            'new deck must not infer route edges'
        );
        assert.equal(layout.passages.filter(p => p.kind === 'deck' && p.label).length, 2);
        assert.ok(
            layout.passages.filter(p => p.id.startsWith('label-')).every(p => p.surfaceId && layout.areas.some(a => a.id === p.surfaceId)),
            'label must not create another bridge slab'
        );
    }
);
test(
    'deck faces have one owner at junctions, avoid station paid/public duplicates, and keep both height bands in 2F',
    () => {
        for (const a of elevatedAreas) {
            assert.ok(a.blockId && a.railings && !a.label);
            assert.equal(explorationElevation(levels.find(l => l.id === a.level)!), 8);
            const y = levels.find(l => l.id === a.level)!.y;
            for (const b of layout.areas.filter(b => b.id !== a.id && levels.find(l => l.id === b.level)!.y + (b.elevationOffset ?? 0) === y)) {
                assert.ok(size(clipping.intersection(geometry(a), geometry(b))) < 1e-5, a.id + ' overlaps ' + b.id);
            }
            for (const t of [0, .5, 1]) {
                assert.equal(
                    displayElevation(levels, a.level, t),
                    displayElevation(levels, y === 8 ? 'platform' : 'south-deck', t)
                );
            }
        }
    }
);
test(
    'Yodobashi surrounding gallery is continuous, keeps retail void, and is not duplicated in the shell',
    () => {
        const b = geographicBuildings.find(b => b.id === 'yodobashi')!;
        const g = b.galleries![0]!;
        const ring = clipping.difference(
            [g.outline.map(p => [p.x, p.z] as [
                number,
                number
            ])],
            [g.innerOutline.map(p => [p.x, p.z] as [
                number,
                number
            ])]
        );
        assert.equal(ring.length, 1);
        assert.equal(ring[0]!.length, 2);
        assert.ok(!buildGeographicBuilding(b).getObjectByName('building-gallery'));
        const own = elevatedAreas.filter(a => a.blockId === 'north-decks');
        const center = g.innerOutline.reduce(
            (p, q) => ({ x: p.x + q.x / g.innerOutline.length, z: p.z + q.z / g.innerOutline.length }),
            { x: 0, z: 0 }
        );
        assert.ok(!own.some(a => contains(a, center)));
    }
);
test(
    'commercial 2F context is occupancy only and cannot cover walking faces or become a route',
    () => {
        assert.equal(new Set(deckBuildingAreas.map(a => a.blockId)).size, 14);
        for (const a of deckBuildingAreas) {
            assert.equal(a.kind, 'commercial');
            assert.ok(a.labelStyle === 'floor');
            for (const b of layout.areas.filter(b => b.kind === 'public' && levels.find(l => l.id === b.level)!.y === levels.find(l => l.id === a.level)!.y)) {
                assert.ok(size(clipping.intersection(geometry(a), geometry(b))) < 1e-5, a.id + ' covers walkway');
            }
        }
    }
);
test(
    'new public deck equipment has supported landings and real holes through every same-height overlapping slab',
    () => {
        const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
        assert.equal(deckAccess.connections.length, 10);
        for (const c of deckAccess.connections) {
            assert.ok(c.blockId && c.evidence.source === 'district');
            for (const n of [c.from, c.to]) {
                assert.ok(
                    layout.areas.some(a => a.kind === 'public' && levels.find(l => l.id === a.level)!.y === levels.find(l => l.id === n.level)!.y && contains(a, n)),
                    c.id + ' unsupported landing'
                );
            }
            const cut = openings.find(o => o.connectionId === c.id && o.level === c.to.level)!;
            assert.ok(cut);
            const p = cut.outline.reduce(
                (p, q) => ({ x: p.x + q.x / cut.outline.length, z: p.z + q.z / cut.outline.length }),
                { x: 0, z: 0 }
            );
            const y = levels.find(l => l.id === c.to.level)!.y;
            for (const a of layout.areas.filter(a => levels.find(l => l.id === a.level)!.y === y && contains(a, p))) {
                const mesh = new T.Mesh(
                    buildFloorGeometry(
                        a.outline,
                        [...a.holes ?? [], ...openings.filter(o => o.level === a.level).map(o => o.outline)],
                        .55,
                        0
                    ),
                    new T.MeshBasicMaterial({ side: T.DoubleSide })
                );
                mesh.updateMatrixWorld();
                assert.equal(
                    new T.Raycaster(new T.Vector3(p.x, 3, p.z), new T.Vector3(0, -1, 0), 0, 5).intersectObject(mesh).length,
                    0,
                    c.id + ' sealed by ' + a.id
                );
                mesh.geometry.dispose();
                (mesh.material as T.Material).dispose();
            }
        }
    }
);
test(
    'bridge barriers leave continuation seams and declared doors open',
    () => {
        const proof = { pages: [], detail: 'fixture' };
        const outline = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }, { x: 0, z: 10 }];
        const a: FloorArea = {
            id: 'a',
            level: 'district-south-deck',
            kind: 'public',
            name: 'a',
            outline,
            evidence: proof
        };
        const b = { ...a, id: 'b', outline: outline.map(p => ({ x: p.x + 10, z: p.z })) };
        const segments = deckBoundarySegments(a, [a, b], levels, [], []);
        assert.ok(segments.length);
        assert.ok(!segments.some(s => s.from.x === 10 && s.to.x === 10));
        for (const a of elevatedAreas) {
            assert.ok(deckBoundarySegments(a, layout.areas, levels, exteriorOpenings, layout.connections).every(s => Number.isFinite(s.from.x + s.to.z)));
        }
    }
);
test(
    'explicit building mouths cut facade bodies and bands at bridge height',
    () => {
        for (const door of exteriorOpenings) {
            const b = geographicBuildings.find(b => b.id === door.buildingId);
            if (!b) {
                assert.ok(
                    deckBuildingAreas.some(area => area.blockId === 'building:' + door.buildingId),
                    'unmodelled mouth must have a declared context host'
                );
                continue;
            }
            const host = b.volumes.filter(v => v.base < door.top && v.top > door.base);
            const intersection = clipping.intersection(geometry({ outline: door.outline }), ...host.slice(0, 1).map(geometry));
            assert.ok(intersection.length, door.buildingId + ' mouth misses host');
            const r = intersection[0]![0]!;
            const p = r.reduce((p, q) => ({ x: p.x + q[0] / r.length, z: p.z + q[1] / r.length }), { x: 0, z: 0 });
            const model = buildGeographicBuilding(b, exteriorOpenings);
            model.updateMatrixWorld(true);
            const ray = new T.Raycaster(new T.Vector3(p.x, door.top - .2, p.z), new T.Vector3(0, -1, 0), 0, door.top - door.base - .4);
            assert.equal(ray.intersectObject(model, true).length, 0, door.buildingId + ' blocked facade mouth');
            model.traverse(o => {
                if (o instanceof T.Mesh) {
                    o.geometry.dispose();
                }
            });
        }
    }
);
test(
    'Inogate west bridge reaches its Grand Green host through a continuous public 2F component',
    () => {
        const block = elevated.blocks.find(b => b.id === 'inogate-decks')!;
        const bridge = block.paths.find(p => p.id === 'inogate-grand-green-bridge')!;
        const start = elevated.portals.find(p => p.id === 'inogate-jr-public')!.point;
        const end = bridge.points.at(-1)!;
        const union = clipping.union(...layout.areas.filter(a => a.kind === 'public' && levels.find(l => l.id === a.level)!.y === 8).map(geometry) as [
            clipping.Polygon,
            ...clipping.Polygon[]
        ]);
        const components = union.map(p => ({
            outline: p[0]!.map(([x, z]) => ({ x, z })),
            holes: p.slice(1).map(r => r.map(([x, z]) => ({ x, z })))
        }));
        assert.ok(
            components.some(p => contains(p, start) && contains(p, end)),
            'bridge or Inogate frontage is disconnected from JR public 2F'
        );
        assert.ok(
            end.x < bridge.points[0]!.x && end.z < bridge.points[0]!.z,
            'Grand Green branch must leave the west end northwestward'
        );
        const host = deckBuildingAreas.filter(a => a.blockId === 'building:grand-green-south-gate');
        const mouth = exteriorOpenings.find(o => o.buildingId === 'grand-green-south-gate')!;
        assert.ok(host.length && mouth, 'destination context and declared mouth are missing');
        assert.ok(!host.some(a => contains(a, end)), 'host fill must yield to the public landing');
        assert.ok(bridge.evidence.detail?.includes('人工拟合'), 'do not present authored endpoints as surveyed');
    }
);
