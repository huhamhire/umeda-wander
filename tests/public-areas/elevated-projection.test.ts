import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
type Feature = {
    id: string;
    tags: Record<string, string>;
    coordinates: [
        number,
        number
    ][];
};
const features = JSON.parse(readFileSync('data/geography/features.json', 'utf8')) as Feature[];
const way = (id: number) => features.find(f => f.id === String(id))!;
test(
    'elevated groups retain distinct identities, walking geometry and source evidence',
    () => {
        const ids = new Set<string>();
        for (const region of ['north', 'south', 'west']) {
            const { links } = JSON.parse(readFileSync(`data/geography/elevated/${region}.json`, 'utf8'));
            for (const link of links) {
                assert.ok(!ids.has(link.id));
                ids.add(link.id);
                assert.ok(existsSync(link.source.split('#')[0]));
                assert.ok(link.geometryEvidence && link.levelEvidence);
                if (!link.ways.length) {
                    if (link.status === 'reference-fit') {
                        assert.ok(existsSync(link.geometryFile));
                        const fit = JSON.parse(readFileSync(link.geometryFile, 'utf8'));
                        assert.ok(fit.sources.length && fit.paths.every((path: {
                            points: unknown[];
                        }) => path.points.length >= 2));
                    }
                    else {
                        assert.equal(link.status, 'provisional');
                    }
                }
                for (const id of link.ways) {
                    const tags = way(id).tags;
                    if (link.id === 'umekita-grove-deck') {
                        assert.equal(tags.highway, 'construction');
                        assert.equal(tags.construction, 'footway');
                        assert.equal(tags.bridge, 'yes');
                    } else {
                        assert.equal(tags.highway, 'footway');
                    }
                    assert.ok(way(id).coordinates.length >= 2);
                }
            }
        }
    }
);
test(
    'Grand Front bridge stays straight and southern bridge arms meet the shared spine',
    () => {
        const pts = way(220190709).coordinates;
        const lon = pts.map(p => p[0]);
        const lat = pts.map(p => p[1]);
        assert.ok(Math.max(...lon) - Math.min(...lon) < (Math.max(...lat) - Math.min(...lat)) * .3);
        const spine = way(496684915).coordinates;
        assert.ok(way(336421843).coordinates.some(p => JSON.stringify(p) === JSON.stringify(spine[0])));
        assert.ok(way(496684911).coordinates.some(p => JSON.stringify(p) === JSON.stringify(spine.at(-1))));
    }
);
