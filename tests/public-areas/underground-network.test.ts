import assert from 'node:assert/strict';
import { test } from 'node:test';
import clipping from 'polygon-clipping';
import * as T from 'three';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { connectionLanes } from '../../src/application/connections/connection-lanes.ts';
import { partitionPublicAreas } from '../../src/application/public-areas/public-area-blocks.ts';
import { assembleSharedUnderground } from '../../src/application/public-areas/shared-underground.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import { findRoute } from '../../src/domain/navigation/find-route.ts';
import type { PlanRegion, Point2 } from '../../src/domain/map/model.ts';
import { geographicBuildings } from '../../src/infrastructure/buildings/index.ts';
import { basements, edges, facilities, geographicPlan, layout, levels, nodes, publicAccess, publicFrontages, publicInterfaceBindings, publicInterfaces, publicWalkingRoutes, undergroundBlocks, undergroundPublicAreas } from '../../src/infrastructure/district/geographic-map.ts';
import { createGeographicStations } from '../../src/infrastructure/district/geographic-stations.ts';
import { createWalkingNetwork } from '../../src/infrastructure/district/walking-network.ts';
import { facilityCodes } from '../../src/infrastructure/facility-codes.ts';
import { calibrateGardenAvenueOutline } from '../../src/infrastructure/public-areas/south-diamor/garden-avenue-access.ts';
import { undergroundBlockDefinitions, undergroundPatches } from '../../src/infrastructure/public-areas/underground-blocks.ts';
import { buildFloorGeometry } from '../../src/presentation/models/floor-geometry.ts';
import { buildGeographicBuilding } from '../../src/presentation/models/buildings/geographic-building-model.ts';
import { VerticalConnectionModel } from '../../src/presentation/models/stations/vertical-connection-model.ts';
import { buildWaterTree } from '../../src/presentation/models/public-areas/water-tree-model.ts';

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
            calibrateGardenAvenueOutline(geographicPlan.underground as clipping.MultiPolygon),
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
        // The basement contact check only describes the host footprint. Public routes are verified separately.
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
            const fromY = levels.find(l => l.id === c.from.level)!.y + (c.from.elevationOffset ?? 0);
            const toY = levels.find(l => l.id === c.to.level)!.y + (c.to.elevationOffset ?? 0);
            const upper = fromY > toY ? c.from : c.to;
            const facing = c.doorFacingRad;
            const landing = facing === undefined ? upper : {
                x: upper.x + 2 * Math.cos(facing),
                z: upper.z + 2 * Math.sin(facing)
            };
            const surfaces = layout.areas.filter(a => a.level === upper.level && (a.elevationOffset ?? 0) === (upper.elevationOffset ?? 0));
            assert.ok(surfaces.some(a => contains(a, landing)), c.id + ' unsupported upper landing');
            if (c.placement === 'exterior') {
                assert(!openings.some(o => o.connectionId === c.id), c.id + ' cuts an exterior landing');
                continue;
            }
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
            [...createGeographicStations().flatMap(s => s.edges), ...publicWalkingRoutes.edges],
            'only authored station and public walking edges can enter the routing graph'
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

test('M16 street exits preserve their geographic anchors, lane openings and public landings', () => {
    const exits = [
        ['district-jr-metro-stairs', '3A', 543.775, 470.115, 1, true],
        ['metro-umeda-exit-8', '8', 583.766, 595.640, 1, true],
        ['metro-umeda-exit-9', '9', 584.626, 559.105, 2, false],
        ['metro-umeda-exit-18', '18', 616.353, 654.127, 1, false]
    ] as const;
    for (const [id, number, x, z, lanes, canopy] of exits) {
        const exit = publicAccess.connections.find(c => c.id === id)!;
        assert(Math.hypot(exit.from.x - x, exit.from.z - z) < .002);
        assert.equal(exit.evidence.source, 'metro');
        assert.equal(connectionLanes(exit).length, lanes);
        assert.equal(layout.canopies.some(c => c.id === 'metro-umeda-exit-' + number + '-canopy'), canopy);
        assert.equal(planFloorOpenings([exit], levels, []).filter(o => o.level === exit.from.level).length, lanes);
        for (const lane of connectionLanes(exit)) {
            assert(layout.areas.some(a => a.level === lane.from.level && a.kind === 'public' && contains(a, lane.from)));
            assert(flat.some(a => contains(a, lane.to)));
        }
        assert(!edges.some(edge => [exit.from.id, exit.to.id].some(stop => edge.from === stop || edge.to === stop)));
    }
});

