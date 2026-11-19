import { messageText } from '../../infrastructure/i18n/index.ts';

/** Toggle native fullscreen when available and otherwise fill the current page viewport. */
export function bindMapFullscreen(
    atlas: HTMLElement,
    button: HTMLButtonElement,
    onChange: (active: boolean) => void,
    doc: Document = document
): void {
    const root = doc.documentElement;
    let immersive = false;
    let pending = false;

    /** Follow browser-driven exits as well as changes requested by the button. */
    function sync(): void {
        const active = immersive || doc.fullscreenElement === root;
        if (atlas.hasAttribute('data-map-fullscreen') === active) {
            return;
        }
        atlas.toggleAttribute('data-map-fullscreen', active);
        button.setAttribute('aria-pressed', String(active));
        button.title = messageText(active ? 'ui.map.exitFullscreen' : 'ui.map.fullscreen');
        onChange(active);
    }

    doc.addEventListener('fullscreenchange', sync);
    button.addEventListener('click', async () => {
        if (pending) {
            return;
        }
        pending = true;
        const leavingNative = doc.fullscreenElement === root;
        try {
            if (leavingNative) {
                await doc.exitFullscreen();
            }
            else if (immersive) {
                immersive = false;
            }
            else if (doc.fullscreenEnabled && typeof root.requestFullscreen === 'function') {
                await root.requestFullscreen({ navigationUI: 'hide' });
            }
            else {
                immersive = true;
            }
        }
        catch {
            // Fall back to the in-page fullscreen layout if the browser rejects the request.
            if (!leavingNative) {
                immersive = true;
            }
        }
        finally {
            pending = false;
            sync();
        }
    });
    sync();
}
