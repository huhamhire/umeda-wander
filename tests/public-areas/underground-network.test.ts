import assert from 'node:assert/strict';
import { test } from 'node:test';
import clipping from 'polygon-clipping';
import * as T from 'three';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { partitionPublicAreas } from '../../src/application/public-areas/public-area-blocks.ts';
import { assembleSharedUnderground } from '../../src/application/public-areas/shared-underground.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import type { PlanRegion, Point2 } from '../../src/domain/map/model.ts';
import { basements, edges, facilities, geographicPlan, layout, levels, nodes, publicAccess, publicFrontages, publicInterfaceBindings, publicInterfaces, undergroundBlocks, undergroundPublicAreas } from '../../src/infrastructure/district/geographic-map.ts';
import { createGeographicStations } from '../../src/infrastructure/district/geographic-stations.ts';
import { facilityCodes } from '../../src/infrastructure/facility-codes.ts';
import { undergroundBlockDefinitions, undergroundPatches } from '../../src/infrastructure/public-areas/underground-blocks.ts';
import { buildFloorGeometry } from '../../src/presentation/models/floor-geometry.ts';

const geometry = (a: PlanRegion) => [a.outline, ...a.holes ?? []].map(r => r.map(p => [p.x, p.z] as [
    number,
    number
]));
const contains = (a: PlanRegion, p: Point2) => pointInPolygon(p, a.outline) && !a.holes?.some(r => pointInPolygon(p, r));
const ringArea = (r: clipping.Ring) => Math.abs(r.reduce((s, p, i) => {
    const q = r[(i + 1) % r.length]!;
    return s + p[0] * q[1] - p[1] * q[0];
}, 0)) / 2;
const area = (g: clipping.MultiPolygon) => g.reduce((s, p) => s + ringArea(p[0]!) - p.slice(1).reduce((s, r) => s + ringArea(r), 0), 0);
const flat = undergroundPublicAreas.filter(a => !a.elevationOffset);
const union = clipping.union(geometry(flat[0]!), ...flat.slice(1).map(geometry));
test(
    'public maintenance blocks preserve the reviewed excavation union, its holes and a single surface owner',
    () => {
        const patches = undergroundPatches.map(p => ({
            id: p.id,
            level: 'district-underground' as const,
            name: p.name,
            kind: 'public' as const,
            ...p.region,
            evidence: p.evidence
        }));
        const shared = assembleSharedUnderground(
            createGeographicStations(),
            geographicPlan.underground as clipping.MultiPolygon,
            [
                ...publicFrontages,
                ...patches,
                ...publicAccess.areas.filter(a => a.level === 'district-underground')
            ]
        );
        const expected = shared.areas.filter(a => !a.elevationOffset).map(geometry);
        assert.ok(area(clipping.xor(union, clipping.union(expected[0]!, ...expected.slice(1)))) < 1e-5);
        assert.equal(undergroundBlocks.length, 9);
        for (const b of undergroundBlocks) {
            for (const a of b.areas) {
                assert.equal(a.blockId, b.id);
                assert.equal(a.level, 'district-underground');
                assert.equal(a.label, false);
            }
        }
        for (let i = 0; i < flat.length; i++) {
            for (let j = i + 1; j < flat.length; j++) {
                assert.ok(area(clipping.intersection(geometry(flat[i]!), geometry(flat[j]!))) < 1e-5, 'duplicate public face');
            }
        }
        assert.ok(union.reduce((n, p) => n + p.length - 1, 0) > 25, 'reference building holes lost');
        assert.throws(
            () => partitionPublicAreas(shared.areas, undergroundBlockDefinitions.slice(0, -1)),
            /remainder owner/
        );
    }
);
test(
    'all sixteen B1 gate seams reach the same regional public component, including both M16 central forecourts',
    () => {
        const ports = publicInterfaces.filter(p => p.elevation === -8);
        const components = ports.map(p => union.findIndex(poly => contains(
            {
                outline: poly[0]!.map(([x, z]) => ({ x, z })),
                holes: poly.slice(1).map(r => r.map(([x, z]) => ({ x, z })))
            },
            p.outside
        )));
        assert.equal(ports.length, 16);
        assert.ok(components.every(i => i >= 0));
        assert.equal(new Set(components).size, 1);
        for (const b of publicInterfaceBindings) {
            assert.ok(b.surfaceIds.length);
            assert.ok(b.surfaceIds.includes(b.surfaceId));
            assert.equal(b.elevation, -8);
        }
        const paid = layout.areas.filter(a => a.kind === 'paid' && levels.find(l => l.id === a.level)?.y === -8);
        for (const a of paid) {
            assert.ok(area(clipping.intersection(union, geometry(a))) < 1e-5, a.id + ' public shortcut');
        }
    }
);
test(
    'Y11 public hall and north/middle gate exits face east while its paid concourse stays west',
    () => {
        const station = createGeographicStations().find(s => s.id === 'nishi-umeda')!;
        const portals = publicInterfaces.filter(p => p.station === station.id && !p.gateId.includes('south'));
        assert.equal(portals.length, 2);
        for (const p of portals) {
            assert.ok(p.outside.x > p.inside.x, p.id + ' faces wrong side');
        }
    }
);
test(
    'basement fills and labels remain inside host occupancy and yield to public and station interiors',
    () => {
        assert.equal(basements.contacts.length, 18);
        const interiors = layout.areas.filter(a => !a.blockId && a.kind !== 'public' && levels.find(l => l.id === a.level)?.y === -8);
        for (const a of basements.areas) {
            assert.ok(area(clipping.intersection(geometry(a), union)) < 1e-5, a.id + ' seals public excavation');
            for (const b of interiors) {
                assert.ok(area(clipping.intersection(geometry(a), geometry(b))) < 1e-5, a.id + ' occupies paid hall');
            }
            if (a.label) {
                assert.ok(contains(a, a.labelAnchor!));
                assert.ok(a.labelWidth! >= 8);
            }
        }
        for (let i = 0; i < basements.areas.length; i++) {
            for (let j = i + 1; j < basements.areas.length; j++) {
                assert.ok(area(clipping.intersection(geometry(basements.areas[i]!), geometry(basements.areas[j]!))) < 1e-5);
            }
        }
        assert.deepEqual(basements.contacts.filter(c => c.status === 'needs-review').map(c => c.buildingId), []);
        // JP's source-confirmed sunken garden now contacts its host. This alone does
        // not assert attachment to Garden Avenue or a usable underground entrance.
        assert.equal(basements.contacts.find(c => c.buildingId === 'jp-tower')!.status, 'geometric-contact');
    }
);
test(
    'public equipment retains source references and actual upper-floor apertures, without inventing paid transfers',
    () => {
        const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
        for (const c of publicAccess.connections) {
            assert.ok(c.blockId);
            assert.ok(c.evidence.urls?.length);
            assert.ok([c.from, c.to].some(n => n.level === 'district-underground'));
            const upper = [c.from, c.to].find(n => levels.find(l => l.id === n.level)!.y === 0)!;
            const facing = c.doorFacingRad;
            const landing = facing === undefined ? upper : {
                x: upper.x + 2 * Math.cos(facing),
                z: upper.z + 2 * Math.sin(facing)
            };
            const surfaces = layout.areas.filter(a => a.level === upper.level);
            assert.ok(surfaces.some(a => contains(a, landing)), c.id + ' unsupported upper landing');
            const cuts = openings.filter(o => o.level === upper.level);
            assert.ok(cuts.some(o => o.connectionId === c.id));
            const cut = cuts.find(o => o.connectionId === c.id)!;
            const center = cut.outline.reduce(
                (p, q) => ({ x: p.x + q.x / cut.outline.length, z: p.z + q.z / cut.outline.length }),
                { x: 0, z: 0 }
            );
            for (const surface of surfaces.filter(a => contains(a, center))) {
                const g = buildFloorGeometry(surface.outline, [...surface.holes ?? [], ...cuts.map(o => o.outline)], .55, 0);
                const mesh = new T.Mesh(g, new T.MeshBasicMaterial({ side: T.DoubleSide }));
                mesh.updateMatrixWorld();
                assert.equal(
                    new T.Raycaster(new T.Vector3(center.x, 5, center.z), new T.Vector3(0, -1, 0), 0, 10).intersectObject(mesh).length,
                    0,
                    c.id + ' sealed aperture'
                );
                g.dispose();
                (mesh.material as T.Material).dispose();
            }
            if (c.kind === 'elevator') {
                assert.ok(Math.hypot(c.from.x - c.to.x, c.from.z - c.to.z) < 1e-8);
            }
        }
        assert.equal(new Set(nodes.map(n => n.id)).size, nodes.length);
        assert.deepEqual(
            edges,
            createGeographicStations().flatMap(s => s.edges),
            'public geometry must not infer route edges'
        );
    }
);
test(
    'every geographic facility has a stable unique internal code, including independently owned public equipment',
    () => {
        const codes = facilities.map(f => facilityCodes[f.id]);
        assert.ok(codes.every(c => c && /^(JR|HK|M16|HS|T20|Y11|KS|PUB)-\d{3}$/.test(c)));
        assert.equal(new Set(codes).size, codes.length);
        assert.equal(facilityCodes['connection-district-jr-metro-stairs-from'], 'JR-183');
        const stairs = publicAccess.connections.find(c => c.id === 'district-jr-metro-stairs')!;
        assert.equal(stairs.from.level, 'concourse');
        assert.equal(stairs.to.level, 'district-underground');
    }
);
