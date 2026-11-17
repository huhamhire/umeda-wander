import { formatMessage } from '../../application/i18n/format-message.ts';
import type { Locale, MessageParameters } from '../../domain/i18n/message.ts';
import { chineseMessages } from './zh-CN/index.ts';

export type MessageKey = keyof typeof chineseMessages;
export const sourceLocale: Locale = 'zh-CN';
export const availableLocales: readonly Locale[] = ['zh-CN'];

/** Check a runtime identifier before resolving a template or application-level label. */
export function isMessageKey(value: string): value is MessageKey {
    return Object.hasOwn(chineseMessages, value);
}

/** Resolve a typed domain key from the maintained Chinese source catalog. */
export function messageText(key: MessageKey, parameters: MessageParameters = {}): string {
    const template = chineseMessages[key];
    if (typeof template !== 'string') {
        throw new Error(`Unknown message key: ${key}`);
    }
    return formatMessage(template, parameters);
}

/** Resolve semantic labels emitted by pure application services without introducing a locale dependency into them. */
export function resolveMessage(value: string): string {
    return isMessageKey(value) ? messageText(value) : value;
}
