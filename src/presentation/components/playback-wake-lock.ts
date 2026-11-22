type Playback = 'tour' | 'route' | 'train';

/** Hold one screen wake lock for foreground playback and renew it when the page returns. */
export function bindPlaybackWakeLock(
    doc: Document = document,
    wakeLock: WakeLock | undefined = navigator.wakeLock
): (source: Playback, playing: boolean) => void {
    const active = new Set<Playback>();
    let foreground = true;
    let wanted = false;
    let revision = 0;
    let pending = false;
    let current: WakeLockSentinel | undefined;

    /** Release a held lock without making playback depend on the platform result. */
    function release(lock: WakeLockSentinel | undefined): void {
        if (lock && !lock.released) {
            void lock.release().catch(() => {});
        }
    }

    /** Acquire only once at a time, dropping any lock delivered after playback has stopped. */
    async function acquire(api: WakeLock): Promise<void> {
        pending = true;
        const requestedAt = revision;
        try {
            const lock = await api.request('screen');
            if (wanted) {
                current = lock;
            } else {
                release(lock);
            }
        } catch {
            // Permission and power settings can reject screen wake locks.
        } finally {
            pending = false;
            if (requestedAt !== revision) {
                sync();
            }
        }
    }

    /** Combine animation state, page lifecycle and document visibility. */
    function sync(): void {
        const shouldHold = foreground && doc.visibilityState === 'visible' && active.size > 0;
        if (shouldHold !== wanted) {
            wanted = shouldHold;
            revision += 1;
        }
        if (!wanted) {
            release(current);
            current = undefined;
        } else if (wakeLock && !pending && (!current || current.released)) {
            void acquire(wakeLock);
        }
    }

    doc.addEventListener('visibilitychange', sync);
    doc.defaultView?.addEventListener('pagehide', () => {
        foreground = false;
        sync();
    });
    doc.defaultView?.addEventListener('pageshow', () => {
        foreground = true;
        sync();
    });

    return (source, playing) => {
        if (active.has(source) === playing) {
            return;
        }
        if (playing) {
            active.add(source);
        } else {
            active.delete(source);
        }
        sync();
    };
}