test('Sonechika public equipment stays on its documented approaches and 11-44 stays at street level', () => {
    const exit = publicAccess.connections.find(c => c.id === 'sonechika-exit-11-43')!;
    const lift = publicAccess.connections.find(c => c.id === 'sonechika-public-lift')!;
    const streetOnly = facilities.find(f => f.id === 'sonechika-exit-11-44')!;
    const main = union.find(p => contains({ outline: p[0]!.map(([x, z]) => ({ x, z })) }, { x: 735, z: 1088 }))!;
    const publicFloor = {
        outline: main[0]!.map(([x, z]) => ({ x, z })),
        holes: main.slice(1).map(ring => ring.map(([x, z]) => ({ x, z })))
    };
    assert.equal(exit.kind, 'escalator');
    assert(Math.hypot(exit.to.x - 767.87, exit.to.z - 1102.05) < .02);
    for (const c of [exit, lift]) {
        assert.equal(c.blockId, 'kitashinchi-public-b1');
        assert.equal(c.evidence.source, 'district');
        assert(contains(publicFloor, c.from));
        assert(!edges.some(e => [c.from.id, c.to.id].some(id => e.from === id || e.to === id)));
    }
    assert(contains(publicFloor, { x: lift.from.x - 2, z: lift.from.z }));
    assert(Math.hypot(lift.to.x - 719.62, lift.to.z - 1102.02) < .02);
    const model = new VerticalConnectionModel(lift, levels, []);
    model.update(id => levels.find(l => l.id === id)!.y, 'all');
    model.group.updateMatrixWorld(true);
    const lowerDoor = model.group.getObjectByName('lower-landing')!;
    const groundDoor = model.group.getObjectByName('upper-landing')!;
    for (const [door, x, z] of [[lowerDoor, -1, 0], [groundDoor, 0, 1]] as const) {
        assert(door.getWorldDirection(new T.Vector3()).distanceTo(new T.Vector3(x, 0, z)) < 1e-8);
    }
    assert.equal(streetOnly.level, 'district-ground');
    assert(Math.hypot(streetOnly.x - 768.43, streetOnly.z - 1070.03) < .02);
    assert(!layout.connections.some(c => c.id.includes('11-44')));
    for (const number of ['11-43', '11-44']) {
        assert(layout.canopies.some(c => c.id === 'sonechika-' + number + '-canopy'));
    }
});

test('Dotica C-60 branches from one B1 stair and C-69 joins the west side of the underground hall', () => {
    const prefix = 'dotica-exit-';
    const lower60 = publicAccess.connections.find(c => c.id === prefix + 'c-60-lower')!;
    const north60 = publicAccess.connections.find(c => c.id === prefix + 'c-60-north')!;
    const south60 = publicAccess.connections.find(c => c.id === prefix + 'c-60-south')!;
    const lower69 = publicAccess.connections.find(c => c.id === prefix + 'c-69-lower')!;
    const upper69 = publicAccess.connections.find(c => c.id === prefix + 'c-69')!;
    assert.equal(north60.from, lower60.to);
    assert.equal(south60.from, lower60.to);
    assert.equal(upper69.from, lower69.to);
    assert(north60.to.z < lower60.to.z && south60.to.z > lower60.to.z);
    assert(lower60.from.x < lower60.to.x && lower69.from.x > lower69.to.x);
    for (const [lower, hall, landingId] of [
        [lower60, { x: 412, z: 1100 }, prefix + 'c-60-turn-apron'],
        [lower69, { x: 406, z: 1175 }, prefix + 'c-69-turn-apron']
    ] as const) {
        assert(flat.some(a => a.blockId === lower.blockId && contains(a, hall) && contains(a, lower.from)));
        const landing = undergroundPublicAreas.find(a => a.id === landingId)!;
        assert.equal(landing.elevationOffset, lower.to.elevationOffset);
        assert(contains(landing, lower.to));
    }
    const wells = planFloorOpenings(layout.connections, levels, layout.platforms).filter(o => o.level === 'district-ground');
    for (const [upper, x, z, roof] of [
        [north60, 426.25, 1093.91, '619294244'],
        [south60, 424.23, 1116.72, '619294243'],
        [upper69, 398.46, 1156.84, '619294237']
    ] as const) {
        assert(Math.hypot(upper.to.x - x, upper.to.z - z) < .02);
        const well = wells.find(o => o.connectionId === upper.id)!;
        assert(contains(well, upper.to));
        assert(!wells.some(o => o !== well && clipping.intersection(geometry(o), geometry(well)).length));
        assert(!layout.exteriorOpenings.some(o => contains(o, upper.to)));
        const canopy = layout.canopies.find(c => c.id === upper.id + '-canopy')!;
        assert(canopy.evidence.urls?.includes('https://www.openstreetmap.org/way/' + roof));
    }
    assert(!edges.some(e => e.from.startsWith(prefix) || e.to.startsWith(prefix)));
});

