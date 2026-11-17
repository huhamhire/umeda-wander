import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { displayElevation } from '../../src/application/exploration/display-elevation.ts';
import { offsetRailSample, sampleRailSegment } from '../../src/domain/map/rail-geometry.ts';
import { layout, levels } from '../../src/infrastructure/district/geographic-map.ts';
import { cameraEnvelope } from '../../src/presentation/camera/camera-framing.ts';
import { buildRailApproachModel } from '../../src/presentation/models/stations/rail-approach-model.ts';

const approaches = layout.railApproaches;
test(
    'paired rails meet exactly at merge nodes with matching endpoint tangents',
    () => {
        assert(approaches.some(a => a.nodes.some(n => n.kind === 'junction')));
        for (const a of approaches) {
            for (const node of a.nodes.filter(n => n.kind === 'outlet' || n.kind === 'junction')) {
                const ins = a.segments.filter(s => s.to === node.id);
                const outs = a.segments.filter(s => s.from === node.id);
                for (const input of ins) {
                    for (const output of outs) {
                        for (const side of [-0.7, 0.7]) {
                            const p = offsetRailSample(sampleRailSegment(a, input).at(-1)!, side);
                            const q = offsetRailSample(sampleRailSegment(a, output)[0]!, side);
                            assert(Math.hypot(p.x - q.x, p.z - q.z) < 1e-6, `${input.id} to ${output.id}`);
                        }
                    }
                }
            }
        }
    }
);
test(
    'rail models remain finite and station focus frames their external ends',
    () => {
        for (const a of approaches) {
            const model = buildRailApproachModel(a);
            assert(model.getObjectByName('ballast'));
            assert(model.getObjectByName('paired-rails'));
            model.traverse(o => {
                if (!(o instanceof T.Mesh)) {
                    return;
                }
                assert([...o.geometry.getAttribute('position').array].every(Number.isFinite));
                if (o instanceof T.InstancedMesh) {
                    assert([...o.instanceMatrix.array].every(Number.isFinite));
                }
            });
            const envelope = cameraEnvelope(
                layout,
                levels,
                { level: 'all', focusStation: a.station },
                id => displayElevation(levels, id, 0.48)
            );
            const bounds = new T.Box3().setFromPoints(envelope);
            for (const n of a.nodes.filter(n => n.kind === 'end')) {
                assert(bounds.containsPoint(new T.Vector3(n.point.x, displayElevation(levels, a.level, 0.48) + 1, n.point.z)));
            }
        }
    }
);
