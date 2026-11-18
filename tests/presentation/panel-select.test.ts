import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchingOptions } from '../../src/presentation/components/panel-select.ts';

test('facility search matches visible localized names and ignores internal facility codes', () => {
    const choices = [
        { label: '中央口改札機', code: 'JR-010' },
        { label: '中央口改札内エスカレーター · 5/6番線', code: 'JR-018' },
        { label: 'M16 · West gate', code: 'M16-002' },
    ];
    assert.deepEqual(matchingOptions(choices, '中央口 ５／６'), [choices[1]]);
    assert.deepEqual(matchingOptions(choices, 'WEST ｍ１６'), [choices[2]]);
    assert.deepEqual(matchingOptions(choices, 'JR-010'), []);
    assert.deepEqual(matchingOptions(choices, ' '), choices);
});