test('Dotica C-83 and C-93 join the west side of the B1 hall and open into their own street canopies', () => {
    const wells = planFloorOpenings(layout.connections, levels, layout.platforms).filter(o => o.level === 'district-ground');
    for (const [number, x, z, hall, roof] of [
        [83, 387.46, 1264.04, { x: 405, z: 1259.8 }, '619294234'],
        [93, 407.06, 1349.44, { x: 418.2, z: 1336.4 }, '621688356']
    ] as const) {
        const id = 'dotica-exit-c-' + number;
        const lower = publicAccess.connections.find(c => c.id === id + '-lower')!;
        const upper = publicAccess.connections.find(c => c.id === id)!;
        assert.equal(upper.from, lower.to);
        assert(lower.from.x > lower.to.x && upper.to.z > upper.from.z);
        assert(flat.some(a => a.blockId === lower.blockId && contains(a, hall) && contains(a, lower.from)));
        const turn = undergroundPublicAreas.find(a => a.id === id + '-turn-apron')!;
        assert.equal(turn.elevationOffset, lower.to.elevationOffset);
        assert(contains(turn, lower.to));
        assert(Math.hypot(upper.to.x - x, upper.to.z - z) < .02);
        const well = wells.find(o => o.connectionId === upper.id)!;
        assert(contains(well, upper.to));
        assert(!wells.some(o => o !== well && clipping.intersection(geometry(o), geometry(well)).length));
        assert(!layout.exteriorOpenings.some(o => contains(o, upper.to)));
        assert(layout.canopies.find(c => c.id === id + '-canopy')?.evidence.urls?.includes('https://www.openstreetmap.org/way/' + roof));
        if (number === 83) {
            const escalator = publicAccess.connections.find(c => c.id === id + '-escalator')!;
            assert.equal(escalator.kind, 'escalator');
            assert.equal(escalator.to.elevationOffset, turn.elevationOffset);
            assert(contains(turn, escalator.to));
            assert(flat.some(a => a.blockId === lower.blockId && contains(a, lower.from) && contains(a, escalator.from)));
            assert(!wells.some(o => o.connectionId === escalator.id));
        }
        assert(!edges.some(e => e.from.startsWith(id) || e.to.startsWith(id)));
    }
});

test('Diamor D-23 and D-24 join the north B1 hall and keep their street wells distinct', () => {
    const lower = publicAccess.connections.find(c => c.id === 'diamor-exit-d-23-lower')!;
    const d23 = publicAccess.connections.find(c => c.id === 'diamor-exit-d-23')!;
    const d24 = publicAccess.connections.find(c => c.id === 'diamor-exit-d-24')!;
    assert.equal(lower.to, d23.from);
    const turn = undergroundPublicAreas.find(a => a.id === 'diamor-exit-d-23-turn-apron')!;
    assert.equal(turn.elevationOffset, lower.to.elevationOffset);
    assert(contains(turn, lower.to));
    assert(flat.some(a => a.blockId === 'hanshin-west-b1' && contains(a, lower.from) && contains(a, d24.from)));
    const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
    for (const [stairs, x, z, roof] of [[d23, 548.95, 811.37, '618802492'], [d24, 565.70, 801.41, '618802490']] as const) {
        assert(Math.hypot(stairs.to.x - x, stairs.to.z - z) < .02);
        const canopy = layout.canopies.find(c => c.id === stairs.id + '-canopy')!;
        assert(canopy.evidence.urls?.includes('https://www.openstreetmap.org/way/' + roof));
        const well = openings.find(o => o.connectionId === stairs.id && o.level === 'district-ground')!;
        assert(contains(well, stairs.to));
        assert(!layout.exteriorOpenings.some(o => contains(o, stairs.to)));
    }
});

test('Diamor central stairs link mapped street mouths to the correct B1 corridor', () => {
    const streetWells = planFloorOpenings(layout.connections, levels, layout.platforms).filter(o => o.level === 'district-ground');
    for (const [number, x, z, hall, roof] of [
        [22, 574.39, 796.61, { x: 559, z: 782 }],
        [27, 556.39, 831.46, { x: 559, z: 841 }, '618802485'],
        [31, 539.15, 867.22, { x: 557.4, z: 862.1 }],
        [33, 568.89, 862.86, { x: 575, z: 873.6 }, '618802475'],
        [39, 569.54, 905.59, { x: 575.5, z: 897.2 }],
        [41, 569.28, 917.76, { x: 575.7, z: 926.4 }],
        [44, 603.00, 943.58, { x: 574, z: 949.5 }]
    ] as const) {
        const id = 'diamor-exit-d-' + number;
        const stair = publicAccess.connections.find(c => c.id === id)!;
        assert(Math.hypot(stair.to.x - x, stair.to.z - z) < .02, id);
        assert(stair.stairLandingLength, id);
        assert(flat.some(a => a.blockId === stair.blockId && contains(a, hall) && contains(a, stair.from)), id);
        assert(!basements.areas.some(a => contains(a, stair.from)), id);
        const well = streetWells.find(o => o.connectionId === id)!;
        assert(contains(well, stair.to), id);
        assert(!streetWells.some(o => o !== well && clipping.intersection(geometry(o), geometry(well)).length), id);
        assert(!layout.exteriorOpenings.some(o => contains(o, stair.to)), id);
        const canopy = layout.canopies.find(c => c.id === id + '-canopy');
        assert.equal(Boolean(canopy), Boolean(roof), id);
        if (roof) {
            assert(canopy?.evidence.urls?.includes('https://www.openstreetmap.org/way/' + roof), id);
        }
        assert(!edges.some(e => e.from.startsWith(id) || e.to.startsWith(id)), id);
    }
});

