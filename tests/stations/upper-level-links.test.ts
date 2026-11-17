import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { areas, connections, levels, platforms } from '../../src/infrastructure/stations/jr-osaka/layout.ts';
import { pointInPolygon } from '../../src/domain/map/geometry.ts';
import { planFloorOpenings } from '../../src/application/connections/connection-openings.ts';
import { displayElevation } from '../../src/application/exploration/display-elevation.ts';
import { VerticalConnectionModel } from '../../src/presentation/models/stations/vertical-connection-model.ts';
test(
    'Sakurabashi 51 stops at the mezzanine and all separate source flights are present',
    () => {
        const stair = connections.find(c => c.id === 'sakura-stairs-51')!;
        assert.equal(stair.from.level, 'concourse');
        assert.equal(stair.to.level, 'mezzanine');
        assert(pointInPolygon(stair.to, areas.find(a => a.id === 'sakurabashi-mezz')!.outline));
        assert(!connections.some(c => c.id.startsWith('mezz-p')), 'no generic duplicated platform flights');
        for (let id = 17; id <= 31; id++) {
            const c = connections.find(c => c.id === `mezz-${[18, 19, 30, 31].includes(id) ? 'escalator' : 'stairs'}-${id}`)!;
            assert(c, `source ${id}`);
            assert.equal(c.from.level, 'mezzanine');
            assert.equal(c.to.level, 'platform');
            assert(c.platformId);
            assert(Math.hypot(c.to.x - c.from.x, c.to.z - c.from.z) <= 7);
        }
    }
);
test(
    'mezzanine access treads do not intersect other access banks across layer expansion',
    () => {
        const selected = connections.filter(c => c.id.startsWith('mezz-') || c.id.startsWith('central-') || c.id === 'sakura-stairs-51');
        const models = selected.map(c => new VerticalConnectionModel(c, levels, platforms));
        for (const explode of [0, 0.48, 1]) {
            const banks = models.map(model => {
                model.update(id => displayElevation(levels, id, explode), 'all');
                const treads = model.group.getObjectByName('tread-surfaces') as T.InstancedMesh;
                const boxes: T.Box3[] = [];
                treads.geometry.computeBoundingBox();
                for (let i = 0; i < treads.count; i++) {
                    const matrix = new T.Matrix4();
                    treads.getMatrixAt(i, matrix);
                    matrix.premultiply(treads.matrixWorld);
                    boxes.push(treads.geometry.boundingBox!.clone().applyMatrix4(matrix));
                }
                return { id: model.connection.id, boxes };
            });
            for (let i = 0; i < banks.length; i++) {
                for (let j = i + 1; j < banks.length; j++) {
                    for (const a of banks[i]!.boxes) {
                        for (const b of banks[j]!.boxes) {
                            const overlap = a.clone().intersect(b).getSize(new T.Vector3());
                            assert(
                                !(overlap.x > 0.01 && overlap.y > 0.01 && overlap.z > 0.01),
                                `${banks[i]!.id} crosses ${banks[j]!.id} at ${explode}`
                            );
                        }
                    }
                }
            }
        }
    }
);
test(
    'North atrium 2/3 use exterior edges without interior slab wells',
    () => {
        const cuts = planFloorOpenings(connections, levels, platforms);
        for (const id of ['north-2', 'north-2-stairs', 'north-3']) {
            const c = connections.find(c => c.id === id)!;
            assert.equal(c.placement, 'exterior');
            assert(!cuts.some(o => o.connectionId === id));
            assert.equal(c.from.level, 'platform');
            assert.equal(c.to.level, 'bridge');
            assert(
                pointInPolygon(c.to, areas.find(a => a.id === 'bridge-north')!.outline),
                'upper landing meets slab edge'
            );
            for (let i = 0; i < 10; i++) {
                const point = { x: c.from.x + (c.to.x - c.from.x) * i / 10, z: c.from.z + (c.to.z - c.from.z) * i / 10 };
                assert(
                    !areas.some(a => a.level === 'bridge' && pointInPolygon(point, a.outline)),
                    'inclined section stays outside the upper slab'
                );
            }
        }
    }
);
test(
    'South building floor names and bridge connections match the cross-page references',
    () => {
        assert.equal(areas.find(a => a.id === 'south-building-2f')!.level, 'mezzanine');
        assert.equal(areas.find(a => a.id === 'south-building-3f')!.level, 'platform');
        assert.equal(areas.find(a => a.id === 'south-building-4f')!.level, 'bridge');
        for (const id of ['south-15', 'south-stairs-16', 'south-lift-i']) {
            const c = connections.find(c => c.id === id)!;
            assert.equal(c.from.level, 'platform');
            assert.equal(c.to.level, 'bridge');
            assert(!c.platformId, 'building access is not a railway platform connection');
        }
        const link = areas.find(a => a.id === 'south-bridge-4f-link')!;
        assert.equal(link.level, 'bridge');
        for (const point of [{ x: 3, z: 44 }, { x: 20, z: 56 }]) {
            assert(pointInPolygon(point, link.outline));
        }
    }
);
