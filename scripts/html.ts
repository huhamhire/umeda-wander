import { isMessageKey, messageText } from '../src/infrastructure/i18n/index.ts';

/** Resolve static template keys at build time and escape text for HTML and quoted attributes. */
export function renderHtmlMessages(template: string): string {
    return template.replace(
        /\{\{([a-zA-Z][a-zA-Z0-9.]*)\}\}/g,
        (_token, key: string) => {
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