test('Diamor D-40 preserves the mapped bend and lower path without a shortcut to the main hall', () => {
    const id = 'diamor-exit-d-40';
    const lower = publicAccess.connections.find(c => c.id === id + '-lower')!;
    const upper = publicAccess.connections.find(c => c.id === id)!;
    const street = facilities.find(f => f.id === id)!;
    assert.equal(street.level, 'district-ground');
    assert.equal(street.connectionId, id);
    assert(Math.hypot(street.x - 589.7, street.z - 937.5) < .08);
    assert.equal(lower.to, upper.from);
    assert(lower.from.z < lower.to.z && upper.from.x < upper.to.x);
    const turn = undergroundPublicAreas.find(a => a.id === id + '-turn-apron')!;
    assert.equal(turn.elevationOffset, lower.to.elevationOffset);
    assert(contains(turn, lower.to));
    const approach = flat.find(a => a.blockId === lower.blockId && contains(a, lower.from))!;
    assert(contains(approach, { x: 586.9, z: 927.5 }));
    assert(!contains(approach, { x: 578, z: 929.5 }));
    assert(!basements.areas.some(a => contains(a, lower.from)));
    const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
    assert(openings.some(o => o.connectionId === id && o.level === street.level && contains(o, street)));
    assert(!layout.exteriorOpenings.some(o => contains(o, street)));
    assert(!edges.some(e => e.from.startsWith(id) || e.to.startsWith(id)));
});

test('Diamor east access joins public walking surfaces at both ends and preserves the shared stair branch', () => {
    const network = createWalkingNetwork();
    const approaches = new Map(network.approaches);
    const groundWells = planFloorOpenings(layout.connections, levels, layout.platforms).filter(o => o.level === 'district-ground');
    const groundLevels = new Set(levels.filter(l => l.y === 0).map(l => l.id));
    const groundNodes = new Set(network.nodes.filter(n => groundLevels.has(n.level) && !n.elevationOffset).map(n => n.id));
    const streetEdges = network.edges.filter(e => e.kind === 'walk' && groundNodes.has(e.from) && groundNodes.has(e.to));
    const undergroundEdges = network.edges.filter(e => !groundNodes.has(e.from) && !groundNodes.has(e.to));
    const streetReference = 'diamor-exit-10-18-ground';
    const connection = (id: string) => {
        const found = publicAccess.connections.find(c => c.id === id);
        assert(found, id);
        return found;
    };

    const shared = connection('diamor-exit-e-26-lower');
    const bend = connection('diamor-exit-e-26-intermediate');
    assert.equal(shared.to, bend.from);
    assert.equal(shared.to, connection('diamor-exit-10-21').from);
    assert.equal(bend.to, connection('diamor-exit-e-26').from);
    assert.equal(shared.from.level, 'district-underground');

    for (const number of ['10-18', '10-22', 'E-8', 'E-13', 'E-14', 'E-17', 'E-20', '10-21', 'E-26', 'E-34', 'E-35', 'EV-4']) {
        const id = number === 'EV-4' ? 'diamor-lift-ev-4' : 'diamor-exit-' + number.toLowerCase();
        const access = connection(id);
        assert.equal(access.to.level, 'district-ground', id);
        assert(!basements.areas.some(a => contains(a, access.from)), id);
        assert(groundWells.some(o => o.connectionId === id && contains(o, access.to)), id);
        assert(network.edges.some(e => e.from === access.from.id && e.to === access.to.id && e.kind === access.kind), id);
        assert(findRoute(undergroundEdges, access.from.id, 'higashi-umeda-route-entry', false), id);
        assert(findRoute(streetEdges, access.to.id, streetReference, false), id);
        if (access.kind === 'stairs') {
            const entrance = facilities.find(f => f.id === id);
            assert.equal(entrance?.kind, 'entrance', id);
            assert.equal(entrance?.connectionId, id);
            assert(approaches.has(id), id);
        }
    }
    assert(groundWells.some(o => o.connectionId === 'diamor-lift-ev-4' && o.kind === 'elevator'));
    assert(layout.canopies.some(c => c.id === 'diamor-exit-e-14-canopy' &&
        c.evidence.urls?.includes('https://www.openstreetmap.org/way/618802467')));
    for (const id of ['diamor-exit-e-32', 'diamor-exit-e-33']) {
        assert.equal(facilities.find(f => f.id === id)?.level, 'district-ground');
        assert(findRoute(streetEdges, approaches.get(id)![0]!.id, streetReference, false), id);
        assert(!publicAccess.connections.some(c => c.id.startsWith(id)), id);
        assert(!groundWells.some(o => o.connectionId === id), id);
    }
});

