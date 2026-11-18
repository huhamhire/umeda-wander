import { isMessageKey, messageText, sourceLocale } from '../src/infrastructure/i18n/index.ts';

/** Set the catalog language and escape translated text for HTML and quoted attributes. */
export function renderHtmlMessages(template: string): string {
    return template.replace(
        /\{\{([a-zA-Z][a-zA-Z0-9.]*)\}\}/g,
        (_token, key: string) => {
            if (key === 'locale') {
                return sourceLocale;
            }
            if (!isMessageKey(key)) {
                throw new Error(`Unknown HTML message key: ${key}`);
            }
            return messageText(key)
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll(
                    '>',
                    '&gt;'
                )
                .replaceAll(
                    '"',
                    '&quot;'
                )
                .replaceAll(
                    "'",
                    '&#39;'
                );
        }
    );
}
