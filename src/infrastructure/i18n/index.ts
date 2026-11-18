import { formatMessage } from '../../application/i18n/format-message.ts';
import type { Locale, MessageParameters } from '../../domain/i18n/message.ts';
import { chineseMessages } from './zh-CN/index.ts';
import { englishMessages } from './en/index.ts';
import { japaneseMessages } from './ja/index.ts';
import { readPreference } from '../preferences/cookies.ts';

export type MessageKey = keyof typeof chineseMessages;
export const sourceLocale = 'zh-CN' satisfies Locale;
const catalogs: Record<Locale, Record<MessageKey, string>> = {
    'zh-CN': chineseMessages,
    en: englishMessages,
    ja: japaneseMessages
};
export const availableLocales = ['zh-CN', 'ja', 'en'] as const satisfies readonly Locale[];
export const languageCookie = 'umeda-language';

/** Accept only the locale IDs that have a catalog. */
export function isLocale(value: string | undefined): value is Locale {
    return value !== undefined && Object.hasOwn(catalogs, value);
}

/** Prefer the saved locale, then match each browser preference by its primary language tag. */
export function preferredLocale(saved: string | undefined, languages: readonly string[]): Locale {
    if (isLocale(saved)) {
        return saved;
    }
    for (const language of languages) {
        const primary = language.toLowerCase().split('-')[0];
        if (primary === 'zh') {
            return sourceLocale;
        }
        if (isLocale(primary)) {
            return primary;
        }
    }
    return sourceLocale;
}

/** Capture a page locale before station data resolves its labels during module evaluation. */
function pageLocale(): Locale {
    if (typeof document === 'undefined') {
        return sourceLocale;
    }
    const urlLocale = new URLSearchParams(location.search).get('lang') ?? undefined;
    if (isLocale(urlLocale)) {
        return urlLocale;
    }
    return preferredLocale(
        readPreference(languageCookie),
        navigator.languages.length ? navigator.languages : [navigator.language]
    );
}

export const activeLocale = pageLocale();

/** Check a runtime identifier before resolving a template or application-level label. */
export function isMessageKey(value: string): value is MessageKey {
    return Object.hasOwn(chineseMessages, value);
}

/** Resolve a typed domain key using the page locale or an explicit build-time locale. */
export function messageText(key: MessageKey, parameters: MessageParameters = {}, locale: Locale = activeLocale): string {
    const template = catalogs[locale][key];
    if (typeof template !== 'string') {
        throw new Error(`Unknown message key: ${key}`);
    }
    return formatMessage(template, parameters);
}

/** Resolve semantic labels emitted by pure application services without introducing a locale dependency into them. */
export function resolveMessage(value: string): string {
    return isMessageKey(value) ? messageText(value) : value;
}
