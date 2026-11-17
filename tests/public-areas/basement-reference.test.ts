import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import clipping from 'polygon-clipping';
import projected from '../../data/geography/underground/basement-outlines.json' with { type: 'json' };
import source from '../../data/geography/underground/basement-source.json' with { type: 'json' };
import publicSource from '../../data/geography/underground/pdf-outline.json' with { type: 'json' };
import { basementBoundaryGaps } from '../../scripts/geography/basement-contact-audit.ts';
import { sourceProjection } from '../../scripts/geography/reference-projection.ts';
import type { FloorArea, PlanRegion } from '../../src/domain/map/model.ts';
import { footprint } from '../../src/infrastructure/buildings/building-data.ts';
import { basements, undergroundPublicAreas } from '../../src/infrastructure/district/geographic-map.ts';
import { referenceBasements } from '../../src/infrastructure/public-areas/south-diamor/basement-outlines.ts';
import { areaColor } from '../../src/presentation/appearance/area-palette.ts';

const geometry = (region: PlanRegion): clipping.Polygon => [region.outline, ...region.holes ?? []].map(ring => ring.map(p => [p.x, p.z]));
const area = (g: clipping.MultiPolygon) => g.reduce(
    (sum, polygon) => sum + polygon.reduce(
        (sum, ring, i) => sum + (i ? -1 : 1) * Math.abs(ring.reduce(
            (sum, a, j) => {
                const b = ring[(j + 1) % ring.length]!;
                return sum + a[0] * b[1] - a[1] * b[0];
            },
            0
        )) / 2,
        0
    ),
    0
);
test(
    'B1 block fills retain the exact source version and share the excavation projection',
    () => {
        assert.equal(source.sha256, createHash('sha256').update(readFileSync(source.source)).digest('hex'));
        assert.equal(source.sha256, publicSource.sha256);
        assert.equal(projected.sha256, source.sha256);
        const { projectRing } = sourceProjection();
        for (const building of source.buildings) {
            const result = projected.buildings.find(b => b.id === building.id)!;
            const expected = projectRing(building.rings[0]!.map(([x, z]) => [x!, z!]));
            assert.deepEqual(result.regions[0]!.outline, expected.map(([x, z]) => ({ x, z })));
            assert.equal(result.drawingIndex, building.drawingIndex);
        }
        assert(
            source.buildings.find(b => b.id === 'osaka-maru')!.rings[0]!.length > 80,
            'curved MARU stroke was reduced to a box'
        );
    }
);
test(
    'reference B1 occupancies correct the local blocks without rewriting ground hosts or covering public faces',
    () => {
        for (const [id, way] of [['e-ma', '162158020'], ['hilton-west', '162158150']] as const) {
            const reference = referenceBasements.find(b => b.id === id)!;
            assert(area(clipping.xor(geometry(reference.region), geometry(footprint(way)))) > 10);
            assert.equal(basements.contacts.find(c => c.buildingId === id)!.status, 'geometric-contact');
        }
        const maru = basements.areas.filter(a => a.blockId === 'building:osaka-maru');
        assert(maru.length && maru.some(a => a.label && a.labelStyle === 'floor'));
        const dt = basements.areas.find(a => a.blockId === 'building:umeda-dt')!;
        assert.notEqual(
            areaColor(maru[0]!, true),
            areaColor(dt, true),
            'neighbouring MARU and DT should remain distinguishable'
        );
        for (const fill of maru) {
            for (const corridor of undergroundPublicAreas) {
                assert(area(clipping.intersection(geometry(fill), geometry(corridor))) < 1e-5);
            }
            assert.equal(fill.level, 'district-underground');
            assert(fill.evidence.detail.includes('not a verified'));
        }
        assert.equal(basements.contacts.find(c => c.buildingId === 'jp-tower')!.status, 'geometric-contact');
    }
);
test(
    'contact diagnostics measure the actual hole boundary and never create a link across the gap',
    () => {
        const box = (x: number, z: number, width: number) => [
            { x, z }, { x: x + width, z }, { x: x + width, z: z + width }, { x, z: z + width },
        ];
        const evidence = { pages: [], detail: 'fixture' };
        const host = {
            id: 'inside-island',
            name: 'island',
            region: { outline: box(8, 8, 4) },
            evidence
        };
        const publicArea: FloorArea = {
            id: 'ring',
            name: 'ring',
            level: 'district-underground',
            kind: 'public',
            outline: box(0, 0, 20),
            holes: [box(6, 6, 8)],
            evidence,
        };
        const before = JSON.stringify({ host, publicArea });
        const [gap] = basementBoundaryGaps([host], [publicArea]);
        assert(gap?.kind === 'boundary-gap');
        assert.equal(gap.gapMetres, 2, 'must measure to the occupied hole, not to the outer public perimeter');
        assert.equal(
            JSON.stringify({ host, publicArea }),
            before,
            'an audit must not connect or move the source geometry'
        );
    }
);
