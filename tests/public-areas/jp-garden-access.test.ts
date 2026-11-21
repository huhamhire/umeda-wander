import assert from 'node:assert/strict';
import { test } from 'node:test';
import { visibleElevatorConnections } from '../../src/application/connections/elevator-visibility.ts';
import { findRoute } from '../../src/domain/navigation/find-route.ts';
import { jpAccess, layout, levels, undergroundPublicAreas } from '../../src/infrastructure/district/geographic-map.ts';
import { createWalkingNetwork } from '../../src/infrastructure/district/walking-network.ts';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import clipping from 'polygon-clipping';

test(
    'JP garden reaches the Garden Avenue public network and shares one lift stop at street level',
    () => {
        const lower = layout.connections.find(c => c.id === 'jp-garden-lift-0')!;
        const upper = layout.connections.find(c => c.id === 'public-jp-deck-lift')!;
        assert.equal(lower.to, upper.from);
        const visible = visibleElevatorConnections(layout.connections, levels, 'district-underground');
        assert.ok(visible.has(lower.id) && visible.has(upper.id), 'B1 exploration must keep the complete B1–2F shaft');
        assert.equal(lower.blockId, 'hanshin-west-b1');
        assert.ok(jpAccess.connections.every(c => c.evidence.pages.includes(2) && c.evidence.urls?.[0]?.includes('1027_01_01.pdf')));
        const stairs = layout.connections.find(c => c.id === 'jp-garden-b1-ground-stairs')!;
        const deckStairs = layout.connections.find(c => c.id === 'public-jp-deck-stairs')!;
        const network = createWalkingNetwork();
        const elevations = new Map(levels.map(l => [l.id, l.y]));
        const heights = new Map(network.nodes.map(n => [n.id, elevations.get(n.level)! + (n.elevationOffset ?? 0)]));
        const basementWalks = network.edges.filter(e => e.kind === 'walk' && heights.get(e.from) === -8 && heights.get(e.to) === -8);
        const streetWalks = network.edges.filter(e => e.kind === 'walk' && heights.get(e.from) === 0 && heights.get(e.to) === 0);
        const sidewalk = network.nodes.find(n => n.id.startsWith('walk:street:') && Math.hypot(n.x - 358.16, n.z - 802.74) < .02)!;
        for (const landing of [stairs.from, lower.from]) {
            assert(findRoute(basementWalks, landing.id, 'nishi-umeda-north-route-out', false), landing.id);
        }
        for (const landing of [stairs.to, lower.to, deckStairs.from]) {
            assert(findRoute(streetWalks, landing.id, sidewalk.id, false), landing.id);
        }
        assert.deepEqual(findRoute(network.edges.filter(e => e.kind === 'elevator'), lower.from.id, upper.to.id, false), [
            lower.from.id, upper.from.id, upper.to.id
        ]);
        const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
        assert(openings.some(o => o.connectionId === stairs.id && o.level === 'district-ground'));
        assert(openings.some(o => o.connectionId === upper.id && o.level === upper.to.level));
    }
);

test('Both Nishi-Umeda street stairs outside Daimaru join the same public B1 passage', () => {
    const network = createWalkingNetwork();
    const basementLevels = new Set(levels.filter(l => l.y === -8).map(l => l.id));
    const basementNodes = new Set(network.nodes.filter(n => basementLevels.has(n.level) && !n.elevationOffset).map(n => n.id));
    const basementWalks = network.edges.filter(e => e.kind === 'walk' && basementNodes.has(e.from) && basementNodes.has(e.to));
    for (const number of [1, 5]) {
        const stairs = layout.connections.find(c => c.id === 'nishi-umeda-exit-' + number + '-stairs')!;
        assert(findRoute(basementWalks, stairs.from.id, 'nishi-umeda-north-route-out', false), stairs.id);
        assert(network.edges.some(e => e.kind === 'stairs' && e.from === stairs.from.id && e.to === stairs.to.id), stairs.id);
    }
});

