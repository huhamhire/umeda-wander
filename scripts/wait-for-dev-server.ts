import { setTimeout as delay } from 'node:timers/promises';

/** Wait for the compiled page before VS Code launches the browser session. */
async function waitForDevServer(url: URL): Promise<void> {
    const deadline = performance.now() + 30_000;
    while (performance.now() < deadline) {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                redirect: 'manual',
                signal: AbortSignal.timeout(1_000)
            });
            if (response.ok) {
                return;
            }
        }
        catch {
            // The listener usually becomes available after the initial build finishes.
        }
        await delay(250);
    }
    throw new Error(`Development preview did not become ready at ${url.href} within 30 seconds.`);
}

await waitForDevServer(new URL(process.argv[2] ?? 'http://127.0.0.1:5173'));
