import { availableLocales, isMessageKey, messageText, sourceLocale } from '../src/infrastructure/i18n/index.ts';
import type { Locale } from '../src/domain/i18n/message.ts';

/** Set the catalog language and escape translated text for HTML and quoted attributes. */
export function renderHtmlMessages(template: string, locale: Locale = sourceLocale): string {
    return template.replace(
        /\{\{([a-zA-Z][a-zA-Z0-9.]*)\}\}/g,
        (_token, key: string) => {
            if (key === 'locale') {
                return locale;
            }
            if (!isMessageKey(key)) {
                throw new Error(`Unknown HTML message key: ${key}`);
            }
            return messageText(key, {}, locale)
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

/** Build one entry with a Chinese fallback and inert page fragments for the other locales. */
export function renderLocalizedPage(template: string, credits: Record<Locale, string>): string {
    const content = /    <!-- LOCALIZED CONTENT START -->\r?\n([\s\S]*?)    <!-- LOCALIZED CONTENT END -->/.exec(template);
    if (!content?.[1]) {
        throw new Error('Missing localized content markers');
    }
    const pages: string[] = [];
    for (const locale of availableLocales) {
        const localized = renderHtmlMessages(content[1], locale);
        const body = localized.replace(/^([ \t]*)<!-- SOURCE CREDITS -->\r?$/m, (_marker, indent: string) => {
            return credits[locale].trimEnd().split(/\r?\n/).map(line => line ? indent + line : '').join('\n');
        });
        if (locale === sourceLocale) {
            pages.push(body.trimEnd());
            continue;
        }
        const nested = body.trimEnd().replace(/^(?=.)/gm, '  ');
        pages.push(`    <template data-page-locale="${locale}">\n${nested}\n    </template>`);
    }
    return renderHtmlMessages(template.slice(0, content.index) + template.slice(content.index + content[0].length))
        .replace('    <!-- APP -->', () => `${pages.join('\n')}\n    <!-- APP -->`);
}
