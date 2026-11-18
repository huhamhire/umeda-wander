import assert from 'node:assert/strict';
import { test } from 'node:test';
import clipping from 'polygon-clipping';
import { visibleElevatorConnections } from '../../src/application/connections/elevator-visibility.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import { facilities, jpAccess, layout, levels, undergroundPublicAreas } from '../../src/infrastructure/district/geographic-map.ts';

test(
    'JP public lift segments share a vertical shaft without inventing the Garden Avenue join',
    () => {
        const lower = layout.connections.find(c => c.id === 'jp-garden-lift-0')!;
        const upper = layout.connections.find(c => c.id === 'public-jp-deck-lift')!;
        assert.deepEqual({ x: lower.to.x, z: lower.to.z }, { x: upper.from.x, z: upper.from.z });
        assert.equal(lower.to.level, upper.from.level);
        const visible = visibleElevatorConnections(layout.connections, levels, 'district-underground');
        assert.ok(visible.has(lower.id) && visible.has(upper.id), 'B1 exploration must keep the complete B1–2F shaft');
        assert.equal(lower.blockId, 'hanshin-west-b1');
        assert.ok(jpAccess.connections.every(c => c.evidence.pages.includes(2) && c.evidence.urls?.[0]?.includes('1027_01_01.pdf')));
        const polygons: clipping.Polygon[] = undergroundPublicAreas.map(a => [a.outline, ...a.holes ?? []].map(r => r.map(p => [p.x, p.z] as [
            number,
            number
        ])));
        const union = clipping.union(polygons[0]!, ...polygons.slice(1));
        const mainGate = facilities.find(f => f.id === 'hanshin-umeda-west-gate')!;
        const contains = (polygon: clipping.Polygon, p: {
            x: number;
            z: number;
        }) => pointInPolygon(p, polygon[0]!.map(([x, z]) => ({ x, z }))) &&
            !polygon.slice(1).some(r => pointInPolygon(p, r.map(([x, z]) => ({ x, z }))));
        const garden = union.find(p => contains(p, lower.from))!;
        assert.ok(garden, 'source-confirmed lower landing must be supported');
        assert.ok(!contains(garden, mainGate), 'do not silently infer the unresolved Garden Avenue attachment');
    }
);