test('Garden Avenue exits reach the street and the B1 public corridor from both landings', () => {
    const network = createWalkingNetwork();
    const elevations = new Map(levels.map(l => [l.id, l.y]));
    const heights = new Map(network.nodes.map(n => [n.id, elevations.get(n.level)! + (n.elevationOffset ?? 0)]));
    const basementWalks = network.edges.filter(e => e.kind === 'walk' && heights.get(e.from) === -8 && heights.get(e.to) === -8);
    const groundWalks = network.edges.filter(e => e.kind === 'walk' && heights.get(e.from) === 0 && heights.get(e.to) === 0);
    const openings = planFloorOpenings(layout.connections, levels, layout.platforms).filter(o => o.level === 'district-ground');
    for (const [id, x, z] of [
        ['garden-avenue-exit-6-71', 356, 856.52],
        ['garden-avenue-lift-6-71', 332.43, 875.78],
        ['garden-avenue-exit-6-77', 370.66, 859.15],
        ['garden-avenue-exit-6-58', 279.167, 873.283],
        ['garden-avenue-exit-6-1', -73.466, 1165.832],
        ['garden-avenue-exit-6-1-escalator', -73.466, 1165.832],
        ['garden-avenue-lift-6-1', -73.466, 1165.832],
        ['garden-avenue-exit-6-13', 24.132, 1142.41],
        ['garden-avenue-exit-6-19', 58.385, 1101.367],
        ['garden-avenue-exit-6-20', 44.786, 1082.576],
        ['garden-avenue-exit-6-36', 141.322, 1002.036],
        ['garden-avenue-exit-6-40', 162.507, 979.828],
        ['garden-avenue-exit-6-46', 215.575, 947.545],
        ['garden-avenue-exit-6-48', 198.17, 950.239]
    ] as const) {
        const connection = layout.connections.find(c => c.id === id)!;
        const lower = layout.connections.find(c => c.id === id + '-lower');
        const foot = lower?.from ?? connection.from;
        const street = network.nodes.find(n => n.id.startsWith('walk:street:') && Math.hypot(n.x - x, n.z - z) < .02)!;
        assert(street, id);
        assert(findRoute(groundWalks, connection.to.id, street.id, false), id);
        assert(findRoute(basementWalks, foot.id, 'nishi-umeda-north-route-out', false), id);
        assert(network.edges.some(e => e.kind === connection.kind && e.from === connection.from.id && e.to === connection.to.id), id);
        const opening = openings.find(o => o.connectionId === id);
        assert(opening, id);
        const polygon = opening.outline.map(({ x, z }): clipping.Pair => [x, z]);
        for (const other of openings.filter(o => o !== opening)) {
            const neighbor = other.outline.map(({ x, z }): clipping.Pair => [x, z]);
            assert.equal(clipping.intersection([polygon], [neighbor]).length, 0, id + ' / ' + other.connectionId);
        }
        if (lower) {
            assert.equal(lower.to, connection.from);
            assert(heights.get(lower.to.id)! > -8 && heights.get(lower.to.id)! < 0);
            const stairs = network.edges.filter(e => e.kind === 'stairs');
            assert.deepEqual(findRoute(stairs, connection.to.id, foot.id, false), [connection.to.id, lower.to.id, foot.id]);
        }
    }
    const escalator = layout.connections.find(c => c.id === 'garden-avenue-exit-6-1-escalator')!;
    const link = network.edges.find(e => e.from === escalator.from.id && e.to === escalator.to.id);
    assert(link?.directed);
    assert(!network.edges.some(e => e.from === escalator.to.id && e.to === escalator.from.id));
    assert(layout.canopies?.some(c => c.id === 'garden-avenue-exit-6-1-canopy'));
    assert(undergroundPublicAreas.some(area => pointInPolygon({ x: 24.96, z: 1112.73 }, area.outline)),
        'The calibrated B1 main corridor contains the mapped 6-13 branch junction');
});
