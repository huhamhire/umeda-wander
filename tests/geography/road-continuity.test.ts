import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MultiPolygon } from 'polygon-clipping';
import { retainRoadSpans } from '../../scripts/geography/road-continuity.ts';

const box = (x0: number, z0: number, x1: number, z1: number): MultiPolygon => [[[
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
    [x0, z0]
]]];
test(
    'crop keeps a winding road continuous between retained ends rather than drawing disconnected fragments',
    () => {
        const points = [
            { x: 0, z: 0 },
            { x: 10, z: 0 },
            { x: 10, z: 10 },
            { x: 0, z: 10 },
            { x: 0, z: 20 }
        ];
        const result = retainRoadSpans([{ id: 'winding', points, width: 1 }], [...box(-2, -2, 2, 2), ...box(-2, 18, 2, 22)]);
        assert.equal(result.retained.length, 1);
        assert.deepEqual(result.retained[0]!.points, points, 'retained middle must follow source bends');
        assert.equal(result.retained[0]!.geometry.length, 1, 'one source road became separate paved islands');
    }
);
test(
    'named OSM pieces retain their joining segment while unrelated branches and outer tails stay cropped',
    () => {
        const road = (id: string, x0: number, x1: number) => ({
            id,
            name: 'same road',
            points: [{ x: x0, z: 0 }, { x: x1, z: 0 }],
            width: 1
        });
        const result = retainRoadSpans(
            [
                road('a', 0, 10),
                road('b', 10, 20),
                road('c', 20, 30),
                {
                    id: 'spur',
                    name: 'same road',
                    points: [{ x: 10, z: 0 }, { x: 10, z: 20 }],
                    width: 1
                },
                {
                    id: 'unrelated',
                    name: 'different road',
                    points: [{ x: 10, z: 0 }, { x: 20, z: 0 }],
                    width: 1
                },
            ],
            [...box(-1, -1, 2, 1), ...box(28, -1, 31, 1)]
        );
        assert.deepEqual(result.retained.map(r => r.id).sort(), ['a', 'b', 'c']);
        const a = result.retained.find(r => r.id === 'a')!;
        const b = result.retained.find(r => r.id === 'b')!;
        const c = result.retained.find(r => r.id === 'c')!;
        assert.deepEqual(a.points.at(-1), b.points[0]);
        assert.deepEqual(b.points.at(-1), c.points[0]);
        const clipped = retainRoadSpans([road('outer', -100, 100)], box(-5, -2, 5, 2)).retained[0]!;
        assert.ok(
            clipped.points[0]!.x >= -5.001 && clipped.points.at(-1)!.x <= 5.001,
            'an outer-only tail was restored unnecessarily'
        );
    }
);
