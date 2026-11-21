import assert from 'node:assert/strict';
import { test } from 'node:test';
import { visibleElevatorConnections } from '../../src/application/connections/elevator-visibility.ts';
import { findRoute } from '../../src/domain/navigation/find-route.ts';
import { jpAccess, layout, levels, undergroundPublicAreas } from '../../src/infrastructure/district/geographic-map.ts';
import { createWalkingNetwork } from '../../src/infrastructure/district/walking-network.ts';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import clipping from 'polygon-clipping';

const concourse = 'nishi-umeda-north-route-out';
let accessFixture: ReturnType<typeof buildAccessFixture> | undefined;

/** Index the read-only geographic graph by physical height for local public-access checks. */
function buildAccessFixture() {
    const network = createWalkingNetwork();
    const elevations = new Map(levels.map(level => [level.id, level.y]));
    const heights = new Map(network.nodes.map(node => [node.id, elevations.get(node.level)! + (node.elevationOffset ?? 0)]));
    const walksAt = (height: number) =>
        network.edges.filter(edge => edge.kind === 'walk' && heights.get(edge.from) === height && heights.get(edge.to) === height);
    /** Find the exact sidewalk anchor from the OSM street graph within the fitting tolerance. */
    const streetAt = (x: number, z: number) => {
        const node = network.nodes.find(n => n.id.startsWith('walk:street:') && Math.hypot(n.x - x, n.z - z) < .02);
        assert(node, `No street node at ${x}, ${z}`);
        return node.id;
    };
    return { network, heights, basementWalks: walksAt(-8), groundWalks: walksAt(0), streetAt };
}

/** Share the graph and the elevation indexes across the access cases in this file. */
function publicAccessFixture() {
    return accessFixture ??= buildAccessFixture();
}

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
        const { network, basementWalks, groundWalks, streetAt } = publicAccessFixture();
        const sidewalk = streetAt(358.16, 802.74);
        for (const landing of [stairs.from, lower.from]) {
            assert(findRoute(basementWalks, landing.id, concourse, false), landing.id);
        }
        for (const landing of [stairs.to, lower.to, deckStairs.from]) {
            assert(findRoute(groundWalks, landing.id, sidewalk, false), landing.id);
        }
        assert.deepEqual(findRoute(network.edges.filter(e => e.kind === 'elevator'), lower.from.id, upper.to.id, false), [
            lower.from.id, upper.from.id, upper.to.id
        ]);
        const openings = planFloorOpenings(layout.connections, levels, layout.platforms);
        assert(openings.some(o => o.connectionId === stairs.id && o.level === 'district-ground'));
        assert(openings.some(o => o.connectionId === upper.id && o.level === upper.to.level));
    }
);

test('Garden Avenue exits and the Daimaru street stairs reach the public B1 corridor', () => {
    const { network, heights, basementWalks, groundWalks, streetAt } = publicAccessFixture();
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
        ['garden-avenue-exit-6-48', 198.17, 950.239],
        ['garden-avenue-exit-6-25', 76.907, 1090.747],
        ['garden-avenue-lift-6-25', 76.907, 1090.747],
        ['nishi-umeda-exit-1-stairs'],
        ['nishi-umeda-exit-5-stairs']
    ] as const) {
        const connection = layout.connections.find(c => c.id === id)!;
        const lower = layout.connections.find(c => c.id === id + '-lower');
        const foot = lower?.from ?? connection.from;
        assert(findRoute(basementWalks, foot.id, concourse, false), id);
        assert(network.edges.some(e => e.kind === connection.kind && e.from === connection.from.id && e.to === connection.to.id), id);
        if (x === undefined || z === undefined) {
            assert.equal(connection.kind, 'stairs', id);
            continue;
        }
        assert.equal(heights.get(foot.id), -8, id);
        assert.equal(heights.get(connection.to.id), 0, id);
        assert(findRoute(groundWalks, connection.to.id, streetAt(x, z), false), id);
        const opening = openings.find(o => o.connectionId === id);
        assert(opening, id);
        const polygon = opening.outline.map(({ x, z }): clipping.Pair => [x, z]);
        for (const other of openings.filter(o => o !== opening)) {
            const neighbor = other.outline.map(({ x, z }): clipping.Pair => [x, z]);
            assert.equal(clipping.intersection([polygon], [neighbor]).length, 0, id + ' / ' + other.connectionId);
        }
    }
    const stairs = network.edges.filter(e => e.kind === 'stairs');
    for (const id of ['garden-avenue-exit-6-13', 'garden-avenue-exit-6-48']) {
        const lower = layout.connections.find(c => c.id === id + '-lower')!;
        const upper = layout.connections.find(c => c.id === id)!;
        assert.equal(lower.to, upper.from, id);
        assert(heights.get(lower.to.id)! > -8 && heights.get(lower.to.id)! < 0, id);
        assert.deepEqual(findRoute(stairs, upper.to.id, lower.from.id, false), [upper.to.id, lower.to.id, lower.from.id], id);
    }
    const escalator = layout.connections.find(c => c.id === 'garden-avenue-exit-6-1-escalator')!;
    const link = network.edges.find(e => e.from === escalator.from.id && e.to === escalator.to.id);
    assert(link?.directed);
    assert(!network.edges.some(e => e.from === escalator.to.id && e.to === escalator.from.id));
    assert(layout.canopies?.some(c => c.id === 'garden-avenue-exit-6-1-canopy'));
    assert(undergroundPublicAreas.some(area => pointInPolygon({ x: 24.96, z: 1112.73 }, area.outline)),
        'The calibrated B1 main corridor contains the mapped 6-13 branch junction');
});

test('Garden Avenue building doors and the HERBIS ENT plaza join the documented public approaches', () => {
    const { network, basementWalks, groundWalks, streetAt } = publicAccessFixture();
    const approaches = new Map(network.approaches);
    for (const id of [
        'garden-avenue-building-6-10', 'garden-avenue-building-6-25', 'garden-avenue-building-6-31',
        'garden-avenue-building-6-47', 'garden-avenue-building-6-47-breeze', 'garden-avenue-building-6-57',
        'herbis-ent-sunken-entrance'
    ]) {
        const [door] = approaches.get(id) ?? [];
        assert.equal(door?.distance, 0, id);
        assert(findRoute(basementWalks, door!.id, concourse, false), id);
    }

    assert(findRoute(groundWalks, streetAt(385.504, 855.149), streetAt(407.962, 862.485), false));
});