test('Diamor D-49 and D-50 connect opposite sides of the B1 junction to their mapped sidewalks', () => {
    const lower = publicAccess.connections.find(c => c.id === 'diamor-exit-d-49-lower')!;
    const west = publicAccess.connections.find(c => c.id === 'diamor-exit-d-49')!;
    const east = publicAccess.connections.find(c => c.id === 'diamor-exit-d-50')!;
    assert.equal(lower.to, west.from);
    assert(lower.from.x > lower.to.x && west.to.x > west.from.x);
    assert(east.stairLandingLength);
    const landing = undergroundPublicAreas.find(a => a.id === west.id + '-turn-apron')!;
    assert.equal(landing.elevationOffset, lower.to.elevationOffset);
    assert(contains(landing, lower.to));
    const corridor = flat.find(a => a.blockId === 'diamor-b1' && contains(a, { x: 573, z: 972 }))!;
    assert(contains(corridor, lower.from) && contains(corridor, east.from));
    const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
    for (const [stairs, x, z, sidewalk] of [
        [west, 560.59, 976.43, { x: 560.56, z: 977.6 }],
        [east, 607.67, 974.48, { x: 607.53, z: 970 }]
    ] as const) {
        assert(Math.hypot(stairs.to.x - x, stairs.to.z - z) < .02);
        const apron = publicAccess.areas.find(a => a.id === stairs.id + '-street-apron')!;
        assert(contains(apron, sidewalk));
        assert(openings.some(o => o.connectionId === stairs.id && o.level === 'district-ground' && contains(o, stairs.to)));
        assert(!layout.exteriorOpenings.some(o => contains(o, stairs.to)));
        assert(!edges.some(e => e.from.startsWith(stairs.id) || e.to.startsWith(stairs.id)));
    }
    assert(layout.canopies.find(c => c.id === west.id + '-canopy')?.evidence.urls?.includes('https://www.openstreetmap.org/way/623086721'));
    assert(!layout.canopies.some(c => c.id === east.id + '-canopy'));
});

test('Diamor south stair pairs join the main B1 corridor and preserve their street directions', () => {
    const corridor = flat.find(a => a.blockId === 'diamor-b1' && contains(a, { x: 573, z: 1012 }))!;
    assert(corridor);
    const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
    for (const [number, x, z, direction, roofWay] of [
        [51, 568.09, 990.35, -1, undefined],
        [52, 579.38, 990.32, -1, undefined],
        [55, 566.62, 1002.92, -1, '623086716'],
        [56, 580.55, 1003.08, -1, '623086712'],
        [57, 567.42, 1037.64, 1, undefined],
        [58, 578.62, 1037.66, 1, undefined]
    ] as const) {
        const id = 'diamor-exit-d-' + number;
        const stair = publicAccess.connections.find(c => c.id === id)!;
        assert(Math.hypot(stair.to.x - x, stair.to.z - z) < .02, id);
        assert.equal(Math.sign(stair.to.z - stair.from.z), direction, id);
        assert(contains(corridor, stair.from), id);
        assert(openings.some(o => o.connectionId === id && o.level === 'district-ground' && contains(o, stair.to)), id);
        assert(!layout.exteriorOpenings.some(o => contains(o, stair.to)), id);
        const canopy = layout.canopies.find(c => c.id === id + '-canopy');
        assert.equal(Boolean(canopy), Boolean(roofWay), id);
        if (roofWay) {
            assert(canopy?.evidence.urls?.includes('https://www.openstreetmap.org/way/' + roofWay), id);
        }
    }
});

test('Whity northern entrances join the Izumi public floor and use independent street openings', () => {
    const plaza = { x: 998, z: 658 };
    const publicFloor = union.map(polygon => ({
        outline: polygon[0]!.map(([x, z]) => ({ x, z })),
        holes: polygon.slice(1).map(ring => ring.map(([x, z]) => ({ x, z })))
    })).find(polygon => contains(polygon, plaza))!;
    assert(publicFloor);
    const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
    for (const [number, x, z, roof] of [
        ['M-1', 974.69, 592.03, '618516676'],
        ['M-2', 1007.34, 588.36, '618516665'],
        ['M-5', 975.46, 603.30, '618516675'],
        ['M-6', 1007.73, 596.37, '618516664']
    ] as const) {
        const id = 'whity-exit-' + number.toLowerCase();
        const stairs = publicAccess.connections.find(c => c.id === id)!;
        assert.equal(stairs.kind, 'stairs');
        assert.equal(stairs.blockId, 'whity-b1');
        assert.equal(stairs.from.level, 'district-underground');
        assert.equal(stairs.to.level, 'district-ground');
        assert(contains(publicFloor, stairs.from), id);
        assert(Math.hypot(stairs.to.x - x, stairs.to.z - z) < .02, id);
        const canopy = layout.canopies.find(c => c.id === id + '-canopy')!;
        assert(canopy.evidence.urls?.includes('https://www.openstreetmap.org/way/' + roof), id);
        assert(openings.some(o => o.connectionId === id && o.level === 'district-ground'), id);
        assert(!layout.exteriorOpenings.some(o => contains(o, stairs.to)), id);
        assert(!edges.some(e => [stairs.from.id, stairs.to.id].some(stop => e.from === stop || e.to === stop)));
    }
});

