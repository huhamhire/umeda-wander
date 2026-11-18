/** Read a preference cookie by its exact name. */
export function readPreference(name: string): string | undefined {
    const prefix = `${name}=`;
    try {
        return document.cookie.split(';')
            .map(cookie => cookie.trim())
            .find(cookie => cookie.startsWith(prefix))?.slice(prefix.length);
    }
    catch {
        return undefined;
    }
}

/** Keep the choice on this host for a year, including after closing the browser. */
export function writePreference(name: string, value: string): void {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    try {
        document.cookie = `${name}=${value}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
    }
    catch {
        // Keep preferences usable on previews and in sandboxes that block cookies.
    }
}
