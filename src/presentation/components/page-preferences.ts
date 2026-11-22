import { activeLocale, isLocale, languageCookie, messageText, sourceLocale } from '../../infrastructure/i18n/index.ts';
import { readPreference, writePreference } from '../../infrastructure/preferences/cookies.ts';
import { element } from '../../utils/dom.ts';

const themeCookie = 'umeda-theme';

/** Mount the localized page and dialog before attaching map controls or measuring the viewport. */
export function mountLocalizedPage(): void {
    const pages = document.querySelectorAll<HTMLTemplateElement>('template[data-page-locale]');
    const localized = [...pages].find(page => page.dataset.pageLocale === activeLocale);
    if (activeLocale !== sourceLocale && localized) {
        element('main.atlas').replaceWith(localized.content.querySelector('main.atlas')!);
        element('#credits-dialog').replaceWith(localized.content.querySelector('#credits-dialog')!);
    }
    for (const page of pages) {
        page.remove();
    }
    document.documentElement.lang = activeLocale;
    document.title = messageText('ui.page.title');
}

/** Bind language and appearance controls and prefer the shared theme over the saved theme. */
export function bindPagePreferences(saveView: (keyboardFocus: boolean) => void, setMapTheme: (dark: boolean) => void): void {
    const language = element<HTMLSelectElement>('#language');
    const darkTheme = element<HTMLButtonElement>('#dark-theme');
    language.value = activeLocale;

    /** Set the page theme and the mobile browser chrome color together. */
    function applyTheme(dark: boolean): void {
        const root = document.documentElement;
        root.dataset.theme = dark ? 'dark' : 'light';
        darkTheme.setAttribute('aria-pressed', String(dark));
        const pageColor = getComputedStyle(root).getPropertyValue('--color-page').trim();
        element('meta[name="theme-color"]').setAttribute('content', pageColor);
        setMapTheme(dark);
    }

    const requestedTheme = new URLSearchParams(location.search).get('theme');
    const initialTheme = requestedTheme === 'dark' || requestedTheme === 'light'
        ? requestedTheme
        : readPreference(themeCookie);
    applyTheme(initialTheme === 'dark');
    darkTheme.addEventListener('click', () => {
        const dark = darkTheme.getAttribute('aria-pressed') !== 'true';
        const theme = dark ? 'dark' : 'light';
        writePreference(themeCookie, theme);
        applyTheme(dark);
        const url = new URL(location.href);
        url.searchParams.set('theme', theme);
        try {
            history.replaceState(history.state, '', url);
        }
        catch {
            // Restricted documents can still apply the theme locally.
        }
    });
    language.addEventListener('change', () => {
        const locale = language.value;
        if (!isLocale(locale) || locale === activeLocale) {
            return;
        }
        saveView(language.matches(':focus-visible'));
        writePreference(languageCookie, locale);
        const url = new URL(location.href);
        // File previews and browsers blocking cookies can keep the locale on this URL.
        if (readPreference(languageCookie) !== locale) {
            url.searchParams.set('lang', locale);
        }
        else {
            url.searchParams.delete('lang');
        }
        if (url.href === location.href) {
            location.reload();
        }
        else {
            location.replace(url);
        }
    });
}