test('Whity North Mall street anchors correct the common B1 floor and open only the HEP FIVE stair mouth', () => {
    const component = union.map(polygon => ({
        outline: polygon[0]!.map(([x, z]) => ({ x, z })),
        holes: polygon.slice(1).map(ring => ring.map(([x, z]) => ({ x, z })))
    })).find(polygon => contains(polygon, { x: 777, z: 468 }))!;
    assert(component);
    const h28 = publicAccess.connections.find(c => c.id === 'whity-exit-h-28')!;
    const h30 = publicAccess.connections.find(c => c.id === 'whity-exit-h-30')!;
    const h41Lower = publicAccess.connections.find(c => c.id === 'whity-exit-h-41-lower')!;
    const h41Upper = publicAccess.connections.find(c => c.id === 'whity-exit-h-41')!;
    const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
    for (const [connection, x, z] of [
        [h28, 792.54, 455.88],
        [h30, 810.60, 478.20],
        [h41Upper, 770.44, 571.61]
    ] as const) {
        assert(Math.hypot(connection.to.x - x, connection.to.z - z) < .02);
        assert(openings.some(o => o.connectionId === connection.id && o.level === 'district-ground'));
    }
    for (const point of [h28.from, h30.from, h41Lower.from, { x: 779.5, z: 567.6 }]) {
        assert(contains(component, point));
    }
    assert.equal(h41Lower.to, h41Upper.from);
    const turningFloor = undergroundPublicAreas.find(a => a.id === 'whity-h-41-turn-apron')!;
    assert.equal(turningFloor.elevationOffset, h41Lower.to.elevationOffset);
    assert(contains(turningFloor, h41Lower.to));
    assert(layout.canopies.some(c => c.id === 'whity-h-41-canopy'));
    for (const stair of [h28, h41Upper]) {
        assert(!layout.exteriorOpenings.some(o => contains(o, stair.to)));
    }
    const building = geographicBuildings.find(b => b.id === 'hep-five')!;
    const original = buildGeographicBuilding(building);
    const withDoor = buildGeographicBuilding(building, layout.exteriorOpenings);
    original.updateMatrixWorld(true);
    withDoor.updateMatrixWorld(true);
    const entrance = new T.Raycaster(new T.Vector3(811.45, 2, 480), new T.Vector3(-.45, 0, -1).normalize(), 0, 4);
    const slab = new T.Raycaster(new T.Vector3(810, 4.4, 476), new T.Vector3(0, -1, 0), 0, 4.7);
    const adjacent = new T.Raycaster(new T.Vector3(816, 2, 480), new T.Vector3(0, 0, -1), 0, 5);
    for (const ray of [entrance, slab]) {
        assert(ray.intersectObject(original, true).length > 0);
        assert.equal(ray.intersectObject(withDoor, true).length, 0);
    }
    assert(adjacent.intersectObject(withDoor, true).length > 0);
});

test('North Mall 2 street stairs join the Whity floor and open their respective host facades', () => {
    const component = union.map(polygon => ({
        outline: polygon[0]!.map(([x, z]) => ({ x, z })),
        holes: polygon.slice(1).map(ring => ring.map(([x, z]) => ({ x, z })))
    })).find(polygon => contains(polygon, { x: 803, z: 614.4 }))!;
    assert(component);
    assert(contains(component, { x: 818, z: 594 }));
    const canopy = layout.canopies.find(c => c.id === 'whity-os-plaza-canopy')!;
    assert.equal(canopy.clearHeight, 4.5);
    for (const [number, host, x, z, dx, dz] of [
        ['2', 'os-building', 853.31, 565.90, -.8, -.6],
        ['3', 'hep-navio', 809.37, 576.40, .6, .8],
        ['4', 'os-building', 823.12, 596.55, -.71, -.71]
    ] as const) {
        const connection = publicAccess.connections.find(c => c.id === 'whity-exit-j-' + number)!;
        assert(Math.hypot(connection.to.x - x, connection.to.z - z) < .02);
        assert(contains(component, connection.from));
        assert.deepEqual(layout.exteriorOpenings.filter(o => contains(o, connection.to)).map(o => o.buildingId), [host]);
        assert.equal(canopy.postClearances?.some(clearance => clearance.point === connection.to), host === 'os-building');

        const building = geographicBuildings.find(b => b.id === host)!;
        const original = buildGeographicBuilding(building);
        const withDoors = buildGeographicBuilding(building, layout.exteriorOpenings);
        original.updateMatrixWorld(true);
        withDoors.updateMatrixWorld(true);
        const opening = new T.Raycaster(new T.Vector3(x + dx * 3, 2, z + dz * 3), new T.Vector3(-dx, 0, -dz).normalize(), 0, 4.5);
        const slab = new T.Raycaster(new T.Vector3(x - dx, -1, z - dz), new T.Vector3(0, 1, 0), 0, 4);
        for (const ray of [opening, slab]) {
            assert(ray.intersectObject(original, true).length > 0);
            assert.equal(ray.intersectObject(withDoors, true).length, 0);
        }
        const adjacent = new T.Raycaster(new T.Vector3(x - dz * 5 + dx * 3, 2, z + dx * 5 + dz * 3), new T.Vector3(-dx, 0, -dz).normalize(), 0, 7);
        assert(adjacent.intersectObject(withDoors, true).length > 0);
    }
});

