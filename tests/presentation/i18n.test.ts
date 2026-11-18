import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { formatMessage } from '../../src/application/i18n/format-message.ts';
import { showAreaLabel } from '../../src/application/exploration/area-label-policy.ts';
import { layout, levels } from '../../src/infrastructure/district/geographic-map.ts';
import { availableLocales, messageText, sourceLocale } from '../../src/infrastructure/i18n/index.ts';
import { chineseMessages } from '../../src/infrastructure/i18n/zh-CN/index.ts';
import { osakaStationSign } from '../../src/infrastructure/buildings/daimaru/signage.ts';
import { renderHtmlMessages } from '../../scripts/html.ts';

test(
    'Chinese domain catalogs have unique language-neutral keys and no empty messages',
    () => {
        const root = 'src/infrastructure/i18n/zh-CN';
        const files = readdirSync(root).filter(file => file.endsWith('.json'));
        assert.deepEqual(
            files.sort(),
            [
                'buildings.json',
                'facilities.json',
                'public-areas.json',
                'railways.json',
                'stations.json',
                'ui.json'
            ]
        );
        const known = new Set<string>();
        for (const file of files) {
            const source = ts.parseJsonText(file, readFileSync(`${root}/${file}`, 'utf8'));
            const object = (source.statements[0] as ts.ExpressionStatement).expression as ts.ObjectLiteralExpression;
            for (const property of object.properties as ts.NodeArray<ts.PropertyAssignment>) {
                const key = (property.name as ts.StringLiteral).text;
                assert.match(key, /^[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*)+$/);
                assert(!known.has(key), `Duplicate key: ${key}`);
                known.add(key);
                assert((property.initializer as ts.StringLiteral).text.trim(), `Empty message: ${key}`);
            }
        }
        assert.equal(known.size, Object.keys(chineseMessages).length);
        assert.equal(sourceLocale, 'zh-CN');
        assert.deepEqual(availableLocales, ['zh-CN']);
    }
);

test(
    'named parameters preserve zero and literal markup without recursively interpreting values',
    () => {
        assert.equal(formatMessage('{number} / {name}', { number: 0, name: '<b>{other}</b>' }), '0 / <b>{other}</b>');
        assert.throws(() => formatMessage('{missing}'), /Missing message parameter/);
        assert.equal(messageText('facilities.labels.trackNumber', { number: 21 }), '21 番线');
    }
);

test(
    'the built HTML resolves text and accessible labels without leaking message IDs',
    () => {
        const html = renderHtmlMessages(readFileSync('src/index.html', 'utf8'));
        assert(!html.includes('{{'));
        assert(html.includes('<title>车站漫游 · UMEDA STATION</title>'));
        assert(html.includes('aria-label="放大"'));
        assert(html.includes('数据来源与版权 · © OpenStreetMap contributors'));
        assert.throws(() => renderHtmlMessages('{{ui.unknown.key}}'), /Unknown HTML message key/);
    }
);

test(
    'application message references are resolved at the district boundary and labels ignore translated wording',
    () => {
        assert.equal(levels.find(level => level.id === 'district-underground')!.name, '地下公共空间');
        for (const passage of layout.passages ?? []) {
            assert(!Object.hasOwn(chineseMessages, passage.name), passage.id);
        }
        const connection = layout.areas.find(area => area.id === 'bridge-public')!;
        assert(!showAreaLabel({ ...connection, name: 'A differently translated bridge' }, 16));
        const visible = layout.areas.find(area => area.kind === 'paid' && area.label)!;
        assert(showAreaLabel({ ...visible, name: 'Any translated hall' }, 0));
    }
);

test(
    'physical facade lettering is a building constant rather than a translatable message',
    () => {
        assert.equal(osakaStationSign.japanese, '大阪駅');
        assert(osakaStationSign.facade.includes('OSAKA STATION'));
        assert(!Object.keys(chineseMessages).some(key => key.startsWith('buildings.daimaru.sign.')));
    }
);
