import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import type { Facility, Level } from '../../src/domain/map/model.ts';
import { SceneLabels, type SceneLabelDefinition, type SceneLabelView } from '../../src/presentation/labels/scene-labels.ts';

class LabelStub {
    className = '';
    textContent = '';
    hidden = false;
    style = { left: '', top: '' };
    removed = false;
    offsetWidth = 80;
    offsetHeight = 24;
    classList = {
        contains: (value: string) => this.className.split(' ').includes(value),
        toggle: (value: string, force: boolean) => {
            const names = new Set(this.className.split(' '));
            if (force) {
                names.add(value);
            } else {
                names.delete(value);
            }
            this.className = [...names].join(' ');
        }
    };

    remove(): void {
        this.removed = true;
    }

    append(_icon: unknown, text: string): void {
        this.textContent += text;
    }
}

const levels: Level[] = [
    { id: 'concourse', label: '1F', name: 'hall', y: 0, description: '', station: 'jr-osaka', stackIndex: 0 },
    { id: 'platform', label: '2F', name: 'platform', y: 8, description: '', station: 'jr-osaka', stackIndex: 2 }
];

function withLabels(definitions: SceneLabelDefinition[], run: (labels: SceneLabels, elements: LabelStub[]) => void): void {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const elements: LabelStub[] = [];
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: {
            createElement: () => new LabelStub(),
            createElementNS: () => ({ setAttribute() {} })
        }
    });
    const host = { append: (element: LabelStub) => elements.push(element) } as unknown as HTMLElement;
    const labels = new SceneLabels(host, definitions);
    try {
        run(labels, elements);
    } finally {
        labels.dispose();
        if (previous) {
            Object.defineProperty(globalThis, 'document', previous);
        } else {
            Reflect.deleteProperty(globalThis, 'document');
        }
    }
}

function render(labels: SceneLabels, selection?: SceneLabelView['selection']): void {
    const camera = new T.OrthographicCamera(-100, 100, 100, -100, 0.1, 1000);
    camera.position.set(0, 100, 100);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const roof = new T.Group();
    roof.visible = false;
    labels.update({
        camera,
        roof,
        levels,
        levelY: () => 0,
        state: { level: 'platform', explode: 0, roof: false, route: null },
        rect: { left: 0, top: 0 } as DOMRect,
        width: 1000,
        height: 800,
        zoom: 2,
        occluders: [],
        selection
    });
}

test('current-floor labels win collisions, context labels mute, hidden roofs do not leak labels', () => {
    const anchor = new T.Vector3();
    withLabels([
        { text: 'context', position: anchor, level: 'concourse', emphasis: true },
        { text: 'current', position: anchor, level: 'platform', emphasis: true },
        { text: 'roof', position: anchor, roof: true, emphasis: true },
        { text: 'outside', position: new T.Vector3(5000, 0, 0), level: 'platform' }
    ], (labels, elements) => {
        render(labels);
        assert(elements[0]!.hidden);
        assert(elements[0]!.classList.contains('context'));
        assert(!elements[1]!.hidden);
        assert(elements[2]!.hidden);
        assert(elements[3]!.hidden);
        assert(Math.abs(Number.parseFloat(elements[1]!.style.left) - 500) < 1e-9);
        assert(Math.abs(Number.parseFloat(elements[1]!.style.top) - 400) < 1e-9);
    });
});

test('detail labels are lazy, take priority on selection and reuse a single DOM node', () => {
    const position = new T.Vector3();
    withLabels([{ text: 'platform', position, level: 'platform', emphasis: true }], (labels, elements) => {
        render(labels);
        assert.equal(elements.length, 1);
        assert(!elements[0]!.hidden);
        render(labels, { text: 'escalator', position });
        assert.equal(elements.length, 2);
        assert(elements[0]!.hidden);
        const detail = elements[1]!;
        assert.equal(detail.textContent, 'escalator');
        assert(!detail.hidden);
        render(labels, { text: 'elevator', position });
        assert.equal(elements.length, 2);
        assert.equal(detail.textContent, 'elevator');
        render(labels);
        assert(detail.hidden);
        assert(!elements[0]!.hidden);
        labels.dispose();
        assert(detail.removed);
    });
});

test('disposing label management removes only its owned DOM nodes and is safe to repeat', () => {
    withLabels([{ text: 'owned', position: new T.Vector3(), level: 'platform' }], (labels, elements) => {
        labels.dispose();
        labels.dispose();
        assert(elements.every(element => element.removed));
        assert.equal(elements[0]!.textContent, 'owned');
    });
});

test('facility filtering replaces general labels and selection temporarily replaces the filter labels', () => {
    const position = new T.Vector3();
    const filtered: Facility[] = [
        { id: 'locker', name: 'Lockers', kind: 'locker', level: 'platform', x: 35, z: 0, note: '', evidence: { pages: [], detail: '' } },
        { id: 'desk', name: 'Information', kind: 'information', level: 'concourse', x: -35, z: 0, note: '', evidence: { pages: [], detail: '' } }
    ];
    withLabels([{ text: 'platform', position, level: 'platform' }], (labels, elements) => {
        labels.setFacilityFilter(filtered);
        render(labels);
        assert.deepEqual(elements.filter(e => !e.hidden).map(e => e.textContent), ['Lockers']);
        render(labels, { text: 'Selected gate', position });
        assert.deepEqual(elements.filter(e => !e.hidden).map(e => e.textContent), ['Selected gate']);
        render(labels);
        assert.deepEqual(elements.filter(e => !e.hidden).map(e => e.textContent), ['Lockers']);
        labels.setFacilityFilter([]);
        render(labels);
        assert(elements.every(e => e.hidden || e.removed));
        labels.setFacilityFilter();
        render(labels);
        assert.deepEqual(elements.filter(e => !e.hidden && !e.removed).map(e => e.textContent), ['platform']);
    });
});