test('Whity central exits connect to B1 and keep independent street cuts beneath their canopies', () => {
    const component = union.map(polygon => ({
        outline: polygon[0]!.map(([x, z]) => ({ x, z })),
        holes: polygon.slice(1).map(ring => ring.map(([x, z]) => ({ x, z })))
    })).find(polygon => contains(polygon, { x: 781.5, z: 627.3 }))!;
    assert(component);
    const lower = publicAccess.connections.find(c => c.id === 'whity-exit-h-49-lower')!;
    const landing = undergroundPublicAreas.find(a => a.id === 'whity-h-49-h-51-turn')!;
    assert(contains(component, lower.from));
    assert(contains(landing, lower.to));
    assert.equal(landing.elevationOffset, lower.to.elevationOffset);

    const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
    for (const [number, x, z, roof] of [
        [49, 761.89, 618.68, 'whity-h-49-h-51-canopy'],
        [51, 759.82, 635.77, 'whity-h-49-h-51-canopy'],
        [58, 794.32, 686.88, 'whity-exit-h-58-canopy'],
        [60, 776.28, 713.79, 'whity-exit-h-60-canopy']
    ] as const) {
        const id = 'whity-exit-h-' + number;
        const flight = publicAccess.connections.find(c => c.id === id)!;
        assert(Math.hypot(flight.to.x - x, flight.to.z - z) < .02);
        if (number === 49 || number === 51) {
            assert.equal(flight.from, lower.to);
        }
        else {
            assert(contains(component, flight.from));
        }
        assert(layout.canopies.find(c => c.id === roof)?.postClearances?.some(c => c.point === flight.to));
        const cut = openings.find(o => o.connectionId === id && o.level === 'district-ground')!;
        assert(cut);
        assert(!geographicBuildings.some(b => b.volumes.some(v =>
            v.base === 0 && clipping.intersection(geometry(v), geometry(cut)).length > 0)));
    }
});

test('Puchishan street anchors join the same Hankyu basement floor and clear the correct ground geometry', () => {
    const h1 = publicAccess.connections.find(c => c.id === 'whity-exit-h-1')!;
    const h16 = publicAccess.connections.find(c => c.id === 'whity-exit-h-16')!;
    const component = union.map(polygon => ({
        outline: polygon[0]!.map(([x, z]) => ({ x, z })),
        holes: polygon.slice(1).map(ring => ring.map(([x, z]) => ({ x, z })))
    })).find(polygon => contains(polygon, { x: 743.1, z: 291.1 }))!;
    assert(component);
    const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
    for (const [stair, x, z] of [[h1, 722.91, 286.70], [h16, 785.71, 397.30]] as const) {
        assert(Math.hypot(stair.to.x - x, stair.to.z - z) < .02);
        assert(contains(component, stair.from));
        assert(undergroundPublicAreas.some(a => a.blockId === 'hankyu-basements' && contains(a, stair.from)));
        assert(openings.some(o => o.connectionId === stair.id && o.level === 'district-ground'));
    }
    assert(layout.canopies.some(c => c.id === h16.id + '-canopy' && c.points.includes(h16.to)));
    assert(!layout.exteriorOpenings.some(o => o.evidence === h16.evidence));
    const exterior = layout.exteriorOpenings.find(o => o.evidence === h1.evidence)!;
    assert.equal(exterior.buildingId, 'hankyu-sanbangai');
    const building = geographicBuildings.find(b => b.id === exterior.buildingId)!;
    const original = buildGeographicBuilding(building, layout.exteriorOpenings.filter(o => o !== exterior));
    const opened = buildGeographicBuilding(building, layout.exteriorOpenings);
    original.updateMatrixWorld(true);
    opened.updateMatrixWorld(true);
    const portal = new T.Raycaster(new T.Vector3(726, 2, 286.95), new T.Vector3(-1, 0, 0), 0, 8);
    const adjacent = new T.Raycaster(new T.Vector3(726, 2, 280.5), new T.Vector3(-1, 0, 0), 0, 8);
    assert(portal.intersectObject(original, true).length > 0);
    assert.equal(portal.intersectObject(opened, true).length, 0);
    assert(adjacent.intersectObject(opened, true).length > 0);
});

test('H-40 and 3-31 keep their B1 approaches on the public floor', () => {
    for (const [id, block, inner, outer] of [
        ['whity-h-40-b1-approach', 'whity-b1', { x: 782.1, z: 553.24 }, { x: 786.8, z: 553.64 }],
        ['whity-3-31-b1-approach', 'hankyu-basements', { x: 762.2, z: 399.8 }, { x: 753.9, z: 401.95 }]
    ] as const) {
        const approach = publicAccess.areas.find(a => a.id === id)!;
        assert.equal(approach.level, 'district-underground');
        assert.equal(approach.blockId, block);
        assert(approach.evidence.pages.includes(54));
        assert(contains(approach, outer));
        assert(flat.some(floor => floor.blockId === block && contains(floor, inner) && contains(floor, outer)));
        assert(!layout.connections.some(stair => stair.evidence === approach.evidence));
        assert(!layout.exteriorOpenings.some(opening => opening.evidence === approach.evidence));
    }
});

