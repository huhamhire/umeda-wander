import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { describeStationSite, stationPublicPortal } from '../../src/application/station-site.ts';
import { planUndergroundSpace } from '../../src/application/underground-space.ts';
import { closestPolygonPoint, pointInPolygon } from '../../src/domain/map/geometry.ts';
import type { PlanRegion, Point2 } from '../../src/domain/map/model.ts';
import { createGeographicStations } from '../../src/infrastructure/district/geographic-stations.ts';
import { buildFloorGeometry } from '../../src/presentation/floor-geometry.ts';

const contains = (r: PlanRegion, p: Point2) => pointInPolygon(p, r.outline) && !r.holes?.some(h => pointInPolygon(p, h));
const stationMaps = createGeographicStations();
const stationSites = stationMaps.map(describeStationSite);
test(
    'underground floors union tapered sections and chambers while preserving occupied holes',
    () => {
        const result = planUndergroundSpace({
            id: 'sample',
            name: 'sample',
            level: 'kitashinchi-hall',
            evidence: { source: 'district', pages: [1], detail: 'test' },
            sections: [{ points: [{ x: 0, z: 0 }, { x: 10, z: 0 }], widths: [2, 8] }],
            chambers: [{ outline: [{ x: 8, z: -5 }, { x: 18, z: -5 }, { x: 18, z: 5 }, { x: 8, z: 5 }] }],
            exclusions: [{ outline: [{ x: 12, z: -1 }, { x: 14, z: -1 }, { x: 14, z: 1 }, { x: 12, z: 1 }] }]
        });
        assert.equal(result.length, 1);
        const floor = result[0]!;
        assert(contains(floor, { x: 1, z: 0 }));
        assert(!contains(floor, { x: 1, z: 2 }));
        assert(contains(floor, { x: 9, z: 3 }));
        assert.equal(floor.holes!.length, 1);
        assert(!contains(floor, { x: 13, z: 0 }));
        const mesh = new T.Mesh(buildFloorGeometry(floor.outline, floor.holes!, 0.55), new T.MeshBasicMaterial());
        mesh.updateMatrixWorld();
        const hits = (p: Point2) => new T.Raycaster(new T.Vector3(p.x, 5, p.z), new T.Vector3(0, -1, 0)).intersectObject(mesh);
        assert.equal(hits({ x: 13, z: 0 }).length, 0);
        assert(hits({ x: 16, z: 0 }).length > 0);
        mesh.geometry.dispose();
        mesh.material.dispose();
    }
);
test(
    'each station exposes independent per-floor occupied envelopes and exterior public portals',
    () => {
        assert.equal(stationSites.length, stationMaps.length);
        for (const station of stationMaps) {
            const before = JSON.stringify(station);
            const site = describeStationSite(station);
            assert.equal(site.station, station.id);
            assert.deepEqual(site.layers.map(l => l.level), station.levels.map(l => l.id));
            assert.equal(JSON.stringify(station), before);
        }
        const hs = stationMaps.find(s => s.id === 'hanshin-umeda')!;
        const region = hs.layout.areas.find(a => a.id === 'hanshin-umeda-department-public')!;
        const start = {
            ...region.outline.reduce(
                (p, q) => ({ x: p.x + q.x / region.outline.length, z: p.z + q.z / region.outline.length }),
                { x: 0, z: 0 }
            ),
            level: region.level
        };
        const portal = stationPublicPortal(hs, start, { x: start.x, z: start.z + 100 });
        const edge = closestPolygonPoint(portal, region.outline);
        assert(Math.hypot(portal.x - edge.x, portal.z - edge.z) < 0.001);
        assert(contains(region, portal));
    }
);
