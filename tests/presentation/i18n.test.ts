import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { formatMessage } from '../../src/application/i18n/format-message.ts';
import { showAreaLabel } from '../../src/application/exploration/area-label-policy.ts';
import { facilities, layout, levels } from '../../src/infrastructure/district/geographic-map.ts';
import { availableLocales, messageText, preferredLocale, sourceLocale } from '../../src/infrastructure/i18n/index.ts';
import { chineseMessages } from '../../src/infrastructure/i18n/zh-CN/index.ts';
import { englishMessages } from '../../src/infrastructure/i18n/en/index.ts';
import { japaneseMessages } from '../../src/infrastructure/i18n/ja/index.ts';
import { osakaStationSign } from '../../src/infrastructure/buildings/daimaru/signage.ts';
import { renderHtmlMessages, renderLocalizedPage } from '../../scripts/html.ts';

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
        assert.deepEqual(availableLocales, ['zh-CN', 'ja', 'en']);
    }
);

test('locale preferences follow the saved choice, browser order, and Chinese fallback', () => {
    assert.equal(preferredLocale('en', ['ja-JP', 'zh-TW']), 'en');
    assert.equal(preferredLocale(undefined, ['fr-FR', 'ja-JP', 'en-US']), 'ja');
    assert.equal(preferredLocale('unsupported', ['en-GB', 'ja']), 'en');
    assert.equal(preferredLocale(undefined, ['zh-Hant-TW', 'en-US']), 'zh-CN');
    assert.equal(preferredLocale(undefined, ['fr-FR']), 'zh-CN');
});

test('localized catalogs cover the same keys and named parameters', () => {
    const keys = Object.keys(chineseMessages) as (keyof typeof chineseMessages)[];
    for (const catalog of [englishMessages, japaneseMessages]) {
        assert.deepEqual(Object.keys(catalog).sort(), [...keys].sort());
        for (const key of keys) {
            assert(catalog[key].trim(), key);
            assert.deepEqual(
                catalog[key].match(/\{\w+\}/g)?.sort(),
                chineseMessages[key].match(/\{\w+\}/g)?.sort(),
                key
            );
        }
    }
    assert.equal(messageText('facilities.labels.trackNumber', { number: 21 }, 'ja'), '21 番のりば');
    assert.equal(messageText('facilities.labels.trackNumber', { number: 21 }, 'en'), 'Track 21');
});

test('station labels use localized station names in place of station-number prefixes', () => {
    const stationNumber = /\b(?:T20|M16|Y11)\b/;
    for (const messages of [chineseMessages, japaneseMessages, englishMessages]) {
        for (const [key, value] of Object.entries(messages)) {
            if (/^(stations\.(higashiUmeda|metroUmeda|nishiUmeda)\.|facilities\.locations\.|publicAreas\.metroInterchange\.)/.test(key)) {
                assert.doesNotMatch(value, stationNumber, key);
            }
        }
    }
    assert.equal(messageText('stations.higashiUmeda.labels.passageShop', {}, 'ja'), '東梅田・通路沿い店舗');
    for (const feature of [...layout.areas, ...facilities]) {
        if (/^(t20|m16|y11|metro)-/.test(feature.level) && feature.name) {
            assert.doesNotMatch(feature.name, stationNumber, feature.id);
        }
    }
});

test('level captions and facility filters keep their meaning in each locale', () => {
    const keys = [
        'ui.floors.overview',
        'ui.floors.second.description',
        'ui.floors.third.description',
        'ui.facilities.floorFilter',
        'ui.facilities.heading',
        'ui.facilities.placeholder',
        'ui.facilities.select',
        'ui.facilities.stationFilter',
        'ui.facilities.types'
    ] as const;
    const expected = {
        'zh-CN': [
            '总览', '站台 / 站厅 / 站外连廊', 'JR 联络桥 / 阪急站台',
            '筛选楼层', '站内设施', '选择设施…', '选择设施', '筛选车站', '设施类型'
        ],
        ja: [
            '全体', 'ホーム／コンコース／連絡デッキ', 'JR連絡橋／阪急ホーム',
            '階で絞り込む', '駅の施設', '施設を選択…', '施設を選択', '駅で絞り込む', '施設の種類'
        ],
        en: [
            'All', 'Platforms / concourses / decks', 'JR link bridge / Hankyu platforms',
            'Filter by level', 'Station facilities', 'Choose a facility…', 'Choose a facility', 'Filter by station', 'Facility types'
        ]
    };
    for (const locale of availableLocales) {
        assert.deepEqual(keys.map(key => messageText(key, {}, locale)), expected[locale], locale);
    }
});

test(
    'named parameters preserve zero and literal markup without recursively interpreting values',
    () => {
        assert.equal(formatMessage('{number} / {name}', { number: 0, name: '<b>{other}</b>' }), '0 / <b>{other}</b>');
        assert.throws(() => formatMessage('{missing}'), /Missing message parameter/);
        assert.equal(messageText('facilities.labels.trackNumber', { number: 21 }), '21 番线');
    }
);

test('the single entry includes a translated shell and standalone credits for each locale', () => {
    const template = readFileSync('src/index.html', 'utf8');
    const credits = {
        'zh-CN': readFileSync('src/content/source-credits.zh-CN.html', 'utf8'),
        ja: readFileSync('src/content/source-credits.ja.html', 'utf8'),
        en: readFileSync('src/content/source-credits.en.html', 'utf8')
    };
    const navigation = {
        'zh-CN': JSON.stringify({ name: '梅田' }),
        ja: JSON.stringify({ name: '大阪梅田' }),
        en: JSON.stringify({ name: 'Umeda </script>' })
    };
    const html = renderLocalizedPage(template, credits, navigation);
    assert(!html.includes('<!-- SOURCE CREDITS -->'));
    assert(!html.includes('{{'));
    for (const locale of ['ja', 'en'] as const) {
        const body = html.split(`<template data-page-locale="${locale}">`)[1]?.split('</template>')[0];
        assert(body?.includes(messageText('ui.heading.title', {}, locale)));
        assert(body?.includes(messageText('ui.preferences.language', {}, locale)));
        assert(body?.includes(messageText('ui.map.loading.stations', {}, locale)));
        const embedded = body?.match(/<script id="navigation-data" type="application\/json">(.+?)<\/script>/)?.[1];
        assert.deepEqual(JSON.parse(embedded!), JSON.parse(navigation[locale]));
        assert(body?.includes(credits[locale].split('\n')[1]!.trim()));
        assert.deepEqual(
            [...credits[locale].matchAll(/href="[^"]+"/g)].map(match => match[0]),
            [...credits['zh-CN'].matchAll(/href="[^"]+"/g)].map(match => match[0])
        );
    }
});

test(
    'the built HTML resolves text and accessible labels without leaking message IDs',
    () => {
        const template = readFileSync('src/index.html', 'utf8');
        assert(template.includes('<html lang="{{locale}}">'));
        const html = renderHtmlMessages(template);
        assert(!html.includes('{{'));
        assert(html.includes(`<html lang="${sourceLocale}">`));
        assert(html.includes('<title>车站漫游 · UMEDA</title>'));
        assert.equal(messageText('ui.page.title', {}, 'ja'), '駅巡り · UMEDA');
        assert.equal(messageText('ui.page.title', {}, 'en'), 'Station Explorer · UMEDA');
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