test('Whity hotel connections mark opposite B1 approaches on the East Mall corridor', () => {
    const hall = flat.find(a => a.blockId === 'whity-b1' && contains(a, { x: 914, z: 666.8 }))!;
    assert(hall);
    for (const [number, x, z, node] of [
        ['7-72', 910.31, 655.93, '5024365349'],
        ['7-75', 924.50, 674.23, '5024365348']
    ] as const) {
        const id = 'whity-building-access-' + number;
        const facility = facilities.find(f => f.id === id)!;
        assert.equal(facility.kind, 'entrance');
        assert.equal(facility.level, 'district-underground');
        assert(Math.hypot(facility.x - x, facility.z - z) < .02);
        assert(contains(hall, facility));
        assert(facility.evidence.urls?.includes('https://www.openstreetmap.org/node/' + node));
        assert(!nodes.some(n => n.id === id));
        assert(!layout.connections.some(c => c.evidence === facility.evidence));
        assert(!layout.exteriorOpenings.some(o => o.evidence === facility.evidence));
    }
});

test('Izumi plaza keeps shared stair landings, a vertical passenger lift and a B1 Water Tree', () => {
    const tree = layout.landmarks.find(item => item.id === 'whity-izumi-water-tree')!;
    assert.equal(tree.level, 'district-underground');
    assert(flat.some(floor => contains(floor, tree)));
    const model = buildWaterTree(tree);
    assert(model.getObjectByName('water-tree-trunk'));
    assert(model.getObjectByName('water-tree-mirrored-leaves') instanceof T.InstancedMesh);
    const size = new T.Box3().setFromObject(model).getSize(new T.Vector3());
    assert(size.x > 6 && size.x < 8 && size.y > 3 && size.y < 4.5);

    const lift = publicAccess.connections.find(c => c.id === 'whity-izumi-public-lift')!;
    assert.equal(lift.kind, 'elevator');
    assert.deepEqual([lift.from.x, lift.from.z], [lift.to.x, lift.to.z]);
    const stops = [lift.from, lift.to];
    assert(Math.hypot(lift.from.x - tree.x, lift.from.z - tree.z) > 8);
    const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
    for (const number of [9, 10, 13, 14]) {
        const id = 'whity-exit-m-' + number;
        const lower = publicAccess.connections.find(c => c.id === id)!;
        const middle = undergroundPublicAreas.find(a => a.id === id + '-middle-landing')!;
        assert.equal(lower.to.elevationOffset, middle.elevationOffset);
        assert(contains(middle, lower.to));
        assert(flat.some(floor => contains(floor, lower.from)));
        assert(Math.hypot(lower.from.x - tree.x, lower.from.z - tree.z) > 8);
        stops.push(lower.from, lower.to);
        for (const suffix of ['-1', '-2']) {
            const branch = publicAccess.connections.find(c => c.id === id + suffix)!;
            assert.equal(branch.from.elevationOffset, middle.elevationOffset);
            assert(contains(middle, branch.from));
            assert(openings.some(o => o.connectionId === branch.id && o.level === 'district-ground'));
            assert(!layout.exteriorOpenings.some(o => contains(o, branch.to)));
            stops.push(branch.from, branch.to);
        }
    }
    assert(!edges.some(edge => stops.some(stop => edge.from === stop.id || edge.to === stop.id)));
});

test('Izumi east stair mouths match their individual roofs and street approaches', () => {
    for (const [number, x, z, sidewalk, roof] of [
        ['10-1', 1025.26, 643.34, { x: 1029.38, z: 642.53 }, '618516673'],
        ['10-2', 1010.61, 628.88, { x: 1011.04, z: 626.92 }, '618516672'],
        ['14-1', 1014.28, 682.42, { x: 1014.58, z: 687.19 }, '618713381'],
        ['14-2', 1024.80, 665.68, { x: 1031.05, z: 665.3 }, '618713382']
    ] as const) {
        const id = 'whity-exit-m-' + number;
        const stair = publicAccess.connections.find(c => c.id === id)!;
        assert(Math.hypot(stair.to.x - x, stair.to.z - z) < .02);
        const canopy = layout.canopies.find(c => c.id === id.replace(/-(1|2)$/, '-canopy-$1'))!;
        assert(canopy.evidence.urls?.includes('https://www.openstreetmap.org/way/' + roof));
        assert.deepEqual(canopy.points.at(-1), { x: stair.to.x, z: stair.to.z });
        const apron = layout.areas.find(a => a.id === id + '-street-apron')!;
        const approach = { x: (stair.to.x + sidewalk.x) / 2, z: (stair.to.z + sidewalk.z) / 2 };
        assert(contains(apron, approach));
    }
});
